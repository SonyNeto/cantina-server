const mongoose = require('mongoose');
const Register = require('../models/register');
const SchoolClass = require('../models/schoolClass');
const Student = require('../models/student');
const Responsible = require('../models/responsible');
const Shift = require('../models/shift');
const { appError } = require('../utils/functions');
const { writeAuditLog } = require('../services/auditLogService');

function getPeriodFilter(query) {
  const now = new Date();

  const period = query.p ?? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!/^\d{6}$/.test(period)) {
    throw appError('Periodo invalido');
  }

  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));

  if (month < 1 || month > 12) {
    throw appError('Periodo invalido');
  }

  return {
    created_at: {
      $gte: new Date(year, month - 1, 1),
      $lt: new Date(year, month, 1),
    },
  };
}

const fetchRegister = async (req, res) => {
  const { workspaceId, id } = req.params;

  const register = await Register.findOne({ workspaceId, _id: id });

  res.json({ register });
};

const fetchRegisters = async (req, res) => {
  const { workspaceId } = req.params;

  const registers = await Register.find({ workspaceId });

  res.json({ registers });
};

const fetchRegistersSummary = async (req, res) => {
  const { workspaceId } = req.params;
  const periodFilter = getPeriodFilter(req.query);

  const [summary] = await Register.aggregate([
    {
      $match: {
        workspaceId: new mongoose.Types.ObjectId(workspaceId),
        ...periodFilter,
      },
    },
    {
      $group: {
        _id: null,
        revenue: {
          $sum: '$product.price',
        },
      },
    },
    {
      $project: {
        _id: 0,
        revenue: 1,
      },
    },
  ]);

  res.json({
    revenue: summary?.revenue ?? 0,
  });
};

const fetchResponsiblesRegisters = async (req, res) => {
  const { workspaceId } = req.params;
  const periodFilter = getPeriodFilter(req.query);
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const search = req.query.search;

  const responsiblesFilter = {
    workspaceId,
  };

  if (search) {
    responsiblesFilter['name'] = {
      $regex: search,
      $options: 'i',
    };
  }

  const registers = await Register.find({ workspaceId, ...periodFilter });
  const students = await Student.find({ workspaceId });
  let responsiblesQuery = Responsible.find(responsiblesFilter).sort({ name: 1, _id: 1 });

  let pagination = null;

  if (page && limit) {
    responsiblesQuery = responsiblesQuery.skip((page - 1) * limit).limit(limit);

    const numberOfResponsibles = await Responsible.countDocuments(responsiblesFilter);

    const totalPages = Math.ceil(numberOfResponsibles / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    pagination = {
      page,
      totalPages,
      nextPage,
    };
  }

  const responsibles = await responsiblesQuery;

  const totalsByStudentId = registers.reduce((acc, register) => {
    const studentId = register.studentId.toString();
    acc[studentId] = (acc[studentId] ?? 0) + register.product.price - register.payment;

    return acc;
  }, {});

  const studentTotalsByResponsible = students.map((student) => ({
    responsibleId: student.responsibleId.toString(),
    total: totalsByStudentId[student._id.toString()] ?? 0,
  }));

  const totalsByResponsibleId = studentTotalsByResponsible.reduce((acc, studentTotal) => {
    acc[studentTotal.responsibleId] = (acc[studentTotal.responsibleId] ?? 0) + studentTotal.total;

    return acc;
  }, {});

  const responsiblesTotals = responsibles.map((responsible) => {
    const responsibleId = responsible._id.toString();

    return {
      responsibleId,
      responsibleName: responsible.name,
      total: totalsByResponsibleId[responsibleId] ?? 0,
    };
  });

  res.json({ responsiblesTotals, pagination });
};

const fetchRegistersByStudent = async (req, res) => {
  const { workspaceId, studentId } = req.params;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);

  if (!page || !limit) {
    return res.status(400).json({ message: 'Paginacao invalida' });
  }

  const periodFilter = getPeriodFilter(req.query);
  const student = await Student.findOne({ workspaceId, _id: studentId });

  if (!student) {
    return res.status(404).json({ message: 'Aluno não encontrado' });
  }

  const studentName = student.name;
  const registers = await Register.find({ workspaceId, studentId, ...periodFilter })
    .sort({ created_at: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalRegisters = await Register.find({ workspaceId, studentId, ...periodFilter });

  const numberOfRegisters = await Register.countDocuments({
    workspaceId,
    studentId,
    ...periodFilter,
  });

  const totalPages = Math.ceil(numberOfRegisters / limit);
  const nextPage = page < totalPages ? page + 1 : null;

  const registersByDate = registers.reduce((acc, register) => {
    const date = register.created_at.toISOString().slice(0, 10);

    acc[date] ??= [];
    acc[date].push(register);

    return acc;
  }, {});

  const total = totalRegisters.reduce((acc, register) => {
    const price = register.product.price - register.payment;
    return acc + price;
  }, 0);

  const pagination = {
    page,
    totalPages,
    nextPage,
  };

  res.json({ registersByDate, studentName, total, pagination });
};

const fetchRegistersByResponsible = async (req, res) => {
  const { workspaceId, responsibleId } = req.params;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);

  if (!page || !limit) {
    return res.status(400).json({ message: 'Paginacao invalida' });
  }

  const periodFilter = getPeriodFilter(req.query);
  const responsible = await Responsible.findOne({ workspaceId, _id: responsibleId });

  if (!responsible) {
    return res.status(404).json({ message: 'Responsável não encontrado' });
  }

  const responsibleName = responsible.name;
  const balance = responsible.balance;
  const studentsByResponsible = await Student.find({ workspaceId, responsibleId });
  const studentIds = studentsByResponsible.map((student) => student._id);

  const registers = await Register.find({
    workspaceId,
    ...periodFilter,
    studentId: { $in: studentIds },
  });

  const numberOfStudents = await Student.countDocuments({ workspaceId, _id: { $in: studentIds } });
  const totalPages = Math.ceil(numberOfStudents / limit);
  const nextPage = page < totalPages ? page + 1 : null;

  const totalsByStudentId = registers.reduce((acc, register) => {
    const studentId = register.studentId.toString();
    acc[studentId] = (acc[studentId] ?? 0) + register.product.price - register.payment;

    return acc;
  }, {});

  const students = await Student.find({ workspaceId, _id: { $in: studentIds } })
    .sort({ name: 1, _id: 1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const schoolClasses = await SchoolClass.find({ workspaceId }).sort({
    shiftId: 1,
    order: 1,
    label: 1,
  });
  const schoolClassesById = new Map(
    schoolClasses.map((schoolClass) => [schoolClass._id.toString(), schoolClass]),
  );

  const shiftsIds = schoolClasses.map((schoolClass) => schoolClass.shiftId);

  const shifts = await Shift.find({ workspaceId, _id: { $in: shiftsIds } });

  const shiftsById = new Map(shifts.map((shift) => [shift._id.toString(), shift]));

  const studentsTotals = students.map((student) => {
    const schoolClassId = student.classId.toString();
    const schoolClassLabel = schoolClassesById.get(schoolClassId)?.label || '';
    const schoolClassShift = shiftsById.get(
      (schoolClassesById.get(schoolClassId)?.shiftId || '').toString(),
    );

    return {
      id: student._id.toString(),
      name: student.name,
      schoolClassId,
      schoolClassLabel,
      schoolClassShiftLabel: schoolClassShift.label || '',
      total: totalsByStudentId[student._id.toString()] ?? 0,
    };
  });

  const total = registers.reduce((sum, register) => {
    return sum + register.product.price - register.payment;
  }, 0);

  const responsibleTotals = {
    responsibleId,
    responsibleName,
    balance,
    total,
    studentsTotals,
  };

  const pagination = {
    page,
    totalPages,
    nextPage,
  };

  res.json({ responsibleTotals, pagination });
};

const updateRegisterPayment = async (req, res) => {
  const { workspaceId, id } = req.params;
  const { paid } = req.body;

  if (typeof paid !== 'boolean') {
    return res.status(400).json({ message: 'Status de pagamento invalido' });
  }

  const session = await mongoose.startSession();

  try {
    let register;

    await session.withTransaction(async () => {
      register = await Register.findOne({
        workspaceId,
        _id: id,
      }).session(session);

      if (!register) {
        throw appError('Registro não encontrado', 404);
      }

      const previousPayment = register.payment;
      const payment = paid ? register.product.price : 0;
      register.payment = payment;
      await register.save({ session });

      await writeAuditLog({
        req,
        workspaceId,
        action: 'register.updatePayment',
        targetType: 'register',
        targetId: register._id,
        changes: {
          registerId: register._id,
          studentId: register.studentId,
          product: register.product,
          payment: {
            from: previousPayment,
            to: payment,
          },
        },
        session,
      });
    });

    return res.json({ register });
  } catch (error) {
    const responseStatus = error.status ?? 500;

    res.status(responseStatus).json({
      message: responseStatus < 500 ? error.message : 'Erro ao atualizar registro',
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchRegister,
  fetchResponsiblesRegisters,
  fetchRegisters,
  fetchRegistersSummary,
  fetchRegistersByStudent,
  fetchRegistersByResponsible,
  updateRegisterPayment,
};
