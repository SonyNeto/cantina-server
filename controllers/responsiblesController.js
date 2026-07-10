const mongoose = require('mongoose');
const Responsible = require('../models/responsible');
const Student = require('../models/student');
const Register = require('../models/register');
const Order = require('../models/order');

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

  const responsible = await Responsible.create({
    workspaceId,
    name,
  });

  res.json({ responsible });
};

const updateResponsible = async (req, res) => {
  const { workspaceId, id } = req.params;
  const { name } = req.body;

  const responsible = await Responsible.findOneAndUpdate(
    { workspaceId, _id: id },
    {
      name,
    },
    { new: true },
  );

  res.json({ responsible });
};

const deleteResponsible = async (req, res) => {
  try {
    const { workspaceId, id: responsibleId } = req.params;

    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const students = await Student.find({ workspaceId, responsibleId });
      const studentIds = students.map((student) => student._id);

      await Register.deleteMany({ workspaceId, studentId: { $in: studentIds } });
      await Order.deleteMany({ workspaceId, studentId: { $in: studentIds } });
      await Student.deleteMany({ workspaceId, responsibleId });
      await Responsible.findOneAndDelete({ workspaceId, _id: responsibleId });
    });

    await session.endSession();
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
};

module.exports = {
  fetchResponsible,
  fetchResponsibles,
  postResponsible,
  updateResponsible,
  deleteResponsible,
};
