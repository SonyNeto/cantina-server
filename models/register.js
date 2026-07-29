const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');
const productSchema = require('./schemas/product');

const registerSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    sourceOrderItemId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    product: {
      type: productSchema,
      required: true,
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
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

registerSchema.index(
  {
    workspaceId: 1,
    sourceOrderItemId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      sourceOrderItemId: { $type: 'objectId' },
    },
  },
);

const Register = mongoose.model('Register', registerSchema);

module.exports = Register;
