const mongoose = require('mongoose');
const Workspace = require('../models/workspace');
const Membership = require('../models/membership');
const { writeAuditLog } = require('../services/auditLogService');

async function fetchWorkspace(req, res) {
  const workspaceId = req.params.workspaceId;

  const workspace = await Workspace.findById(workspaceId);

  if (!workspace) {
    return res.sendStatus(404);
  }

  res.json({ workspace });
}

async function fetchUserWorkspaces(req, res) {
  const user = req.user;

  if (user.isSystemAdmin) {
    const workspaces = await Workspace.find();

    const workspacesWithRole = workspaces.map((workspace) => ({
      id: workspace._id.toString(),
      name: workspace.name,
      role: 'systemAdmin',
    }));

    return res.json({ workspaces: workspacesWithRole });
  }

  const memberships = await Membership.find({ userId: user._id });

  const workspacesIds = memberships.map((membership) => membership.workspaceId);

  const workspaces = await Workspace.find({ _id: { $in: workspacesIds } });

  const membershipByWorkspaceId = new Map(
    memberships.map((membership) => [membership.workspaceId.toString(), membership]),
  );

  const workspacesWithRole = workspaces.map((workspace) => {
    const membership = membershipByWorkspaceId.get(workspace._id.toString());

    return {
      id: workspace._id.toString(),
      name: workspace.name,
      role: membership.role,
    };
  });

  res.json({ workspaces: workspacesWithRole });
}

async function postWorkspace(req, res) {
  const user = req.user;
  const name = req.body.name;
  const session = await mongoose.startSession();

  try {
    let workspace;
    let membership;

    await session.withTransaction(async () => {
      [workspace] = await Workspace.create(
        [
          {
            name,
            ownerId: user._id,
          },
        ],
        { session },
      );

      [membership] = await Membership.create(
        [
          {
            userId: user._id,
            workspaceId: workspace._id,
            role: 'owner',
          },
        ],
        { session },
      );

      await writeAuditLog({
        req,
        workspaceId: workspace._id,
        actorRole: 'owner',
        action: 'workspace.created',
        targetType: 'workspace',
        targetId: workspace._id,
        changes: {
          name: workspace.name,
          ownerId: workspace.ownerId,
          membershipId: membership._id,
        },
        session,
      });
    });

    res.json({ workspace, membership });
  } catch (error) {
    const status = error.status ?? 500;

    res.status(status).json({
      message: status < 500 ? error.message : 'Erro ao criar workspace',
    });
  } finally {
    await session.endSession();
  }
}

function workspaceCheckAccess(req, res) {
  try {
    res.sendStatus(200);
  } catch {
    res.status(500).json({ message: 'Erro ao verificar workspace' });
  }
}

module.exports = {
  fetchWorkspace,
  fetchUserWorkspaces,
  postWorkspace,
  workspaceCheckAccess,
};
