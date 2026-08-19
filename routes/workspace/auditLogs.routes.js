const router = require('express').Router({ mergeParams: true });
const auditLogsController = require('../../controllers/auditLogsController');
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');

router.get('/:type', requireWorkspaceAdmin, auditLogsController.fetchAuditLogsByType);

module.exports = router;
