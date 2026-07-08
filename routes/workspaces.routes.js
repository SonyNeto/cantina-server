const router = require('express').Router();
const requireWorkspaceAccess = require('../middleware/requireWorkspaceAccess');
const { workspaceCreateLimiter, workspaceWriteLimiter } = require('../middleware/rateLimiters');
const workspacesController = require('../controllers/workspacesController');
const workspaceRoutes = require('./workspace.routes');

router.get('/', workspacesController.fetchUserWorkspaces);
router.post('/', workspaceCreateLimiter, workspacesController.postWorkspace);

router.get(
  '/:workspaceId/check-access',
  requireWorkspaceAccess,
  workspacesController.workspaceCheckAccess,
);

router.use('/:workspaceId', requireWorkspaceAccess, workspaceWriteLimiter, workspaceRoutes);

module.exports = router;
