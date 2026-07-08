const Membership = require('../models/membership');

async function requireWorkspaceAccess(req, res, next) {
  try {
    const { workspaceId } = req.params;

    if (req.user.isSystemAdmin) {
      return next();
    }

    const membership = await Membership.findOne({
      userId: req.user._id,
      workspaceId,
    });

    if (!membership) {
      return res.sendStatus(403);
    }

    req.membership = membership;
    next();
  } catch {
    return res.sendStatus(403);
  }
}

module.exports = requireWorkspaceAccess;
