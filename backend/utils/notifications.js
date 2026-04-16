const { Notification, User } = require('../models');

/**
 * Notification types:
 *   bug_assigned, bug_created, bug_resolved,
 *   test_failed, test_run_complete,
 *   project_update, meeting_reminder, system
 */

/**
 * Create a notification in the DB and push it in real-time via Socket.io.
 *
 * @param {object} io          - Socket.io server instance
 * @param {object} opts
 * @param {number} opts.userId     - recipient user id
 * @param {string} opts.type       - notification type (see list above)
 * @param {string} opts.title      - short title
 * @param {string} opts.message    - body text
 * @param {string} [opts.icon]     - icon character
 * @param {string} [opts.iconColor]- CSS color / var
 * @param {string} [opts.link]     - in-app link
 * @param {string} [opts.entityType] - e.g. 'bug', 'project'
 * @param {number} [opts.entityId]
 * @param {object} [opts.metadata] - arbitrary JSON payload
 * @returns {Promise<object>}      - created Notification row
 */
async function createNotification(io, {
  userId,
  type,
  title,
  message,
  icon = '●',
  iconColor = 'var(--lime)',
  link = null,
  entityType = null,
  entityId = null,
  metadata = null,
}) {
  try {
    const notif = await Notification.create({
      userId,
      type,
      title,
      message,
      icon,
      iconColor,
      read: false,
      link,
      entityType,
      entityId,
      metadata,
    });

    // Push to the specific user's room
    if (io) {
      io.to(`user:${userId}`).emit('notification:new', notif);
    }

    return notif;
  } catch (err) {
    console.error('createNotification error:', err.message);
    return null;
  }
}

/**
 * Send a notification to every user in the system (e.g. project-wide alerts).
 * Useful for bug_created notifications that should reach all team members.
 */
async function notifyAllUsers(io, opts) {
  try {
    const users = await User.findAll({ attributes: ['id'], where: { isActive: true } });
    const results = [];
    for (const user of users) {
      if (user.id === opts.excludeUserId) continue; // don't notify the actor
      const notif = await createNotification(io, { ...opts, userId: user.id });
      if (notif) results.push(notif);
    }
    return results;
  } catch (err) {
    console.error('notifyAllUsers error:', err.message);
    return [];
  }
}

module.exports = { createNotification, notifyAllUsers };
