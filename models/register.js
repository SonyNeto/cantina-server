const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
  },
  {
    _id: false,
    id: false,
  },
);

const registerSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
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
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const Register = mongoose.model('Register', registerSchema);

module.exports = Register;
