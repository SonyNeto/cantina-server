const mongoose = require('mongoose');
const WorkspaceInvite = require('../models/workspaceInvite');
const Workspace = require('../models/workspace');
const Membership = require('../models/membership');
const crypto = require('node:crypto');
const { writeAuditLog } = require('../services/auditLogService');

function createTokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function postWorkspaceInvite(req, res) {
  const workspaceId = req.params.workspaceId;
  const session = await mongoose.startSession();

  try {
    const token = crypto.randomBytes(32).toString('hex');

    const role = req.body.role;

    const createdByUser = req.user;

    const exp = Date.now() + 1000 * 60 * 60 * 24; // 24 hours
    let workspaceInvite;

    await session.withTransaction(async () => {
      [workspaceInvite] = await WorkspaceInvite.create(
        [
          {
            workspaceId,
            tokenHash: createTokenHash(token),
            role,
            createdByUserId: createdByUser._id,
            expiresAt: new Date(exp),
            usedAt: null,
            usedByUserId: null,
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        action: 'workspaceInvite.created',
        targetType: 'workspaceInvite',
        targetId: workspaceInvite._id,
        changes: {
          role: workspaceInvite.role,
          createdByUserId: workspaceInvite.createdByUserId,
          expiresAt: workspaceInvite.expiresAt,
        },
        session,
      });
    });

    res.json({ token, role });
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    await session.endSession();
  }
}

async function fetchWorkspaceInvite(req, res) {
  const token = req.params.token;
  const workspaceInvite = await WorkspaceInvite.findOne({
    tokenHash: createTokenHash(token),
    usedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (!workspaceInvite) {
    return res.sendStatus(404);
  }

  const workspaceId = workspaceInvite.workspaceId;
  const workspace = await Workspace.findOne({ _id: workspaceId });

  if (!workspace) {
    return res.sendStatus(404);
  }

  res.json({ workspaceName: workspace.name, workspaceId, role: workspaceInvite.role });
}

async function postWorkspaceInviteResponse(req, res) {
  const user = req.user;
  const token = req.params.token;
  const session = await mongoose.startSession();

  try {
    let workspaceInvite;
    let membership;

    await session.withTransaction(async () => {
      workspaceInvite = await WorkspaceInvite.findOneAndUpdate(
        {
          tokenHash: createTokenHash(token),
          usedAt: null,
          expiresAt: { $gt: new Date() },
        },
        {
          usedAt: new Date(),
          usedByUserId: user._id,
        },
        {
          new: true,
          session,
        },
      );

      if (!workspaceInvite) {
        const error = new Error('Convite nao encontrado');
        error.status = 404;
        throw error;
      }

      membership = await Membership.findOneAndUpdate(
        {
          userId: user._id,
          workspaceId: workspaceInvite.workspaceId,
        },
        {
          $setOnInsert: {
            userId: user._id,
            workspaceId: workspaceInvite.workspaceId,
            role: workspaceInvite.role,
          },
        },
        {
          upsert: true,
          new: true,
          session,
        },
      );

      await writeAuditLog({
        req,
        workspaceId: workspaceInvite.workspaceId,
        actorRole: membership.role,
        action: 'workspaceInvite.accepted',
        targetType: 'workspaceInvite',
        targetId: workspaceInvite._id,
        changes: {
          role: workspaceInvite.role,
          usedByUserId: user._id,
          membershipId: membership._id,
        },
        session,
      });
    });

    res.sendStatus(200);
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao aceitar convite',
    });
  } finally {
    await session.endSession();
  }
}

module.exports = {
  postWorkspaceInvite,
  fetchWorkspaceInvite,
  postWorkspaceInviteResponse,
};
