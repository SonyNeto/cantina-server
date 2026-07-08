const Workspace = require('../models/workspace');
const Membership = require('../models/membership');

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

  const workspace = await Workspace.create({
    name,
    ownerId: user._id,
  });

  const membership = await Membership.create({
    userId: user._id,
    workspaceId: workspace._id,
    role: 'owner',
  });

  res.json({ workspace, membership });
}

function workspaceCheckAccess(req, res) {
  try {
    res.sendStatus(200);
  } catch {
    res.sendStatus(400);
  }
}

module.exports = {
  fetchWorkspace,
  fetchUserWorkspaces,
  postWorkspace,
  workspaceCheckAccess,
};
