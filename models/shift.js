const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const shiftSchema = new mongoose.Schema(
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
  },
  {
    toJSON: toJSONOptions(),
  },
);

const Shift = mongoose.model('Shift', shiftSchema);

module.exports = Shift;
