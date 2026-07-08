function requireWorkspaceAdmin(req, res, next) {
  if (req.user.isSystemAdmin) {
    return next();
  }

  const role = req.membership?.role;

  if (role !== 'admin' && role !== 'owner') {
    return res.sendStatus(403);
  }

  next();
}

module.exports = requireWorkspaceAdmin;
