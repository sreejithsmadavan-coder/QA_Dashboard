const { Bug, Project, ActivityLog } = require('../models');
const { broadcast, emitToProject } = require('../socket/handlers');

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
