const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const membershipsController = require('../../controllers/membershipsController');

router.get('/', requireWorkspaceAdmin, membershipsController.fetchMemberships);

module.exports = router;
