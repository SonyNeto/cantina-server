const mongoose = require('mongoose');
const Payment = require('../models/payment');
const Responsible = require('../models/responsible');
const { writeAuditLog } = require('../services/auditLogService');
const { appError } = require('../utils/functions');

function getPeriodFilter(query) {
  const now = new Date();
  const period = query.p ?? `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  if (!/^\d{6}$/.test(period)) {
    throw appError('Periodo invalido');
  }

  const year = Number(period.slice(0, 4));
  const month = Number(period.slice(4, 6));

  if (month < 1 || month > 12) {
    throw appError('Periodo invalido');
  }

  return {
    created_at: {
      $gte: new Date(year, month - 1, 1),
      $lt: new Date(year, month, 1),
    },
  };
}

function parsePaymentDate(value) {
  if (value === undefined) return new Date();

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw appError('Data de pagamento invalida');
  }

  return date;
}

const fetchPayment = async (req, res) => {
  const { workspaceId, id } = req.params;
  const payment = await Payment.findOne({ workspaceId, _id: id });

  if (!payment) {
    return res.status(404).json({ message: 'Pagamento nao encontrado' });
  }

  res.json({ payment });
};

const fetchPayments = async (req, res) => {
  const { workspaceId } = req.params;
  let periodFilter;

  try {
    periodFilter = getPeriodFilter(req.query);
  } catch (error) {
    return res.status(error.status ?? 400).json({ message: error.message });
  }

  const payments = await Payment.find({ workspaceId, ...periodFilter }).sort({
    created_at: -1,
    _id: -1,
  });

  res.json({ payments });
};

const fetchPaymentsByResponsible = async (req, res) => {
  const { workspaceId, responsibleId } = req.params;
  let periodFilter;

  try {
    periodFilter = getPeriodFilter(req.query);
  } catch (error) {
    return res.status(error.status ?? 400).json({ message: error.message });
  }

  const responsibleExists = await Responsible.exists({ workspaceId, _id: responsibleId });

  if (!responsibleExists) {
    return res.status(404).json({ message: 'Responsavel nao encontrado' });
  }

  const payments = await Payment.find({
    workspaceId,
    responsibleId,
    ...periodFilter,
  }).sort({ created_at: -1, _id: -1 });

  res.json({ payments });
};

const postPayment = async (req, res) => {
  const { workspaceId, responsibleId } = req.params;
  const { payment: paymentValue, created_at } = req.body;

  if (!Number.isSafeInteger(paymentValue) || paymentValue <= 0) {
    return res.status(400).json({ message: 'O pagamento deve ser informado em centavos' });
  }

  let paymentDate;

  try {
    paymentDate = parsePaymentDate(created_at);
  } catch (error) {
    return res.status(error.status ?? 400).json({ message: error.message });
  }

  const session = await mongoose.startSession();

  try {
    let payment;
    let responsible;

    await session.withTransaction(async () => {
      responsible = await Responsible.findOne({ workspaceId, _id: responsibleId }).session(session);

      if (!responsible) {
        throw appError('Responsavel nao encontrado', 404);
      }

      const previousBalance = responsible.balance;
      responsible.balance += paymentValue;
      await responsible.save({ session });

      [payment] = await Payment.create(
        [
          {
            workspaceId,
            responsibleId,
            created_at: paymentDate,
            payment: paymentValue,
            type: 'balance',
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'payment.created',
        targetType: 'payment',
        targetId: payment._id,
        changes: {
          responsibleId: responsible._id,
          responsibleName: responsible.name,
          payment: payment.payment,
          type: payment.type,
          created_at: payment.created_at,
          balance: {
            from: previousBalance,
            to: responsible.balance,
          },
        },
        session,
      });
    });

    res.status(201).json({ payment, responsible });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar pagamento',
    });
  } finally {
    await session.endSession();
  }
};

module.exports = {
  fetchPayment,
  fetchPayments,
  fetchPaymentsByResponsible,
  postPayment,
};
