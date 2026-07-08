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
    return res.status(400).json({ message: 'Status de item invalido' });
  }

  const orders = await Order.find({ workspaceId, status });

  res.json({ orders });
};

const fetchOrdersByStudent = async (req, res) => {
  const { workspaceId, studentId } = req.params;

  const orders = await Order.find({ workspaceId, studentId });

  res.json({ orders });
};

const fetchOrdersWithDetails = async (req, res) => {
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
      quantity: order.quantity,
      total: order.total,
      created_at: order.created_at,
      status: order.status,
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
      product: serializeProduct(order.product),
    };
  });

  res.json({ orderItems: ordersWithDetails });
};

const postOrders = async (req, res) => {
  const { created_at, studentId, items, productId, menuItemId, quantity, status } = req.body;
  const { workspaceId } = req.params;

  const studentExists = await Student.exists({ workspaceId, _id: studentId });

  if (!studentExists) {
    return res.status(400).json({ message: 'Aluno nao encontrado' });
  }

  const orderRequests = Array.isArray(items)
    ? items
    : [
        {
          productId: productId ?? menuItemId,
          quantity,
          status,
        },
      ];

  if (orderRequests.length === 0) {
    return res.status(400).json({ message: 'Pedido precisa ter pelo menos um item' });
  }

  const ordersToCreate = [];

  for (const orderRequest of orderRequests) {
    const orderProductId = orderRequest.productId ?? orderRequest.menuItemId;
    const product = await MenuItem.findOne({ workspaceId, _id: orderProductId });
    const orderQuantity = Number(orderRequest.quantity ?? 1);

    if (!orderProductId || !product) {
      return res.status(400).json({ message: 'Produto nao encontrado' });
    }

    if (!Number.isFinite(orderQuantity) || orderQuantity < 1) {
      return res.status(400).json({ message: 'Quantidade invalida' });
    }

    if (orderRequest.status && !isValidOrderStatus(orderRequest.status)) {
      return res.status(400).json({ message: 'Status de item invalido' });
    }

    ordersToCreate.push({
      workspaceId,
      created_at,
      studentId,
      productId: orderProductId,
      product: serializeProduct(product),
      quantity: orderQuantity,
      status: orderRequest.status ?? ORDER_STATUS.COOKING,
      total: product.price * orderQuantity,
    });
  }

  const orders = await Order.create(ordersToCreate);

  res.json({ orders });
};

const updateOrderStatus = async (req, res) => {
  const { workspaceId, id } = req.params;
  const { status } = req.body;

  if (!isValidOrderStatus(status)) {
    return res.status(400).json({ message: 'Status de item invalido' });
  }

  const order = await Order.findOneAndUpdate(
    { workspaceId, _id: id },
    { status },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!order) {
    return res.status(404).json({ message: 'Pedido nao encontrado' });
  }

  res.json({ order });
};

const deleteOrder = async (req, res) => {
  const { workspaceId, id } = req.params;

  const order = await Order.findOneAndDelete({ workspaceId, _id: id });

  res.json({ order });
};

module.exports = {
  fetchOrder,
  fetchOrders,
  fetchOrdersByStatus,
  fetchOrdersByStudent,
  fetchOrdersWithDetails,
  postOrders,
  updateOrderStatus,
  deleteOrder,
};
