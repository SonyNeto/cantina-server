const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const paymentSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    created_at: {
      type: Date,
      required: true,
      index: true,
    },
    payment: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'O pagamento deve ser informado em centavos',
      },
    },
    responsibleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Responsible',
      required: true,
    },
    type: {
      type: String,
      enum: ['manual', 'order'],
      required: true,
    },
    sourceOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: false,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

paymentSchema.index({
  workspaceId: 1,
});

paymentSchema.index(
  {
    workspaceId: 1,
    sourceOrderId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      sourceOrderId: { $type: 'objectId' },
    },
  },
);

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
