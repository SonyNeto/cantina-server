const router = require('express').Router({ mergeParams: true });
const ordersController = require('../../controllers/ordersController');

router.get('/orders/status/:status', ordersController.fetchOrdersByStatus);
router.get('/orders/:id', ordersController.fetchOrder);
router.get('/orders', ordersController.fetchOrders);
router.get('/students/:studentId/orders', ordersController.fetchOrdersByStudent);
router.post('/orders', ordersController.postOrder);
router.patch('/orders/:orderId/items/:itemId/status', ordersController.updateOrderItemStatus);
router.post('/orders/:orderId/items/:itemId/register', ordersController.registerOrderItem);
router.delete('/orders/:orderId/items/:itemId', ordersController.deleteOrderItem);

module.exports = router;
