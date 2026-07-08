const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const Workspace = mongoose.model('Workspace', workspaceSchema);

module.exports = Workspace;
