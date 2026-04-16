const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/reportExportController');

// Export endpoints (auth required)
router.get('/export/bugs',          auth, ctrl.exportBugs);
router.get('/export/test-summary',  auth, ctrl.testSummary);
router.get('/export/sprint-report', auth, ctrl.sprintReport);

// Scheduled reports (auth required)
router.post('/schedule',            auth, ctrl.createSchedule);
router.get('/schedules',            auth, ctrl.listSchedules);
router.delete('/schedules/:id',     auth, ctrl.deleteSchedule);

module.exports = router;
