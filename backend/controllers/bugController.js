const { Bug, Project, ActivityLog, User } = require('../models');
const { broadcast, emitToProject } = require('../socket/handlers');
const { createNotification, notifyAllUsers } = require('../utils/notifications');

exports.getAll = async (req, res) => {
  try {
    const { projectId, severity, status } = req.query;
    const where = {};
    if (projectId) where.projectId = projectId;
    if (severity)  where.severity  = severity;
    if (status)    where.status    = status;

    const bugs = await Bug.findAll({ where, include: [{ model: Project, as: 'project', attributes: ['id','name'] }], order: [['createdAt','DESC']] });
    res.json(bugs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const bug = await Bug.findByPk(req.params.id, { include: [{ model: Project, as: 'project' }] });
    if (!bug) return res.status(404).json({ error: 'Bug not found' });
    res.json(bug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { projectId, title, description, severity, reporter, assignee } = req.body;
    const bug = await Bug.create({ projectId, title, description, severity: severity || 'Medium', reporter, assignee, status: 'Open' });

    await ActivityLog.create({
      action: `Bug opened: ${title} [${severity}]`,
      entityType: 'bug', entityId: bug.id,
      icon: '+', iconColor: 'var(--rd)',
    });

    emitToProject(req.io, projectId, 'bug:created', bug);
    broadcast(req.io, 'activity:new', { action: `Bug opened: ${title}`, icon: '+', iconColor: 'var(--rd)', time: 'just now' });

    // ── Notifications ──────────────────────────────────────────────────────
    const project = await Project.findByPk(projectId, { attributes: ['name'] });
    const projectName = project ? project.name : `Project #${projectId}`;
    const actorId = req.user ? req.user.id : null;

    // Notify all active users about the new bug (except the reporter)
    notifyAllUsers(req.io, {
      excludeUserId: actorId,
      type: 'bug_created',
      title: 'New Bug Reported',
      message: `[${severity || 'Medium'}] ${title} in ${projectName}`,
      icon: '+',
      iconColor: 'var(--rd)',
      link: `/projects/${projectId}?tab=bugs`,
      entityType: 'bug',
      entityId: bug.id,
    }).catch(err => console.error('bug_created notification error:', err.message));

    // If an assignee is specified, send them a dedicated assignment notification
    if (assignee) {
      const assigneeUser = await User.findOne({ where: { firstName: assignee }, attributes: ['id'] })
        .catch(() => null);
      if (assigneeUser) {
        createNotification(req.io, {
          userId: assigneeUser.id,
          type: 'bug_assigned',
          title: 'Bug Assigned to You',
          message: `[${severity || 'Medium'}] ${title} in ${projectName}`,
          icon: '⊕',
          iconColor: 'var(--am)',
          link: `/projects/${projectId}?tab=bugs`,
          entityType: 'bug',
          entityId: bug.id,
        }).catch(err => console.error('bug_assigned notification error:', err.message));
      }
    }

    res.status(201).json(bug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const bug = await Bug.findByPk(req.params.id);
    if (!bug) return res.status(404).json({ error: 'Bug not found' });

    const { title, description, severity, status, assignee } = req.body;
    const prevStatus = bug.status;
    const prevAssignee = bug.assignee;
    await bug.update({ title, description, severity, status, assignee });

    if (status && status !== prevStatus) {
      await ActivityLog.create({
        action: `Bug ${status === 'Resolved' ? 'resolved' : 'updated'}: ${bug.title}`,
        entityType: 'bug', entityId: bug.id,
        icon: status === 'Resolved' ? '✓' : '✏',
        iconColor: status === 'Resolved' ? 'var(--lime)' : 'var(--cy)',
      });
      broadcast(req.io, 'activity:new', {
        action: `Bug ${status}: ${bug.title}`,
        icon: '✓', iconColor: 'var(--lime)', time: 'just now',
      });
    }

    // ── Notification: assignee changed ─────────────────────────────────────
    if (assignee && assignee !== prevAssignee) {
      const assigneeUser = await User.findOne({ where: { firstName: assignee }, attributes: ['id'] })
        .catch(() => null);
      if (assigneeUser) {
        const project = await Project.findByPk(bug.projectId, { attributes: ['name'] });
        const projectName = project ? project.name : `Project #${bug.projectId}`;
        createNotification(req.io, {
          userId: assigneeUser.id,
          type: 'bug_assigned',
          title: 'Bug Assigned to You',
          message: `[${bug.severity}] ${bug.title} in ${projectName}`,
          icon: '⊕',
          iconColor: 'var(--am)',
          link: `/projects/${bug.projectId}?tab=bugs`,
          entityType: 'bug',
          entityId: bug.id,
        }).catch(err => console.error('bug_assigned notification error:', err.message));
      }
    }

    emitToProject(req.io, bug.projectId, 'bug:updated', bug);
    res.json(bug);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const bug = await Bug.findByPk(req.params.id);
    if (!bug) return res.status(404).json({ error: 'Bug not found' });
    const projectId = bug.projectId;
    const title = bug.title;
    await bug.destroy();

    emitToProject(req.io, projectId, 'bug:deleted', { id: req.params.id });
    res.json({ message: 'Bug deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
