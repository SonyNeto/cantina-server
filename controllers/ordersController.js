const mongoose = require('mongoose');
const Order = require('../models/order');
const Register = require('../models/register');
const MenuItem = require('../models/menuItem');
const Student = require('../models/student');
const Responsible = require('../models/responsible');
const SchoolClass = require('../models/schoolClass');

const ORDER_STATUS = {
  COOKING: 'cooking',
  READY: 'ready',
};

function isValidOrderStatus(status) {
  return Object.values(ORDER_STATUS).includes(status);
}

function serializeProduct(product) {
  return {
    id: product.id ?? product._id.toString(),
    label: product.label,
    price: product.price,
  };
}

function parseOrderDate(value) {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);

  if (!match) return new Date(value);

  const [, day, month, year] = match;

  return new Date(Number(year), Number(month) - 1, Number(day));
}

async function finishOrder(order, session) {
  if (order.keepChange && order.payment > 0) {
    const student = await Student.findOne({
      workspaceId: order.workspaceId,
      _id: order.studentId,
    }).session(session);

    if (!student) {
      const error = new Error('Aluno nao encontrado');
      error.status = 404;
      throw error;
    }

    const balanceUpdate = await Responsible.updateOne(
      {
        workspaceId: order.workspaceId,
        _id: student.responsibleId,
      },
      {
        $inc: {
          balance: order.payment,
        },
      },
      {
        session,
        runValidators: true,
      },
    );

    if (balanceUpdate.matchedCount === 0) {
      const error = new Error('Responsavel nao encontrado');
      error.status = 404;
      throw error;
    }
  }

  await Order.deleteOne(
    {
      workspaceId: order.workspaceId,
      _id: order._id,
    },
    { session },
  );
}

async function removeOrderItem(order, itemId, session) {
  order.items.pull(itemId);

  if (order.items.length === 0) {
    await finishOrder(order, session);
    return;
  }

  await order.save({ session });
}

const fetchOrder = async (req, res) => {
  const { workspaceId, id } = req.params;

  const order = await Order.findOne({ workspaceId, _id: id });

  res.json({ order });
};

const fetchOrdersByStatus = async (req, res) => {
  const { workspaceId, status } = req.params;

  if (!isValidOrderStatus(status)) {
    return res.status(400).json({ message: 'Status do item invalido' });
  }

  const orders = await Order.find({ workspaceId, 'items.status': status });

  res.json({ orders });
};

const fetchOrdersByStudent = async (req, res) => {
  const { workspaceId, studentId } = req.params;

  const orders = await Order.find({ workspaceId, studentId });

  res.json({ orders });
};

const fetchOrders = async (req, res) => {
  const { workspaceId } = req.params;

  const orders = await Order.find({ workspaceId });

  const studentIds = orders.map((order) => order.studentId);

  const students = await Student.find({ workspaceId, _id: { $in: studentIds } });

  const classIds = students.map((student) => student.classId);
  const schoolClasses = await SchoolClass.find({ workspaceId, _id: { $in: classIds } }).sort({
    shiftId: 1,
    order: 1,
    label: 1,
  });

  const studentsById = new Map(students.map((student) => [student._id.toString(), student]));
  const classesById = new Map(
    schoolClasses.map((schoolClass) => [schoolClass._id.toString(), schoolClass]),
  );

  const ordersWithDetails = orders.map((order) => {
    const student = studentsById.get(order.studentId.toString());
    const schoolClass = student ? classesById.get(student.classId.toString()) : null;

    return {
      id: order._id.toString(),
      created_at: order.created_at,
      student: student
        ? {
            id: student._id.toString(),
            name: student.name,
          }
        : null,
      schoolClass: schoolClass
        ? {
            id: schoolClass._id.toString(),
            label: schoolClass.label,
          }
        : null,
      payment: order.payment,
      details: order.details,
      items: order.items.map((item) => ({
        id: item._id.toString(),
        status: item.status,
        product: serializeProduct(item.product),
      })),
    };
  });

  const totalActiveItems = orders.reduce((total, order) => {
    return total + order.items.filter((item) => item.status === 'cooking').length;
  }, 0);

  const ordersBySchoolClass = ordersWithDetails.reduce((acc, order) => {
    const schoolClass = order.schoolClass.label;

    acc[schoolClass] ??= [];
    acc[schoolClass].push(order);

    return acc;
  }, {});

  res.json({ orders: ordersBySchoolClass, totalActiveItems });
};

const postOrder = async (req, res) => {
  const { created_at, studentId, payment, keepChange, details, items } = req.body;
  const { workspaceId } = req.params;

  if (details !== undefined && typeof details !== 'string') {
    return res.status(400).json({
      message: 'A observação deve ser um texto',
    });
  }

  const normalizedDetails = details?.trim();

  if (normalizedDetails && normalizedDetails.length > 100) {
    return res.status(400).json({
      message: 'A observação deve ter no máximo 100 caracteres',
    });
  }

  const studentExists = await Student.exists({ workspaceId, _id: studentId });

  if (!studentExists) {
    return res.status(400).json({ message: 'Aluno nao encontrado' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Pedido precisa ter pelo menos um item' });
  }

  if (!Number.isSafeInteger(payment) || payment < 0) {
    return res.status(400).json({
      message: 'O pagamento deve ser informado em centavos',
    });
  }

  if (typeof keepChange !== 'boolean') {
    return res.status(400).json({
      message: 'A opção de manter o troco é inválida',
    });
  }

  const itemsToCreate = [];

  for (const itemRequest of items) {
    const product = await MenuItem.findOne({ workspaceId, _id: itemRequest.productId });

    if (!product) {
      return res.status(400).json({ message: 'Produto nao encontrado' });
    }

    itemsToCreate.push({
      product: serializeProduct(product),
      status: ORDER_STATUS.COOKING,
    });
  }

  const order = await Order.create({
    workspaceId,
    created_at,
    studentId,
    payment,
    keepChange,
    details: normalizedDetails || undefined,
    items: itemsToCreate,
  });

  res.json({ order });
};

const updateOrderItemStatus = async (req, res) => {
  const { workspaceId, orderId, itemId } = req.params;
  const { status } = req.body;

  if (!isValidOrderStatus(status)) {
    return res.status(400).json({ message: 'Status de item invalido' });
  }

  const order = await Order.findOneAndUpdate(
    { workspaceId, _id: orderId, 'items._id': itemId },
    { $set: { 'items.$.status': status } },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!order) {
    return res.status(404).json({ message: 'Item nao encontrado' });
  }

  res.json({ item: order.items.id(itemId) });
};

const deleteOrderItem = async (req, res) => {
  const { workspaceId, orderId, itemId } = req.params;
  const session = await mongoose.startSession();

  try {
    const deletedItem = await session.withTransaction(async () => {
      const order = await Order.findOne({ workspaceId, _id: orderId }).session(session);
      const item = order?.items.id(itemId);

      if (!order || !item) {
        const error = new Error('Item nao encontrado');
        error.status = 404;
        throw error;
      }

      const itemData = item.toObject();

      await removeOrderItem(order, itemId, session);

      return itemData;
    });

    return res.json({ item: deletedItem });
  } catch (error) {
    const status = error.status ?? 500;

    return res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao deletar item',
    });
  } finally {
    await session.endSession();
  }
};

const registerOrderItem = async (req, res) => {
  const { workspaceId, orderId, itemId } = req.params;
  const session = await mongoose.startSession();

  let register;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({
        workspaceId,
        _id: orderId,
        'items._id': itemId,
      }).session(session);

      const item = order?.items.id(itemId);

      if (!order || !item) {
        const error = new Error('Item nao encontrado');
        error.status = 404;
        throw error;
      }

      if (item.status !== ORDER_STATUS.READY) {
        const error = new Error('Item ainda nao esta pronto');
        error.status = 400;
        throw error;
      }

      const student = await Student.findOne({
        workspaceId,
        _id: order.studentId,
      }).session(session);

      if (!student) {
        const error = new Error('Aluno nao encontrado');
        error.status = 404;
        throw error;
      }

      const responsible = await Responsible.findOne({
        workspaceId,
        _id: student.responsibleId,
      }).session(session);

      if (!responsible) {
        const error = new Error('Responsavel nao encontrado');
        error.status = 404;
        throw error;
      }

      const price = item.product.price;
      const paymentApplied = Math.min(order.payment ?? 0, price);
      order.payment = (order.payment ?? 0) - paymentApplied;

      const remainingPrice = price - paymentApplied;
      const balanceApplied = Math.min(remainingPrice, responsible.balance ?? 0);
      const itemPayment = paymentApplied + balanceApplied;

      if (balanceApplied > 0) {
        const balanceUpdate = await Responsible.updateOne(
          {
            workspaceId,
            _id: responsible._id,
            balance: { $gte: balanceApplied },
          },
          {
            $inc: {
              balance: -balanceApplied,
            },
          },
          {
            session,
            runValidators: true,
          },
        );

        if (balanceUpdate.matchedCount === 0) {
          const error = new Error('Saldo insuficiente');
          error.status = 409;
          throw error;
        }
      }

      [register] = await Register.create(
        [
          {
            workspaceId,
            product: item.product,
            created_at: parseOrderDate(order.created_at),
            payment: itemPayment,
            studentId: order.studentId,
          },
        ],
        { session },
      );

      await removeOrderItem(order, itemId, session);
    });

    return res.json({ register });
  } catch (error) {
    const status = error.status ?? 500;

    return res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao registrar item',
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchOrder,
  fetchOrders,
  fetchOrdersByStatus,
  fetchOrdersByStudent,
  postOrder,
  updateOrderItemStatus,
  deleteOrderItem,
  registerOrderItem,
};
