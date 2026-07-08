const router = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const usersController = require('../controllers/usersController');
const { loginLimiter, signupLimiter } = require('../middleware/rateLimiters');

router.post('/signup', signupLimiter, usersController.signup);
router.post('/login', loginLimiter, usersController.login);
router.get('/logout', requireAuth, usersController.logout);
router.get('/check-auth', requireAuth, usersController.checkAuth);
router.get('/me', requireAuth, usersController.me);

module.exports = router;
