const AuditLog = require('../models/auditLog');
const crypto = require('crypto');

async function writeAuditLog({
  req,
  workspaceId,
  actorRole,
  action,
  targetType,
  targetId,
  changes,
  metadata,
  session,
}) {
  const role = actorRole ?? (req.user.isSystemAdmin ? 'systemAdmin' : req.membership?.role);

  await AuditLog.create(
    [
      {
        workspaceId: workspaceId ?? req.params.workspaceId,
        actor: {
          userId: req.user._id,
          role,
        },
        action,
        target: {
          type: targetType,
          id: targetId,
        },
        changes,
        metadata: {
          eventId: crypto.randomUUID(),
          ip: req.ip,
          userAgent: req.get('user-agent'),
          ...metadata,
        },
      },
    ],
    { session },
  );
}

module.exports = { writeAuditLog };
