const router = require('express').Router();
const ctrl = require('../controllers/qaAgentController');
const auth = require('../middleware/auth');

// Config (per-user, single row)
router.get('/config',    auth, ctrl.getConfig);
router.put('/config',    auth, ctrl.upsertConfig);
router.delete('/config', auth, ctrl.deleteConfig);

// Crawl (BFS link discovery for a URL — used to seed test case generation)
router.post('/crawl',    auth, ctrl.crawlSite);

// Runs (history)
router.get('/runs',        auth, ctrl.listRuns);
router.post('/runs',       auth, ctrl.createRun);
router.delete('/runs',     auth, ctrl.clearRuns);
router.get('/runs/:id',    auth, ctrl.getRun);
router.delete('/runs/:id', auth, ctrl.deleteRun);

module.exports = router;
