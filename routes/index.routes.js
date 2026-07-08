const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');

const authRoutes = require('./auth.routes');
const invitesRoutes = require('./invites.routes');
const workspacesRoutes = require('./workspaces.routes');

router.use(authRoutes);

router.use(requireAuth);
router.use('/invites', invitesRoutes);
router.use('/workspaces', workspacesRoutes);

module.exports = router;
