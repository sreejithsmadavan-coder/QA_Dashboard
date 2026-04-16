const express        = require('express');
const router         = express.Router();
const auth           = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const ctrl           = require('../controllers/adminController');

// All admin routes require auth + Admin role
router.get('/users',             auth, requireRole('Admin'), ctrl.listUsers);
router.put('/users/:id/role',    auth, requireRole('Admin'), ctrl.updateRole);
router.put('/users/:id/status',  auth, requireRole('Admin'), ctrl.updateStatus);
router.get('/stats',             auth, requireRole('Admin'), ctrl.systemStats);

module.exports = router;
