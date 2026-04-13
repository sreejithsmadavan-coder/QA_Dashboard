const router = require('express').Router();
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login',           ctrl.login);
router.post('/register',        ctrl.register);
router.get('/me',               auth, ctrl.me);
router.put('/profile',          auth, ctrl.updateProfile);
router.put('/change-password',  auth, ctrl.changePassword);

module.exports = router;
