const router = require('express').Router();
const { inviteResponseLimiter } = require('../middleware/rateLimiters');
const workspaceInvitesController = require('../controllers/workspaceInvitesController');

router.get('/:token', workspaceInvitesController.fetchWorkspaceInvite);
router.post(
  '/:token',
  inviteResponseLimiter,
  workspaceInvitesController.postWorkspaceInviteResponse,
);

module.exports = router;
