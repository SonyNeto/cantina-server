const Register = require('../models/register');
const MenuItem = require('../models/menuItem');
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

function parseRegisterDate(value) {
  if (!value) return new Date();

  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (match) {
    const [, day, month, year] = match;

    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(value);
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
    acc[studentId] = (acc[studentId] ?? 0) + register.total;

    return acc;
  }, {});

  const studentTotalsByResponsible = students.map((student) => ({
    responsibleId: student.responsibleId.toString(),
    total: totalsByStudentId[student._id.toString()] ?? 0,
  }));

  const totalsByResponsibleId = studentTotalsByResponsible.reduce((acc, register) => {
    acc[register.responsibleId] = (acc[register.responsibleId] ?? 0) + register.total;

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
  const registers = await Register.find({ workspaceId, studentId, ...periodFilter });

  res.json({ registers, studentName });
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
    acc[studentId] = (acc[studentId] ?? 0) + register.total;

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
    schoolClassLabel: schoolClassesById.get(student.classId.toString())?.label || '',
    total: totalsByStudentId[student._id.toString()] ?? 0,
  }));

  const total = registers.reduce((sum, register) => {
    return sum + register.total;
  }, 0);

  const responsibleTotals = {
    responsibleId,
    responsibleName,
    total,
    studentsTotals,
  };

  res.json({ responsibleTotals });
};

const postRegister = async (req, res) => {
  const { product, productId, created_at, studentId, total } = req.body;
  const { workspaceId } = req.params;

  const studentExists = await Student.exists({ workspaceId, _id: studentId });

  if (!studentExists) {
    return res.status(400).json({ message: 'Aluno nao encontrado' });
  }

  const selectedProduct = product ?? (await MenuItem.findOne({ workspaceId, _id: productId }));

  if (!selectedProduct) {
    return res.status(400).json({ message: 'Produto nao encontrado' });
  }

  const register = await Register.create({
    workspaceId,
    product: {
      id: selectedProduct.id ?? selectedProduct._id.toString(),
      label: selectedProduct.label,
      price: selectedProduct.price,
    },
    created_at: parseRegisterDate(created_at),
    studentId,
    total: total ?? selectedProduct.price,
  });

  res.json({ register });
};

module.exports = {
  fetchRegister,
  fetchResponsiblesRegisters,
  fetchRegisters,
  fetchRegistersByStudent,
  fetchRegistersByResponsible,
  postRegister,
};
