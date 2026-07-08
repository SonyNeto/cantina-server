const MenuItem = require('../models/menuItem');

const fetchMenuItem = async (req, res) => {
  const { workspaceId, id } = req.params;

  const menuItem = await MenuItem.findOne({ workspaceId, _id: id });

  res.json({ menuItem });
};

const fetchMenuItems = async (req, res) => {
  const { workspaceId } = req.params;

  const menuItems = await MenuItem.find({ workspaceId });

  res.json({ menuItems });
};

const postMenuItem = async (req, res) => {
  const { label, price } = req.body;
  const { workspaceId } = req.params;

  const menuItem = await MenuItem.create({
    workspaceId,
    label,
    price,
  });

  res.json({ menuItem });
};

const updateMenuItem = async (req, res) => {
  const { workspaceId, id } = req.params;
  const { label, price } = req.body;

  const menuItem = await MenuItem.findOneAndUpdate(
    { workspaceId, _id: id },
    {
      label,
      price,
    },
    { new: true },
  );

  res.json({ menuItem });
};

const deleteMenuItem = async (req, res) => {
  const { workspaceId, id } = req.params;

  const menuItem = await MenuItem.findOneAndDelete({ workspaceId, _id: id });

  res.json({ menuItem });
};

module.exports = {
  fetchMenuItem,
  fetchMenuItems,
  postMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
