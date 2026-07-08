const router = require('express').Router({ mergeParams: true });
const requireWorkspaceAdmin = require('../../middleware/requireWorkspaceAdmin');
const menuItemsController = require('../../controllers/menuItemsController');

router.get('/:id', menuItemsController.fetchMenuItem);
router.get('/', menuItemsController.fetchMenuItems);
router.post('/', requireWorkspaceAdmin, menuItemsController.postMenuItem);
router.patch('/:id', requireWorkspaceAdmin, menuItemsController.updateMenuItem);
router.delete('/:id', requireWorkspaceAdmin, menuItemsController.deleteMenuItem);

module.exports = router;
