const router = require('express').Router();
const ctrl = require('../controllers/uploadController');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');

router.post('/import', auth, upload.single('file'), ctrl.uploadFile);
router.post('/preview', auth, upload.single('file'), ctrl.parsePreview);

module.exports = router;
