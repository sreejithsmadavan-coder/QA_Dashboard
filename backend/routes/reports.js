const express = require('express');
const router  = express.Router();
const { receivePlaywrightReport } = require('../controllers/reportController');

// No auth middleware here — the reporter runs from CI/local without a JWT.
// You can add a static API key check later if needed.

// POST /api/reports/playwright
router.post('/playwright', receivePlaywrightReport);

module.exports = router;
