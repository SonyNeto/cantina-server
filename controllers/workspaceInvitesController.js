const WorkspaceInvite = require('../models/workspaceInvite');
const Workspace = require('../models/workspace');
const Membership = require('../models/membership');
const crypto = require('node:crypto');

function createTokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function postWorkspaceInvite(req, res) {
  const workspaceId = req.params.workspaceId;

  const token = crypto.randomBytes(32).toString('hex');

  const role = req.body.role;

  const createdByUser = req.user;

  const exp = Date.now() + 1000 * 60 * 60 * 24; // 24 hours

  await WorkspaceInvite.create({
    workspaceId,
    tokenHash: createTokenHash(token),
    role,
    createdByUserId: createdByUser._id,
    expiresAt: new Date(exp),
    usedAt: null,
    usedByUserId: null,
  });

  res.json({ token, role });
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

  const workspaceInvite = await WorkspaceInvite.findOneAndUpdate(
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
    },
  );

  if (!workspaceInvite) {
    return res.sendStatus(404);
  }

  await Membership.findOneAndUpdate(
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
    },
  );

  res.sendStatus(200);
}

module.exports = {
  postWorkspaceInvite,
  fetchWorkspaceInvite,
  postWorkspaceInviteResponse,
};
