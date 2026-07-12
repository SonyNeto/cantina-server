const Order = require('../models/order');
const MenuItem = require('../models/menuItem');
const Student = require('../models/student');
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

const fetchOrder = async (req, res) => {
  const { workspaceId, id } = req.params;

  const order = await Order.findOne({ workspaceId, _id: id });

  res.json({ order });
};

const fetchOrders = async (req, res) => {
  const { workspaceId } = req.params;

  const orders = await Order.find({ workspaceId });

  res.json({ orders });
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

const fetchOrderItemsWithDetails = async (req, res) => {
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

  const orderItems = orders.flatMap((order) => {
    const student = studentsById.get(order.studentId.toString());
    const schoolClass = student ? classesById.get(student.classId.toString()) : null;

    return order.items.map((item) => ({
      id: item._id.toString(),
      orderId: order._id.toString(),
      total: item.total,
      created_at: order.created_at,
      status: item.status,
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
      product: serializeProduct(item.product),
    }));
  });

  res.json({ orderItems });
};

const postOrder = async (req, res) => {
  const { created_at, studentId, items } = req.body;
  const { workspaceId } = req.params;

  const studentExists = await Student.exists({ workspaceId, _id: studentId });

  if (!studentExists) {
    return res.status(400).json({ message: 'Aluno nao encontrado' });
  }

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Pedido precisa ter pelo menos um item' });
  }

  const itemsToCreate = [];

  for (const itemRequest of items) {
    const product = await MenuItem.findOne({ workspaceId, _id: itemRequest.productId });

    if (!product) {
      return res.status(400).json({ message: 'Produto nao encontrado' });
    }

    if (itemRequest.status && !isValidOrderStatus(itemRequest.status)) {
      return res.status(400).json({ message: 'Status de item invalido' });
    }

    itemsToCreate.push({
      productId: itemRequest.productId,
      product: serializeProduct(product),
      status: itemRequest.status ?? ORDER_STATUS.COOKING,
      total: product.price,
    });
  }

  const order = await Order.create({
    workspaceId,
    created_at,
    studentId,
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
    return res.status(404).json({ message: 'Item nao encontrada' });
  }

  res.json({ item: order.items.id(itemId) });
};

const deleteOrderItem = async (req, res) => {
  const { workspaceId, orderId, itemId } = req.params;
  const order = await Order.findOne({ workspaceId, _id: orderId });
  const item = order?.items.id(itemId);

  if (!order || !item) {
    return res.status(404).json({ message: 'Item nao encontrado' });
  }

  if (order.items.length === 1) {
    await Order.deleteOne({ workspaceId, _id: orderId });
  } else {
    order.items.pull(itemId);
    await order.save();
  }

  res.json({ item });
};

module.exports = {
  fetchOrder,
  fetchOrders,
  fetchOrdersByStatus,
  fetchOrdersByStudent,
  fetchOrderItemsWithDetails,
  postOrder,
  updateOrderItemStatus,
  deleteOrderItem,
};
