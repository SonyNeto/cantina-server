const SchoolClass = require('../models/schoolClass');
const Shift = require('../models/shift');

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

  const shiftExists = await Shift.exists({ workspaceId, _id: shiftId });

  if (!shiftExists) {
    return res.status(400).json({ message: 'Turno não encontrado' });
  }

  const schoolClass = await SchoolClass.create({
    workspaceId,
    label,
    shiftId,
  });

  res.json({ schoolClass });
};

module.exports = {
  fetchSchoolClass,
  fetchSchoolClasses,
  fetchAllSchoolClasses,
  postSchoolClass,
};
