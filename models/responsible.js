const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const responsibleSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const Responsible = mongoose.model('Responsible', responsibleSchema);

module.exports = Responsible;
