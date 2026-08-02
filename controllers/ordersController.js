const mongoose = require('mongoose');
const Order = require('../models/order');
const Register = require('../models/register');
const MenuItem = require('../models/menuItem');
const Student = require('../models/student');
const Responsible = require('../models/responsible');
const SchoolClass = require('../models/schoolClass');
const { writeAuditLog } = require('../services/auditLogService');
const { appError } = require('../utils/functions');

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
      throw appError('Aluno nao encontrado', 404);
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
      throw appError('Responsavel nao encontrado', 404);
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

async function getOrdersWithDetails(workspaceId, status) {
  const query = { workspaceId };

  if (status) {
    query['items.status'] = status;
  }

  const orders = await Order.find(query);

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
      items: order.items.flatMap((item) => {
        if (status && item.status !== status) return [];

        return {
          id: item._id.toString(),
          status: item.status,
          product: serializeProduct(item.product),
        };
      }),
    };
  });

  const totalItems = ordersWithDetails.reduce((total, order) => {
    return total + order.items.length;
  }, 0);

  const totalActiveItems = ordersWithDetails.reduce((total, order) => {
    return total + order.items.filter((item) => item.status === ORDER_STATUS.COOKING).length;
  }, 0);

  const ordersBySchoolClass = ordersWithDetails.reduce((acc, order) => {
    if (!order.schoolClass || order.items.length === 0) return acc;

    const schoolClass = order.schoolClass.id;

    acc[schoolClass] ??= [];
    acc[schoolClass].push(order);

    return acc;
  }, {});

  return {
    orders: ordersBySchoolClass,
    totalItems,
    totalActiveItems,
  };
}

const fetchOrder = async (req, res) => {
  const { workspaceId, id } = req.params;

  const order = await Order.findOne({ workspaceId, _id: id });

  res.json({ order });
};

const fetchOrdersByStudent = async (req, res) => {
  const { workspaceId, studentId } = req.params;

  const orders = await Order.find({ workspaceId, studentId });

  res.json({ orders });
};

const fetchOrdersByStatus = async (req, res) => {
  const { workspaceId, status } = req.params;

  if (!isValidOrderStatus(status)) {
    return res.status(400).json({ message: 'Status do item invalido' });
  }

  const { orders, totalItems } = await getOrdersWithDetails(workspaceId, status);

  res.json({ orders, totalItems });
};

const fetchOrders = async (req, res) => {
  const { workspaceId } = req.params;
  const { orders, totalActiveItems } = await getOrdersWithDetails(workspaceId);

  res.json({ orders, totalActiveItems });
};

const postOrder = async (req, res) => {
  const { created_at, studentId, payment, keepChange, details, items } = req.body;
  const { workspaceId } = req.params;
  const session = await mongoose.startSession();

  try {
    if (details !== undefined && typeof details !== 'string') {
      throw appError('A observação deve ser um texto');
    }

    const normalizedDetails = details?.trim();
    if (normalizedDetails && normalizedDetails.length > 100) {
      throw appError('A observação deve ter no máximo 100 caracteres');
    }

    const studentExists = await Student.exists({ workspaceId, _id: studentId });
    if (!studentExists) {
      throw appError('Aluno nao encontrado', 404);
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw appError('Pedido precisa ter pelo menos um item');
    }

    if (!Number.isSafeInteger(payment) || payment < 0) {
      throw appError('O pagamento deve ser informado em centavos');
    }

    if (typeof keepChange !== 'boolean') {
      throw appError('A opção de manter o troco é inválida');
    }

    let order;
    await session.withTransaction(async () => {
      const itemsToCreate = [];

      for (const itemRequest of items) {
        const product = await MenuItem.findOne({ workspaceId, _id: itemRequest.productId }).session(
          session,
        );

        if (!product) {
          throw appError('Produto nao encontrado', 404);
        }

        itemsToCreate.push({
          product: serializeProduct(product),
          status: ORDER_STATUS.COOKING,
        });
      }

      [order] = await Order.create(
        [
          {
            workspaceId,
            created_at,
            studentId,
            payment,
            keepChange,
            details: normalizedDetails || undefined,
            items: itemsToCreate,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'order.create',
        targetType: 'order',
        targetId: order._id,
        changes: {
          studentId: order.studentId,
          created_at: order.created_at,
          payment: order.payment,
          keepChange: order.keepChange,
          itemCount: order.items.length,
          items: order.items.map((item) => ({
            id: item._id,
            product: item.product,
            status: item.status,
          })),
        },
        session,
      });
    });

    res.json({ order });
  } catch (error) {
    const status = error.status ?? 500;

    return res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar pedido',
    });
  } finally {
    await session.endSession();
  }
};

const updateOrderItemStatus = async (req, res) => {
  const { workspaceId, orderId, itemId } = req.params;
  const { status } = req.body;

  if (!isValidOrderStatus(status)) {
    return res.status(400).json({ message: 'Status de item invalido' });
  }

  const session = await mongoose.startSession();

  try {
    let item;

    await session.withTransaction(async () => {
      const order = await Order.findOne({
        workspaceId,
        _id: orderId,
        'items._id': itemId,
      }).session(session);

      item = order?.items.id(itemId);

      if (!order || !item) {
        throw appError('Item nao encontrado', 404);
      }

      const previousStatus = item.status;
      item.status = status;
      await order.save({ session });

      await writeAuditLog({
        req,
        action: 'orderItem.statusUpdated',
        targetType: 'orderItem',
        targetId: item._id,
        changes: {
          orderId,
          itemId,
          product: item.product,
          status: {
            from: previousStatus,
            to: item.status,
          },
        },
        session,
      });
    });

    res.json({ item });
  } catch (error) {
    const responseStatus = error.status ?? 500;

    res.status(responseStatus).json({
      message: responseStatus < 500 ? error.message : 'Erro ao atualizar item',
    });
  } finally {
    await session.endSession();
  }
};

const deleteOrderItem = async (req, res) => {
  const { workspaceId, orderId, itemId } = req.params;
  const session = await mongoose.startSession();

  try {
    const deletedItem = await session.withTransaction(async () => {
      const order = await Order.findOne({ workspaceId, _id: orderId }).session(session);
      const item = order?.items.id(itemId);

      if (!order || !item) {
        throw appError('Item nao encontrado', 404);
      }

      const itemData = item.toObject();

      await removeOrderItem(order, itemId, session);

      await writeAuditLog({
        req,
        action: 'orderItem.deleted',
        targetType: 'orderItem',
        targetId: itemData._id,
        changes: {
          orderId,
          itemId,
          studentId: order.studentId,
          product: itemData.product,
          status: itemData.status,
        },
        session,
      });

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

      register = await Register.findOne({
        workspaceId,
        sourceOrderItemId: itemId,
      }).session(session);

      if (register) {
        throw appError('Item ja registrado', 409);
      }

      const item = order?.items.id(itemId);

      if (!order || !item) {
        throw appError('Item nao encontrado', 404);
      }

      if (item.status !== ORDER_STATUS.READY) {
        throw appError('Item ainda nao esta pronto', 400);
      }

      const student = await Student.findOne({
        workspaceId,
        _id: order.studentId,
      }).session(session);

      if (!student) {
        throw appError('Aluno nao encontrado', 404);
      }

      const responsible = await Responsible.findOne({
        workspaceId,
        _id: student.responsibleId,
      }).session(session);

      if (!responsible) {
        throw appError('Responsavel nao encontrado', 404);
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
          throw appError('Saldo insuficiente', 409);
        }
      }

      [register] = await Register.create(
        [
          {
            workspaceId,
            sourceOrderItemId: item._id,
            product: item.product,
            created_at: parseOrderDate(order.created_at),
            payment: itemPayment,
            studentId: order.studentId,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'orderItem.register',
        targetType: 'register',
        targetId: register._id,
        changes: {
          registerId: register._id,
          orderId,
          itemId,
          studentId: order.studentId,
          product: register.product,
          price,
          paymentApplied,
          balanceApplied,
          payment: itemPayment,
        },
        session,
      });

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
