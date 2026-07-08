const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const workspaceInviteSchema = new mongoose.Schema(
  {
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['member', 'admin'],
      default: 'member',
    },
    createdByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      require: true,
    },
    expiresAt: {
      type: Date,
      require: true,
      index: true,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    usedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

const WorkspaceInvite = mongoose.model('WorkspaceInvite', workspaceInviteSchema);

module.exports = WorkspaceInvite;
