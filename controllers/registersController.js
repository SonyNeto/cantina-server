const mongoose = require('mongoose');
const Payment = require('../models/payment');
const Register = require('../models/register');
const Student = require('../models/student');
const Responsible = require('../models/responsible');
const { appError } = require('../utils/functions');

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

  const [registers, allRegisters, payments, students] = await Promise.all([
    Register.find({ workspaceId, ...periodFilter }),
    Register.find({ workspaceId }),
    Payment.find({ workspaceId }),
    Student.find({ workspaceId }),
  ]);
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

  const consumptionByStudentId = registers.reduce((acc, register) => {
    const studentId = register.studentId.toString();
    acc[studentId] = (acc[studentId] ?? 0) + register.product.price;

    return acc;
  }, {});

  const totalConsumptionByStudentId = allRegisters.reduce((acc, register) => {
    const studentId = register.studentId.toString();
    acc[studentId] = (acc[studentId] ?? 0) + register.product.price;

    return acc;
  }, {});

  const studentValuesByResponsible = students.map((student) => ({
    responsibleId: student.responsibleId.toString(),
    consumption: consumptionByStudentId[student._id.toString()] ?? 0,
    totalConsumption: totalConsumptionByStudentId[student._id.toString()] ?? 0,
  }));

  const valuesByResponsibleId = studentValuesByResponsible.reduce((acc, studentValues) => {
    acc[studentValues.responsibleId] ??= { consumption: 0, totalConsumption: 0 };
    acc[studentValues.responsibleId].consumption += studentValues.consumption;
    acc[studentValues.responsibleId].totalConsumption += studentValues.totalConsumption;

    return acc;
  }, {});

  const paymentsByResponsibleId = payments.reduce((acc, payment) => {
    const responsibleId = payment.responsibleId.toString();
    acc[responsibleId] = (acc[responsibleId] ?? 0) + payment.payment;

    return acc;
  }, {});

  const responsiblesTotals = responsibles
    .map((responsible) => {
      const responsibleId = responsible._id.toString();

      const consumption = valuesByResponsibleId[responsibleId]?.consumption ?? 0;

      const total =
        (paymentsByResponsibleId[responsibleId] ?? 0) -
        (valuesByResponsibleId[responsibleId]?.totalConsumption ?? 0);

      return {
        responsibleId,
        responsibleName: responsible.name,
        consumption,
        total,
      };
    })
    .sort((a, b) => {
      const aIsDebtor = a.total < 0;
      const bIsDebtor = b.total < 0;

      if (aIsDebtor && !bIsDebtor) return -1;
      if (!aIsDebtor && bIsDebtor) return 1;
      if (aIsDebtor && bIsDebtor) {
        return a.total - b.total;
      }

      return a.responsibleName.localeCompare(b.responsibleName);
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

  const total = totalRegisters.reduce((acc, register) => acc + register.product.price, 0);

  const pagination = {
    page,
    totalPages,
    nextPage,
  };

  res.json({ registersByDate, studentName, total, pagination });
};

const fetchRegistersByResponsible = async (req, res) => {
  const { workspaceId, responsibleId } = req.params;
  const periodFilter = getPeriodFilter(req.query);
  const responsible = await Responsible.findOne({ workspaceId, _id: responsibleId });

  if (!responsible) {
    return res.status(404).json({ message: 'Responsável não encontrado' });
  }

  const students = await Student.find({ workspaceId, responsibleId });
  const studentIds = students.map((student) => student._id);
  const studentsById = new Map(students.map((student) => [student._id.toString(), student]));

  const [registers, allRegisters, payments] = await Promise.all([
    Register.find({
      workspaceId,
      ...periodFilter,
      studentId: { $in: studentIds },
    }).sort({ created_at: -1, _id: -1 }),
    Register.find({ workspaceId, studentId: { $in: studentIds } }),
    Payment.find({ workspaceId, responsibleId }),
  ]);

  const registersWithStudents = registers.map((register) => {
    const student = studentsById.get(register.studentId.toString());

    return {
      ...register.toJSON(),
      student: {
        id: student._id.toString(),
        name: student.name,
      },
    };
  });

  const consumption = registers.reduce((sum, register) => sum + register.product.price, 0);
  const totalConsumption = allRegisters.reduce((sum, register) => sum + register.product.price, 0);
  const totalPayments = payments.reduce((sum, payment) => sum + payment.payment, 0);
  const total = totalPayments - totalConsumption;

  const responsibleDetails = {
    id: responsible._id.toString(),
    name: responsible.name,
    balance: responsible.balance,
  };

  res.json({
    responsible: responsibleDetails,
    registers: registersWithStudents,
    consumption,
    total,
  });
};

module.exports = {
  fetchRegister,
  fetchResponsiblesRegisters,
  fetchRegisters,
  fetchRegistersSummary,
  fetchRegistersByStudent,
  fetchRegistersByResponsible,
};
