const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const registersController = require('../../controllers/registersController');

router.get(
  '/registers/responsibles',
  requireWorkspaceAdmin,
  registersController.fetchResponsiblesRegisters,
);
router.get('/registers', requireWorkspaceAdmin, registersController.fetchRegisters);
router.get('/registers/summary', requireWorkspaceAdmin, registersController.fetchRegistersSummary);
router.get('/registers/:id', requireWorkspaceAdmin, registersController.fetchRegister);
router.get(
  '/students/:studentId/registers',
  requireWorkspaceAdmin,
  registersController.fetchRegistersByStudent,
);
router.get(
  '/responsibles/:responsibleId/registers',
  requireWorkspaceAdmin,
  registersController.fetchRegistersByResponsible,
);
router.patch(
  '/registers/:id/payment',
  requireWorkspaceAdmin,
  registersController.updateRegisterPayment,
);
module.exports = router;
