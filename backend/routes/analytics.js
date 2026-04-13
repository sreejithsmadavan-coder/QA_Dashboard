const router = require('express').Router();
const ctrl = require('../controllers/analyticsController');
const auth = require('../middleware/auth');

router.get('/dashboard',       auth, ctrl.getDashboardStats);
router.get('/sprints',         auth, ctrl.getSprintOverview);
router.get('/activity',        auth, ctrl.getActivityFeed);

module.exports = router;
