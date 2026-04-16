const express = require('express');
const router  = express.Router();
const auth    = require('../middleware/auth');
const ctrl    = require('../controllers/tagController');

// Tag CRUD
router.get('/',       auth, ctrl.listTags);
router.post('/',      auth, ctrl.createTag);
router.delete('/:id', auth, ctrl.deleteTag);


module.exports = router;
