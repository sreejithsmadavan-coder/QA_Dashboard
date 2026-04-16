const router = require('express').Router();
const ctrl = require('../controllers/flakinessController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.getFlakinessData);

module.exports = router;
