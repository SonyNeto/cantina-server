const MenuItem = require('../models/menuItem');

const fetchMenuItem = async (req, res) => {
  const { workspaceId, id } = req.params;

  const menuItem = await MenuItem.findOne({ workspaceId, _id: id });

  res.json({ menuItem });
};

const fetchMenuItems = async (req, res) => {
  const { workspaceId } = req.params;
  const page = Number(req.query.page);
  const limit = Number(req.query.limit);

  let menuItemsQuery = MenuItem.find({ workspaceId }).sort({ label: 1, _id: 1 });

  let pagination = null;

  if (page && limit) {
    menuItemsQuery = menuItemsQuery.skip((page - 1) * limit).limit(limit);
    
    const numberOfMenuItems = await MenuItem.countDocuments({ workspaceId });

    const totalPages = Math.ceil(numberOfMenuItems / limit);
    const nextPage = page < totalPages ? page + 1 : null;

    pagination = {
      page,
      totalPages,
      nextPage,
    };
  }

  const menuItems = await menuItemsQuery;

  res.json({ menuItems, pagination });
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
