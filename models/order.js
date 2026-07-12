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

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MenuItem',
    required: true,
  },
  product: {
    type: productSchema,
    required: true,
  },
  status: {
    type: String,
    enum: ['cooking', 'ready'],
    required: true,
  },
  total: {
    type: Number,
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
