const router = require('express').Router();
const ctrl = require('../controllers/testCaseController');
const auth = require('../middleware/auth');

router.get('/',                  auth, ctrl.getAll);
router.get('/category-summary',  auth, ctrl.getCategorySummary);
router.get('/detailed-analysis', auth, ctrl.getDetailedAnalysis);
router.get('/executions',        auth, ctrl.getExecutions);
router.get('/execution-summary', auth, ctrl.getExecutionSummary);
router.post('/',                 auth, ctrl.create);
router.put('/:id',               auth, ctrl.update);
router.delete('/:id',            auth, ctrl.delete);
router.post('/executions',       auth, ctrl.createExecution);

module.exports = router;
