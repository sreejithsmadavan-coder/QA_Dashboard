const router = require('express').Router();
const { ActivityLog } = require('../models');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await ActivityLog.findAll({ order: [['createdAt','DESC']], limit });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
