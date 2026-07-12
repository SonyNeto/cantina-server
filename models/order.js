const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');
const productSchema = require('./schemas/product');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: productSchema,
    required: true,
  },
  status: {
    type: String,
    enum: ['cooking', 'ready'],
    required: true,
  },
});

const orderSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    created_at: {
      type: String,
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items) => items.length > 0,
        message: 'Pedido precisa ter pelo menos um item',
      },
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
