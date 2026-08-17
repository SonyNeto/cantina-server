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

  let shiftsQuery = Shift.find(filter).sort({ _id: 1 });
  let pagination = null;

  if (page && limit) {
    shiftsQuery = shiftsQuery.skip((page - 1) * limit).limit(limit);

    const numberOfShifts = await Shift.countDocuments(filter);

    const totalPages = Math.ceil(numberOfShifts / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    pagination = {
      page,
      totalPages,
      nextPage,
    };
  }

  const shifts = await shiftsQuery;

  res.json({ shifts, pagination });
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
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar turno',
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchShift,
  fetchShifts,
  postShift,
};
