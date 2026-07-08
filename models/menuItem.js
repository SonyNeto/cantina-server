const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const menuItemSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
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
    toJSON: toJSONOptions(),
  },
);

const MenuItem = mongoose.model('MenuItem', menuItemSchema);

module.exports = MenuItem;
