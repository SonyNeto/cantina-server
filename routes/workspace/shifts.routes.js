const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const shiftsController = require('../../controllers/shiftsController');

router.get('/:id', shiftsController.fetchShift);
router.get('/', shiftsController.fetchShifts);
router.post('/', requireWorkspaceAdmin, shiftsController.postShift);

module.exports = router;
