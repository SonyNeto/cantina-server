const mongoose = require('mongoose');
const toJSONOptions = require('./utils/toJSONOptions');

const membershipSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    workspaceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Workspace',
      required: true,
    },
    role: {
      type: String,
      enum: ['member', 'admin', 'owner'],
      default: 'member',
    },
  },
  {
    toJSON: toJSONOptions(),
  },
);

membershipSchema.index({ userId: 1, workspaceId: 1 }, { unique: true });

const Membership = mongoose.model('Membership', membershipSchema);

module.exports = Membership;
