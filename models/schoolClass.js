const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const schoolClassSchema = new mongoose.Schema(
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
    shiftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Shift',
      required: true,
    },
    order: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const SchoolClass = mongoose.model('SchoolClass', schoolClassSchema);

module.exports = SchoolClass;
