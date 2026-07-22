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

const Register = mongoose.model('Register', registerSchema);

module.exports = Register;
