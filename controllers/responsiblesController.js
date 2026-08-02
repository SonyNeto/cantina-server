const mongoose = require('mongoose');
const Responsible = require('../models/responsible');
const Student = require('../models/student');
const Register = require('../models/register');
const Order = require('../models/order');
const { writeAuditLog } = require('../services/auditLogService');

const fetchResponsible = async (req, res) => {
  const { workspaceId, id } = req.params;

  const responsible = await Responsible.findOne({ workspaceId, _id: id });

  res.json({ responsible });
};

const fetchResponsibles = async (req, res) => {
  const { workspaceId } = req.params;

  const responsibles = await Responsible.find({ workspaceId });

  res.json({ responsibles });
};

const postResponsible = async (req, res) => {
  const { name } = req.body;
  const { workspaceId } = req.params;
  const session = await mongoose.startSession();

  try {
    let responsible;

    await session.withTransaction(async () => {
      [responsible] = await Responsible.create(
        [
          {
            workspaceId,
            name,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'responsible.created',
        targetType: 'responsible',
        targetId: responsible._id,
        changes: {
          name: responsible.name,
        },
        session,
      });
    });

    res.json({ responsible });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

const updateResponsible = async (req, res) => {
  const { workspaceId, id } = req.params;
  const { name } = req.body;
  const session = await mongoose.startSession();

  try {
    let responsible;

    await session.withTransaction(async () => {
      const previous = await Responsible.findOne({ workspaceId, _id: id }).session(session);

      if (!previous) {
        throw new Error('Responsavel nao encontrado');
      }

      responsible = await Responsible.findOneAndUpdate(
        { workspaceId, _id: id },
        {
          name,
        },
        { new: true, runValidators: true, session },
      );

      await writeAuditLog({
        req,
        action: 'responsible.updated',
        targetType: 'responsible',
        targetId: responsible._id,
        changes: {
          name: {
            from: previous.name,
            to: responsible.name,
          },
        },
        session,
      });
    });

    res.json({ responsible });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

const deleteResponsible = async (req, res) => {
  const { workspaceId, id: responsibleId } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const responsible = await Responsible.findOne({ workspaceId, _id: responsibleId }).session(
        session,
      );

      if (!responsible) {
        throw new Error('Responsavel nao encontrado');
      }

      const students = await Student.find({ workspaceId, responsibleId }).session(session);
      const studentIds = students.map((student) => student._id);
      const registerCount = await Register.countDocuments({
        workspaceId,
        studentId: { $in: studentIds },
      }).session(session);
      const orderCount = await Order.countDocuments({
        workspaceId,
        studentId: { $in: studentIds },
      }).session(session);

      await Register.deleteMany({ workspaceId, studentId: { $in: studentIds } }, { session });
      await Order.deleteMany({ workspaceId, studentId: { $in: studentIds } }, { session });
      await Student.deleteMany({ workspaceId, responsibleId }, { session });
      await Responsible.findOneAndDelete({ workspaceId, _id: responsibleId }).session(session);

      await writeAuditLog({
        req,
        action: 'responsible.deleted',
        targetType: 'responsible',
        targetId: responsible._id,
        changes: {
          name: responsible.name,
          studentCount: students.length,
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
  fetchResponsible,
  fetchResponsibles,
  postResponsible,
  updateResponsible,
  deleteResponsible,
};
