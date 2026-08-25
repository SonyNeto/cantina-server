const mongoose = require('mongoose');
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

const fetchResponsibleAccounts = async (req, res) => {
  const { workspaceId } = req.params;
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

  const matchingResponsibles = await Responsible.find(responsiblesFilter);

  matchingResponsibles.sort((firstResponsible, secondResponsible) => {
    const firstIsDebtor = firstResponsible.accountBalance < 0;
    const secondIsDebtor = secondResponsible.accountBalance < 0;

    if (firstIsDebtor && !secondIsDebtor) return -1;
    if (!firstIsDebtor && secondIsDebtor) return 1;
    if (firstIsDebtor && secondIsDebtor) {
      return firstResponsible.accountBalance - secondResponsible.accountBalance;
    }

    return (
      firstResponsible.name.localeCompare(secondResponsible.name) ||
      firstResponsible._id.toString().localeCompare(secondResponsible._id.toString())
    );
  });

  let pagination = null;
  let responsibles = matchingResponsibles;

  if (page && limit) {
    const numberOfResponsibles = matchingResponsibles.length;
    const totalPages = Math.ceil(numberOfResponsibles / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    responsibles = matchingResponsibles.slice((page - 1) * limit, page * limit);

    pagination = {
      page,
      totalPages,
      nextPage,
    };
  }

  const responsibleAccounts = responsibles.map((responsible) => {
    const responsibleId = responsible._id.toString();

    return {
      responsibleId,
      responsibleName: responsible.name,
      accountBalance: responsible.accountBalance,
    };
  });

  res.json({ responsibleAccounts, pagination });
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

  const registers = await Register.find({
    workspaceId,
    ...periodFilter,
    studentId: { $in: studentIds },
  }).sort({ created_at: -1, _id: -1 });

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

  const responsibleDetails = {
    id: responsible._id.toString(),
    name: responsible.name,
    accountBalance: responsible.accountBalance,
  };

  res.json({
    responsible: responsibleDetails,
    registers: registersWithStudents,
    consumption,
  });
};

module.exports = {
  fetchRegister,
  fetchResponsibleAccounts,
  fetchRegisters,
  fetchRegistersSummary,
  fetchRegistersByStudent,
  fetchRegistersByResponsible,
};
