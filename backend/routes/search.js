const router = require('express').Router();
const ctrl = require('../controllers/searchController');
const auth = require('../middleware/auth');

router.get('/', auth, ctrl.globalSearch);

module.exports = router;
