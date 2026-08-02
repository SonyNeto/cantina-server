const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  workspaceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Workspace',
    required: true,
    index: true,
    immutable: true,
  },

  actor: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      required: true,
    },
  },

  action: {
    type: String,
    required: true,
    index: true,
  },

  target: {
    type: {
      type: String,
      required: true,
    },
    id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
  },

  changes: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined,
  },

  metadata: {
    eventId: String,
    ip: String,
    userAgent: String,
  },

  createdAt: {
    type: Date,
    default: Date.now,
    immutable: true,
    index: true,
  },
});

auditLogSchema.index({ workspaceId: 1, createdAt: -1 });
auditLogSchema.index({ workspaceId: 1, action: 1, createdAt: -1 });
auditLogSchema.index({
  workspaceId: 1,
  'target.type': 1,
  'target.id': 1,
  createdAt: -1,
});

module.exports = mongoose.model('AuditLog', auditLogSchema);
