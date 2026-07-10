const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const studentsController = require('../../controllers/studentsController');

router.get('/students', requireWorkspaceAdmin, studentsController.fetchAllStudents);
router.get(
  '/responsibles/:responsibleId/students/:id',
  requireWorkspaceAdmin,
  studentsController.fetchStudent,
);
router.get(
  '/responsibles/:responsibleId/students',
  requireWorkspaceAdmin,
  studentsController.fetchStudents,
);
router.get('/shifts/:shiftId/classes/:classId/students', studentsController.fetchStudentsByClass);
router.post(
  '/responsibles/:responsibleId/students',
  requireWorkspaceAdmin,
  studentsController.postStudent,
);
router.patch(
  '/responsibles/:responsibleId/students/:id',
  requireWorkspaceAdmin,
  studentsController.updateStudent,
);
router.delete(
  '/responsibles/:responsibleId/students/:id',
  requireWorkspaceAdmin,
  studentsController.deleteStudent,
);

module.exports = router;
