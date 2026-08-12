const mongoose = require('mongoose');
const Responsible = require('../models/responsible');
const Student = require('../models/student');
const Register = require('../models/register');
const Order = require('../models/order');
const { writeAuditLog } = require('../services/auditLogService');
const { appError } = require('../utils/functions');

const fetchResponsible = async (req, res) => {
  const { workspaceId, id } = req.params;

  const responsible = await Responsible.findOne({ workspaceId, _id: id });

  res.json({ responsible });
};

const fetchResponsibles = async (req, res) => {
  const { workspaceId } = req.params;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const search = req.query.search;

  const filter = { workspaceId };

  if (search) {
    filter.name = {
      $regex: search,
      $options: 'i',
    };
  }

  let responsiblesQuery = Responsible.find(filter).sort({ name: 1, _id: 1 });
  let pagination = null;

  if (page && limit) {
    responsiblesQuery = responsiblesQuery.skip((page - 1) * limit).limit(limit);

    const numberOfResponsibles = await Responsible.countDocuments(filter);
    const totalPages = Math.ceil(numberOfResponsibles / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    pagination = {
      page,
      totalPages,
      nextPage,
    };
  }

  const responsibles = await responsiblesQuery;

  res.json({ responsibles, pagination });
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
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar responsavel',
    });
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
        throw appError('Responsavel nao encontrado', 404);
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
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao atualizar responsavel',
    });
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
        throw appError('Responsavel nao encontrado', 404);
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
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao deletar responsavel',
    });
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
