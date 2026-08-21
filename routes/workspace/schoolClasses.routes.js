const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const schoolClassesController = require('../../controllers/schoolClassesController');

router.get('/schoolClasses', requireWorkspaceAdmin, schoolClassesController.fetchAllSchoolClasses);
router.get(
  '/shifts/:shiftId/schoolClasses/:schoolClassId',
  schoolClassesController.fetchSchoolClass,
);
router.get('/shifts/:shiftId/schoolClasses', schoolClassesController.fetchSchoolClasses);
router.post(
  '/shifts/:shiftId/schoolClasses',
  requireWorkspaceAdmin,
  schoolClassesController.postSchoolClass,
);
router.delete(
  '/shifts/:shiftId/schoolClasses/:schoolClassId',
  requireWorkspaceAdmin,
  schoolClassesController.deleteSchoolClass,
);

module.exports = router;
