const Shift = require('../models/shift');

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

  const shift = await Shift.create({
    workspaceId,
    label,
  });

  res.json({ shift });
};

module.exports = {
  fetchShift,
  fetchShifts,
  postShift,
};
