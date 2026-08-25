const AuditLog = require('../models/auditLog');
const Order = require('../models/order');
const Responsible = require('../models/responsible');
const Student = require('../models/student');

const TARGET_TYPES_BY_CATEGORY = {
  orders: ['order', 'orderItem'],
  registers: ['register', 'payment'],
  menuItems: ['menuItem'],
  workspace: [
    'workspace',
    'workspaceInvite',
    'membership',
    'shift',
    'schoolClass',
    'responsible',
    'student',
  ],
};

function parsePositiveInteger(value, fallback, maximum = Number.MAX_SAFE_INTEGER) {
  const parsedValue = Number(value);

  if (!Number.isSafeInteger(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(parsedValue, maximum);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getPeriodFilter(value) {
  const now = new Date();
  const period = value ?? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!/^\d{6}$/.test(period)) {
    return null;
  }

  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));

  if (month < 1 || month > 12) {
    return null;
  }

  return {
    $gte: new Date(year, month - 1, 1),
    $lt: new Date(year, month, 1),
  };
}

function serializeAuditLog(auditLog, ordersById, studentsById, responsiblesById) {
  const actorUser = auditLog.actor.userId;
  const changes = auditLog.changes ?? {};
  const order = ordersById.get(
    (changes.orderId ?? (auditLog.target.type === 'order' ? auditLog.target.id : null))?.toString(),
  );
  const student = studentsById.get(
    (
      changes.studentId ??
      order?.studentId ??
      (auditLog.target.type === 'student' ? auditLog.target.id : null)
    )?.toString(),
  );
  const responsible = responsiblesById.get(
    (
      changes.responsibleId ??
      student?.responsibleId ??
      (auditLog.target.type === 'responsible' ? auditLog.target.id : null)
    )?.toString(),
  );
  const targetName =
    (typeof changes.name === 'string' ? changes.name : changes.name?.to) ??
    (typeof changes.label === 'string' ? changes.label : changes.label?.to) ??
    changes.product?.label ??
    (auditLog.target.type === 'student' ? student?.name : null) ??
    (auditLog.target.type === 'responsible' ? responsible?.name : null) ??
    null;
  const itemLabels = Array.isArray(changes.items)
    ? changes.items.map((item) => item?.product?.label).filter(Boolean)
    : [];

  return {
    id: auditLog._id.toString(),
    actor: {
      userId: actorUser?._id?.toString() ?? null,
      email: actorUser?.email ?? null,
      role: auditLog.actor.role,
    },
    action: auditLog.action,
    target: {
      type: auditLog.target.type,
      id: auditLog.target.id.toString(),
    },
    changes: auditLog.changes,
    metadata: auditLog.metadata,
    context: {
      targetName,
      studentName: changes.studentName ?? student?.name ?? null,
      responsibleName: changes.responsibleName ?? responsible?.name ?? null,
      itemLabels,
    },
    createdAt: auditLog.createdAt,
  };
}

const fetchAuditLogsByType = async (req, res) => {
  const { workspaceId, type } = req.params;
  const targetTypes = TARGET_TYPES_BY_CATEGORY[type];

  if (!targetTypes) {
    return res.status(400).json({ message: 'Tipo de registro de auditoria invalido' });
  }

  const page = parsePositiveInteger(req.query.page, 1);
  const limit = parsePositiveInteger(req.query.limit, 10, 100);
  const search = String(req.query.search ?? '').trim();
  const periodFilter = getPeriodFilter(req.query.p);

  if (!periodFilter) {
    return res.status(400).json({ message: 'Periodo invalido' });
  }

  const filter = {
    workspaceId,
    'target.type': { $in: targetTypes },
    createdAt: periodFilter,
  };

  if (search) {
    const searchExpression = new RegExp(escapeRegExp(search), 'i');

    filter.$or = [
      { action: searchExpression },
      { 'actor.role': searchExpression },
      { 'target.type': searchExpression },
    ];
  }

  try {
    const [auditLogs, numberOfAuditLogs] = await Promise.all([
      AuditLog.find(filter)
        .populate({ path: 'actor.userId', select: 'email' })
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const totalPages = Math.max(1, Math.ceil(numberOfAuditLogs / limit));
    const nextPage = page < totalPages ? page + 1 : null;
    const orderIds = [
      ...new Set(
        auditLogs
          .map(
            (auditLog) =>
              auditLog.changes?.orderId ??
              (auditLog.target.type === 'order' ? auditLog.target.id : null),
          )
          .filter(Boolean)
          .map(String),
      ),
    ];
    const orders = orderIds.length
      ? await Order.find({ workspaceId, _id: { $in: orderIds } })
          .select('studentId')
          .lean()
      : [];
    const ordersById = new Map(orders.map((order) => [order._id.toString(), order]));
    const studentIds = [
      ...new Set(
        [
          ...auditLogs.map(
            (auditLog) =>
              auditLog.changes?.studentId ??
              (auditLog.target.type === 'student' ? auditLog.target.id : null),
          ),
          ...orders.map((order) => order.studentId),
        ]
          .filter(Boolean)
          .map(String),
      ),
    ];
    const students = studentIds.length
      ? await Student.find({ workspaceId, _id: { $in: studentIds } })
          .select('name responsibleId')
          .lean()
      : [];
    const studentsById = new Map(students.map((student) => [student._id.toString(), student]));
    const responsibleIds = [
      ...new Set(
        [
          ...auditLogs.map(
            (auditLog) =>
              auditLog.changes?.responsibleId ??
              (auditLog.target.type === 'responsible' ? auditLog.target.id : null),
          ),
          ...students.map((student) => student.responsibleId),
        ]
          .filter(Boolean)
          .map(String),
      ),
    ];
    const responsibles = responsibleIds.length
      ? await Responsible.find({ workspaceId, _id: { $in: responsibleIds } })
          .select('name')
          .lean()
      : [];
    const responsiblesById = new Map(
      responsibles.map((responsible) => [responsible._id.toString(), responsible]),
    );

    return res.json({
      auditLogs: auditLogs.map((auditLog) =>
        serializeAuditLog(auditLog, ordersById, studentsById, responsiblesById),
      ),
      pagination: {
        page,
        totalPages,
        nextPage,
      },
    });
  } catch {
    return res.status(500).json({ message: 'Erro ao buscar registros de auditoria' });
  }
};

module.exports = { fetchAuditLogsByType };
