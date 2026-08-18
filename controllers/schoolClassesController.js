const mongoose = require('mongoose');
const SchoolClass = require('../models/schoolClass');
const Shift = require('../models/shift');
const Student = require('../models/student');
const { writeAuditLog } = require('../services/auditLogService');
const { appError } = require('../utils/functions');

const fetchSchoolClass = async (req, res) => {
  const { workspaceId, shiftId, schoolClassId } = req.params;

  const schoolClass = await SchoolClass.findOne({
    workspaceId,
    shiftId,
    _id: schoolClassId,
  });

  res.json({ schoolClass });
};

const fetchSchoolClasses = async (req, res) => {
  const { workspaceId, shiftId } = req.params;

  const schoolClasses = await SchoolClass.find({ workspaceId, shiftId }).sort({
    order: 1,
    label: 1,
  });

  res.json({ schoolClasses });
};

const fetchAllSchoolClasses = async (req, res) => {
  const { workspaceId } = req.params;
  const shiftId = req.query.shiftId;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);
  const search = req.query.search;

  const filter = { workspaceId };

  if (search) {
    filter.label = {
      $regex: search,
      $options: 'i',
    };
  }

  if (shiftId) {
    filter.shiftId = shiftId;
  }

  let schoolClassesQuery = SchoolClass.find(filter).sort({
    shiftId: 1,
    order: 1,
    label: 1,
    _id: 1,
  });
  let pagination = null;

  if (page && limit) {
    schoolClassesQuery = schoolClassesQuery.skip((page - 1) * limit).limit(limit);

    const numberOfSchoolClasses = await SchoolClass.countDocuments(filter);
    const totalPages = Math.ceil(numberOfSchoolClasses / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    pagination = {
      page,
      totalPages,
      nextPage,
    };
  }

  const schoolClasses = await schoolClassesQuery;
  const shiftIds = schoolClasses.map((schoolClass) => schoolClass.shiftId);
  const shifts = await Shift.find({ workspaceId, _id: { $in: shiftIds } });
  const shiftsById = new Map(shifts.map((shift) => [shift._id.toString(), shift]));
  const schoolClassesWithShift = schoolClasses.map((schoolClass) => ({
    ...schoolClass.toJSON(),
    shiftLabel: shiftsById.get(schoolClass.shiftId.toString())?.label ?? '',
  }));

  res.json({ schoolClasses: schoolClassesWithShift, pagination });
};

const postSchoolClass = async (req, res) => {
  const { label } = req.body;
  const { workspaceId, shiftId } = req.params;
  const session = await mongoose.startSession();

  try {
    let schoolClass;

    await session.withTransaction(async () => {
      const shiftExists = await Shift.exists({ workspaceId, _id: shiftId }).session(session);

      if (!shiftExists) {
        throw appError('Turno nao encontrado', 404);
      }

      [schoolClass] = await SchoolClass.create(
        [
          {
            workspaceId,
            label,
            shiftId,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'schoolClass.created',
        targetType: 'schoolClass',
        targetId: schoolClass._id,
        changes: {
          label: schoolClass.label,
          shiftId: schoolClass.shiftId,
          order: schoolClass.order,
        },
        session,
      });
    });

    res.json({ schoolClass });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar turma',
    });
  } finally {
    await session.endSession();
  }
};

const deleteSchoolClass = async (req, res) => {
  const { workspaceId, shiftId, schoolClassId } = req.params;
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const schoolClass = await SchoolClass.findOne({
        workspaceId,
        shiftId,
        _id: schoolClassId,
      }).session(session);

      if (!schoolClass) {
        throw appError('Turma nao encontrada', 404);
      }

      const students = await Student.find({ workspaceId, schoolClassId });

      if (students.length > 0) {
        throw appError('Existem alunos cadastrados nesta turma', 409);
      }

      await SchoolClass.findOneAndDelete({ workspaceId, shiftId, _id: schoolClassId }).session(
        session,
      );

      await writeAuditLog({
        req,
        action: 'schoolClass.deleted',
        targetType: 'schoolClass',
        targetId: schoolClass._id,
        changes: {
          label: schoolClass.label,
        },
        session,
      });
    });

    res.sendStatus(200);
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao deletar turma',
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchSchoolClass,
  fetchSchoolClasses,
  fetchAllSchoolClasses,
  postSchoolClass,
  deleteSchoolClass,
};
