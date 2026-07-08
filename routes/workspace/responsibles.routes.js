const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const responsiblesController = require('../../controllers/responsiblesController');

router.get('/:id', requireWorkspaceAdmin, responsiblesController.fetchResponsible);
router.get('/', requireWorkspaceAdmin, responsiblesController.fetchResponsibles);
router.post('/', requireWorkspaceAdmin, responsiblesController.postResponsible);

module.exports = router;
