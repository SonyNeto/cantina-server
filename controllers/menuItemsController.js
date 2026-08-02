const mongoose = require('mongoose');
const MenuItem = require('../models/menuItem');
const { writeAuditLog } = require('../services/auditLogService');
const { appError } = require('../utils/functions');

function isPositiveCents(value) {
  return Number.isSafeInteger(value) && value > 0;
}

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
  const session = await mongoose.startSession();

  try {
    if (!isPositiveCents(price)) {
      throw appError('O preco deve ser informado em centavos');
    }

    let menuItem;

    await session.withTransaction(async () => {
      [menuItem] = await MenuItem.create(
        [
          {
            workspaceId,
            label,
            price,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'menuItem.created',
        targetType: 'menuItem',
        targetId: menuItem._id,
        changes: {
          label: menuItem.label,
          price: menuItem.price,
        },
        session,
      });
    });

    res.json({ menuItem });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar produto',
    });
  } finally {
    await session.endSession();
  }
};

const updateMenuItem = async (req, res) => {
  const { workspaceId, id } = req.params;
  const { label, price } = req.body;
  const session = await mongoose.startSession();

  try {
    if (!isPositiveCents(price)) {
      throw appError('O preco deve ser informado em centavos');
    }

    let menuItem;

    await session.withTransaction(async () => {
      const previous = await MenuItem.findOne({ workspaceId, _id: id }).session(session);

      if (!previous) {
        throw appError('Produto nao encontrado', 404);
      }

      menuItem = await MenuItem.findOneAndUpdate(
        { workspaceId, _id: id },
        {
          label,
          price,
        },
        { new: true, runValidators: true, session },
      );

      await writeAuditLog({
        req,
        action: 'menuItem.updated',
        targetType: 'menuItem',
        targetId: menuItem._id,
        changes: {
          label: {
            from: previous.label,
            to: menuItem.label,
          },
          price: {
            from: previous.price,
            to: menuItem.price,
          },
        },
        session,
      });
    });

    res.json({ menuItem });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao atualizar produto',
    });
  } finally {
    await session.endSession();
  }
};

const deleteMenuItem = async (req, res) => {
  const { workspaceId, id } = req.params;
  const session = await mongoose.startSession();

  try {
    let menuItem;

    await session.withTransaction(async () => {
      menuItem = await MenuItem.findOneAndDelete({ workspaceId, _id: id }).session(session);

      if (!menuItem) {
        throw appError('Produto nao encontrado', 404);
      }

      await writeAuditLog({
        req,
        action: 'menuItem.deleted',
        targetType: 'menuItem',
        targetId: menuItem._id,
        changes: {
          label: menuItem.label,
          price: menuItem.price,
        },
        session,
      });
    });

    res.json({ menuItem });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao deletar produto',
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchMenuItem,
  fetchMenuItems,
  postMenuItem,
  updateMenuItem,
  deleteMenuItem,
};
