const mongoose = require('mongoose');
const Student = require('../models/student');
const Responsible = require('../models/responsible');
const Register = require('../models/register');
const Order = require('../models/order');
const { writeAuditLog } = require('../services/auditLogService');
const { appError } = require('../utils/functions');

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

const fetchStudentsBySchoolClass = async (req, res) => {
  const { workspaceId, schoolClassId } = req.params;

  const students = await Student.find({ workspaceId, schoolClassId });

  res.json({ students });
};

const postStudent = async (req, res) => {
  const { name, schoolClassId } = req.body;
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
        throw appError('Responsavel nao encontrado', 404);
      }

      [student] = await Student.create(
        [
          {
            workspaceId,
            name,
            schoolClassId,
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
          schoolClassId: student.schoolClassId,
          responsibleId: student.responsibleId,
        },
        session,
      });
    });

    res.json({ student });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar aluno',
    });
  } finally {
    await session.endSession();
  }
};

const updateStudent = async (req, res) => {
  const { workspaceId, responsibleId, id } = req.params;
  const { name, schoolClassId } = req.body;
  const session = await mongoose.startSession();

  try {
    let student;

    await session.withTransaction(async () => {
      const previous = await Student.findOne({ workspaceId, responsibleId, _id: id }).session(
        session,
      );

      if (!previous) {
        throw appError('Aluno nao encontrado', 404);
      }

      student = await Student.findOneAndUpdate(
        { workspaceId, responsibleId, _id: id },
        {
          name,
          schoolClassId,
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
          schoolClassId: {
            from: previous.schoolClassId,
            to: student.schoolClassId,
          },
        },
        session,
      });
    });

    res.json({ student });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao atualizar aluno',
    });
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
        throw appError('Aluno nao encontrado', 404);
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
          schoolClassId: student.schoolClassId,
          responsibleId: student.responsibleId,
          orderCount,
          registerCount,
        },
        session,
      });
    });

    res.sendStatus(200);
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao deletar aluno',
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchStudent,
  fetchStudents,
  fetchAllStudents,
  fetchStudentsBySchoolClass,
  postStudent,
  updateStudent,
  deleteStudent,
};
