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
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: 'O saldo deve ser informado em centavos',
      },
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const Responsible = mongoose.model('Responsible', responsibleSchema);

module.exports = Responsible;
