const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/cicdController');

// Webhook — uses API key (X-API-Key header), no JWT
router.post('/webhooks/ci-result', ctrl.receiveCIResult);

// API key management — JWT auth required
router.get('/cicd/api-keys',       auth, ctrl.listApiKeys);
router.post('/cicd/api-keys',      auth, ctrl.generateApiKey);
router.delete('/cicd/api-keys/:id', auth, ctrl.revokeApiKey);

module.exports = router;
