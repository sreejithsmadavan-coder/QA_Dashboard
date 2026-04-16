const router = require('express').Router();
const ctrl = require('../controllers/authController');
const auth = require('../middleware/auth');

router.post('/login',           ctrl.login);
router.post('/register',        ctrl.register);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/verify-otp',      ctrl.verifyOtp);
router.post('/reset-password',  ctrl.resetPassword);
router.get('/me',               auth, ctrl.me);
router.put('/profile',          auth, ctrl.updateProfile);
router.put('/change-password',  auth, ctrl.changePassword);

module.exports = router;
