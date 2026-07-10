const Responsible = require('../models/responsible');

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

module.exports = {
  fetchResponsible,
  fetchResponsibles,
  postResponsible,
  updateResponsible,
};
