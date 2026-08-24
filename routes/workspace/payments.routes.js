const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const paymentsController = require('../../controllers/paymentsController');

router.get('/payments', requireWorkspaceAdmin, paymentsController.fetchPayments);
router.get('/payments/:id', requireWorkspaceAdmin, paymentsController.fetchPayment);
router.get(
  '/responsibles/:responsibleId/payments',
  requireWorkspaceAdmin,
  paymentsController.fetchPaymentsByResponsible,
);
router.post(
  '/responsibles/:responsibleId/payments',
  requireWorkspaceAdmin,
  paymentsController.postPayment,
);

module.exports = router;
