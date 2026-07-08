const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const workspaceInvitesController = require('../../controllers/workspaceInvitesController');

router.post('/', requireWorkspaceAdmin, workspaceInvitesController.postWorkspaceInvite);

module.exports = router;
