const Register = require('../models/register');
const SchoolClass = require('../models/schoolClass');
const Student = require('../models/student');
const Responsible = require('../models/responsible');

function getPeriodFilter(query) {
  const now = new Date();

  const period = query.p ?? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!/^\d{6}$/.test(period)) {
    throw new Error('Periodo invalido');
  }

  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));

  if (month < 1 || month > 12) {
    throw new Error('Periodo invalido');
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

const fetchResponsiblesRegisters = async (req, res) => {
  const { workspaceId } = req.params;
  const periodFilter = getPeriodFilter(req.query);
  const registers = await Register.find({ workspaceId, ...periodFilter });
  const students = await Student.find({ workspaceId });
  const responsibles = await Responsible.find({ workspaceId });

  const totalsByStudentId = registers.reduce((acc, register) => {
    const studentId = register.studentId.toString();
    acc[studentId] = (acc[studentId] ?? 0) + register.product.price;

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

  res.json({ responsiblesTotals });
};

const fetchRegistersByStudent = async (req, res) => {
  const { workspaceId, studentId } = req.params;
  const periodFilter = getPeriodFilter(req.query);
  const student = await Student.findOne({ workspaceId, _id: studentId });

  if (!student) {
    return res.status(404).json({ message: 'Aluno não encontrado' });
  }

  const studentName = student.name;
  const registers = await Register.find({ workspaceId, studentId, ...periodFilter }).sort({
    created_at: -1,
  });

  const registersByDate = registers.reduce((acc, register) => {
    const date = register.created_at.toISOString().slice(0, 10);

    acc[date] ??= [];
    acc[date].push(register);

    return acc;
  }, {});

  res.json({ registersByDate, studentName });
};

const fetchRegistersByResponsible = async (req, res) => {
  const { workspaceId, responsibleId } = req.params;
  const periodFilter = getPeriodFilter(req.query);
  const responsible = await Responsible.findOne({ workspaceId, _id: responsibleId });

  if (!responsible) {
    return res.status(404).json({ message: 'Responsável não encontrado' });
  }

  const responsibleName = responsible.name;
  const studentsByResponsible = await Student.find({ workspaceId, responsibleId });
  const studentIds = studentsByResponsible.map((student) => student._id);

  const registers = await Register.find({
    workspaceId,
    ...periodFilter,
    studentId: { $in: studentIds },
  });

  const totalsByStudentId = registers.reduce((acc, register) => {
    const studentId = register.studentId.toString();
    acc[studentId] = (acc[studentId] ?? 0) + register.product.price;

    return acc;
  }, {});

  const students = await Student.find({ workspaceId, _id: { $in: studentIds } });

  const schoolClasses = await SchoolClass.find({ workspaceId }).sort({
    shiftId: 1,
    order: 1,
    label: 1,
  });
  const schoolClassesById = new Map(
    schoolClasses.map((schoolClass) => [schoolClass._id.toString(), schoolClass]),
  );

  const studentsTotals = students.map((student) => ({
    id: student._id.toString(),
    name: student.name,
    schoolClassId: student.classId.toString(),
    schoolClassLabel: schoolClassesById.get(student.classId.toString())?.label || '',
    total: totalsByStudentId[student._id.toString()] ?? 0,
  }));

  const total = registers.reduce((sum, register) => {
    return sum + register.product.price;
  }, 0);

  const responsibleTotals = {
    responsibleId,
    responsibleName,
    total,
    studentsTotals,
  };

  res.json({ responsibleTotals });
};

module.exports = {
  fetchRegister,
  fetchResponsiblesRegisters,
  fetchRegisters,
  fetchRegistersByStudent,
  fetchRegistersByResponsible,
};
