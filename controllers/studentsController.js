const Student = require('../models/student');
const Responsible = require('../models/responsible');

const fetchStudent = async (req, res) => {
  const { workspaceId, responsibleId, id } = req.params;

  const student = await Student.findOne({ workspaceId, responsibleId, _id: id });

  res.json({ student });
};

const fetchStudents = async (req, res) => {
  const { workspaceId, responsibleId } = req.params;

  const students = await Student.find({ workspaceId, responsibleId });

  res.json({ students });
};

const fetchAllStudents = async (req, res) => {
  const { workspaceId } = req.params;

  const students = await Student.find({ workspaceId });

  res.json({ students });
};

const fetchStudentsByClass = async (req, res) => {
  const { workspaceId, classId } = req.params;

  const students = await Student.find({ workspaceId, classId });

  res.json({ students });
};

const postStudent = async (req, res) => {
  const { name, classId } = req.body;
  const { workspaceId, responsibleId } = req.params;

  const responsibleExists = await Responsible.exists({ workspaceId, _id: responsibleId });

  if (!responsibleExists) {
    return res.status(400).json({ message: 'Responsável não encontrado' });
  }

  const student = await Student.create({
    workspaceId,
    name,
    classId,
    responsibleId,
  });

  res.json({ student });
};

const updateStudent = async (req, res) => {
  const { workspaceId, responsibleId, id } = req.params;
  const { name, classId } = req.body;

  const student = await Student.findOneAndUpdate(
    { workspaceId, responsibleId, _id: id },
    {
      name,
      classId,
    },
    { new: true },
  );

  res.json({ student });
};

module.exports = {
  fetchStudent,
  fetchStudents,
  fetchAllStudents,
  fetchStudentsByClass,
  postStudent,
  updateStudent,
};
