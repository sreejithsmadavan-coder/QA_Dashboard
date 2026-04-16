const router = require('express').Router();
const ctrl = require('../controllers/chatController');
const auth = require('../middleware/auth');

// Chat
router.post('/',                    auth, ctrl.chat);
router.get('/stats',                auth, ctrl.quickStats);
router.get('/daily-digest',         auth, ctrl.dailyDigest);

// Chat history (SQL)
router.get('/history',              auth, ctrl.getHistory);
router.get('/history/:sessionId',   auth, ctrl.getSessionHistory);
router.delete('/history',           auth, ctrl.deleteHistory);

// Notifications (SQL)
router.get('/notifications',        auth, ctrl.getNotifications);
router.get('/notifications/unread-count', auth, ctrl.getUnreadCount);
router.put('/notifications/:id/read', auth, ctrl.markNotificationRead);

// Audit logs (SQL)
router.get('/audit-logs',           auth, ctrl.getAuditLogs);

module.exports = router;
