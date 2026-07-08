const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const schoolClassesController = require('../../controllers/schoolClassesController');

router.get('/classes', requireWorkspaceAdmin, schoolClassesController.fetchAllSchoolClasses);
router.get('/shifts/:shiftId/classes/:id', schoolClassesController.fetchSchoolClass);
router.get('/shifts/:shiftId/classes', schoolClassesController.fetchSchoolClasses);
router.post(
  '/shifts/:shiftId/classes',
  requireWorkspaceAdmin,
  schoolClassesController.postSchoolClass,
);

module.exports = router;
