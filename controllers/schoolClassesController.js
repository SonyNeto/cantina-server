const mongoose = require('mongoose');
const SchoolClass = require('../models/schoolClass');
const Shift = require('../models/shift');
const { writeAuditLog } = require('../services/auditLogService');

const fetchSchoolClass = async (req, res) => {
  const { workspaceId, shiftId, id } = req.params;

  const schoolClass = await SchoolClass.findOne({ workspaceId, shiftId, _id: id });

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

  const schoolClasses = await SchoolClass.find({ workspaceId }).sort({
    shiftId: 1,
    order: 1,
    label: 1,
  });
  const shiftIds = schoolClasses.map((schoolClass) => schoolClass.shiftId);
  const shifts = await Shift.find({ workspaceId, _id: { $in: shiftIds } });
  const shiftsById = new Map(shifts.map((shift) => [shift._id.toString(), shift]));
  const schoolClassesWithShift = schoolClasses.map((schoolClass) => ({
    ...schoolClass.toJSON(),
    shiftLabel: shiftsById.get(schoolClass.shiftId.toString())?.label ?? '',
  }));

  res.json({ schoolClasses: schoolClassesWithShift });
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
        throw new Error('Turno nao encontrado');
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
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchSchoolClass,
  fetchSchoolClasses,
  fetchAllSchoolClasses,
  postSchoolClass,
};
