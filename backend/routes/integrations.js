const router = require('express').Router();
const ctrl = require('../controllers/integrationsController');
const auth = require('../middleware/auth');

router.post('/webhook',            auth, ctrl.createWebhook);
router.get('/webhooks',             auth, ctrl.listWebhooks);
router.put('/webhooks/:id',         auth, ctrl.updateWebhook);
router.delete('/webhooks/:id',      auth, ctrl.deleteWebhook);
router.post('/webhooks/:id/test',   auth, ctrl.testWebhook);

module.exports = router;
