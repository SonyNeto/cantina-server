const mongoose = require('mongoose');
const Shift = require('../models/shift');
const { writeAuditLog } = require('../services/auditLogService');

const fetchShift = async (req, res) => {
  const { workspaceId, id } = req.params;

  const shift = await Shift.findOne({ workspaceId, _id: id });

  res.json({ shift });
};

const fetchShifts = async (req, res) => {
  const { workspaceId } = req.params;

  const shifts = await Shift.find({ workspaceId });

  res.json({ shifts });
};

const postShift = async (req, res) => {
  const { label } = req.body;
  const { workspaceId } = req.params;
  const session = await mongoose.startSession();

  try {
    let shift;

    await session.withTransaction(async () => {
      [shift] = await Shift.create(
        [
          {
            workspaceId,
            label,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'shift.created',
        targetType: 'shift',
        targetId: shift._id,
        changes: {
          label: shift.label,
        },
        session,
      });
    });

    res.json({ shift });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchShift,
  fetchShifts,
  postShift,
};
