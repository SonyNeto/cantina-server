const router = require('express').Router({ mergeParams: true });
const ordersController = require('../../controllers/ordersController');

router.get('/orders/status/:status', ordersController.fetchOrdersByStatus);
router.get('/orders/items', ordersController.fetchOrdersWithDetails);
router.get('/orders/:id', ordersController.fetchOrder);
router.get('/orders', ordersController.fetchOrders);
router.get('/students/:studentId/orders', ordersController.fetchOrdersByStudent);
router.post('/orders', ordersController.postOrders);
router.patch('/orders/:id/status', ordersController.updateOrderStatus);
router.delete('/orders/:id', ordersController.deleteOrder);

module.exports = router;
