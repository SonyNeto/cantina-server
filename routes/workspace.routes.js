const router = require('express').Router({ mergeParams: true });

const workspacesController = require('../controllers/workspacesController');
const invitesRoutes = require('./workspace/invites.routes');
const shiftsRoutes = require('./workspace/shifts.routes');
const schoolClassesRoutes = require('./workspace/schoolClasses.routes');
const responsiblesRoutes = require('./workspace/responsibles.routes');
const studentsRoutes = require('./workspace/students.routes');
const ordersRoutes = require('./workspace/orders.routes');
const menuItemsRoutes = require('./workspace/menuItems.routes');
const registersRoutes = require('./workspace/registers.routes');

router.get('/', workspacesController.fetchWorkspace);

router.use('/invites', invitesRoutes);
router.use('/shifts', shiftsRoutes);
router.use(schoolClassesRoutes);
router.use('/responsibles', responsiblesRoutes);
router.use(studentsRoutes);
router.use('/menu-items', menuItemsRoutes);
router.use(registersRoutes);
router.use(ordersRoutes);

module.exports = router;
