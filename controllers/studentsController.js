const mongoose = require('mongoose');
const Student = require('../models/student');
const Responsible = require('../models/responsible');
const Register = require('../models/register');
const Order = require('../models/order');
const { writeAuditLog } = require('../services/auditLogService');

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
  const session = await mongoose.startSession();

  try {
    let student;

    await session.withTransaction(async () => {
      const responsibleExists = await Responsible.exists({
        workspaceId,
        _id: responsibleId,
      }).session(session);

      if (!responsibleExists) {
        throw new Error('Responsavel nao encontrado');
      }

      [student] = await Student.create(
        [
          {
            workspaceId,
            name,
            classId,
            responsibleId,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'student.created',
        targetType: 'student',
        targetId: student._id,
        changes: {
          name: student.name,
          classId: student.classId,
          responsibleId: student.responsibleId,
        },
        session,
      });
    });

    res.json({ student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

const updateStudent = async (req, res) => {
  const { workspaceId, responsibleId, id } = req.params;
  const { name, classId } = req.body;
  const session = await mongoose.startSession();

  try {
    let student;

    await session.withTransaction(async () => {
      const previous = await Student.findOne({ workspaceId, responsibleId, _id: id }).session(
        session,
      );

      if (!previous) {
        throw new Error('Aluno nao encontrado');
      }

      student = await Student.findOneAndUpdate(
        { workspaceId, responsibleId, _id: id },
        {
          name,
          classId,
        },
        { new: true, runValidators: true, session },
      );

      await writeAuditLog({
        req,
        action: 'student.updated',
        targetType: 'student',
        targetId: student._id,
        changes: {
          name: {
            from: previous.name,
            to: student.name,
          },
          classId: {
            from: previous.classId,
            to: student.classId,
          },
        },
        session,
      });
    });

    res.json({ student });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

const deleteStudent = async (req, res) => {
  const { workspaceId, responsibleId, id: studentId } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const student = await Student.findOne({ workspaceId, responsibleId, _id: studentId }).session(
        session,
      );

      if (!student) {
        throw new Error('Aluno nao encontrado');
      }

      const registerCount = await Register.countDocuments({ workspaceId, studentId }).session(
        session,
      );
      const orderCount = await Order.countDocuments({ workspaceId, studentId }).session(session);

      await Register.deleteMany({ workspaceId, studentId }, { session });
      await Order.deleteMany({ workspaceId, studentId }, { session });
      await Student.findOneAndDelete({ workspaceId, responsibleId, _id: studentId }).session(
        session,
      );

      await writeAuditLog({
        req,
        action: 'student.deleted',
        targetType: 'student',
        targetId: student._id,
        changes: {
          name: student.name,
          classId: student.classId,
          responsibleId: student.responsibleId,
          orderCount,
          registerCount,
        },
        session,
      });
    });

    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchStudent,
  fetchStudents,
  fetchAllStudents,
  fetchStudentsByClass,
  postStudent,
  updateStudent,
  deleteStudent,
};
