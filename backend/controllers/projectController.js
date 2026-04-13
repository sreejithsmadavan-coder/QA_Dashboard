const { Project, Bug, TestCase, TestExecution, SprintData, ActivityLog, sequelize } = require('../models');
const { Op } = require('sequelize');
const { broadcast } = require('../socket/handlers');

// Helper: recalculate project health + passRate from DB
async function recalcProject(projectId) {
  const executions = await TestExecution.findAll({ where: { projectId } });
  const total = executions.length;
  const passed = executions.filter(e => e.status === 'Passed').length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  const bugs = await Bug.findAll({ where: { projectId } });
  const criticalCount = bugs.filter(b => b.severity === 'Critical').length;
  const highCount = bugs.filter(b => b.severity === 'High').length;

  let health = 'Excellent';
  if (criticalCount >= 3 || highCount >= 8) health = 'Poor';
  else if (criticalCount >= 1 || highCount >= 3) health = passRate >= 80 ? 'Good' : 'Average';
  else if (passRate < 75) health = 'Average';

  const tcCount = await TestCase.count({ where: { projectId } });
  await Project.update({ passRate, health, testCasesCount: tcCount }, { where: { id: projectId } });
  return { passRate, health, testCasesCount: tcCount };
}

exports.getAll = async (req, res) => {
  try {
    const { status, health } = req.query;
    const where = {};
    if (status && status !== 'All') where.status = status;
    if (health && health !== 'All') where.health = health;

    const projects = await Project.findAll({
      where,
      include: [
        { model: Bug, as: 'bugs', attributes: ['id', 'severity', 'status'] },
      ],
      order: [['createdAt', 'DESC']],
    });

    // Augment with bug counts
    const result = projects.map(p => {
      const pj = p.toJSON();
      const bugs = pj.bugs || [];
      pj.bugsBreakdown = {
        critical: bugs.filter(b => b.severity === 'Critical').length,
        high:     bugs.filter(b => b.severity === 'High').length,
        medium:   bugs.filter(b => b.severity === 'Medium').length,
        low:      bugs.filter(b => b.severity === 'Low').length,
        total:    bugs.length,
      };
      return pj;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getOne = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id, {
      include: [
        { model: Bug, as: 'bugs' },
        { model: TestCase, as: 'testCases' },
        { model: SprintData, as: 'sprints', order: [['sprint', 'ASC']] },
      ],
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { name, status, health, description } = req.body;
    const project = await Project.create({ name, status: status || 'Active', description, health: health || 'Good' });

    await ActivityLog.create({
      action: `New project created: ${name}`,
      entityType: 'project', entityId: project.id,
      icon: '+', iconColor: 'var(--lime)',
    });

    broadcast(req.io, 'project:created', project);
    res.status(201).json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const { name, status, health, description, passRate } = req.body;
    await project.update({ name, status, health, description, passRate });

    await ActivityLog.create({
      action: `Project updated: ${project.name}`,
      entityType: 'project', entityId: project.id,
      icon: '✏', iconColor: 'var(--cy)',
    });

    broadcast(req.io, 'project:updated', project);
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const name = project.name;
    const id   = req.params.id;

    // Delete in correct order to avoid FK constraint violations:
    // test_executions reference test_cases (NO ACTION), so delete
    // test_executions first before test_cases are cascade-deleted.
    await TestExecution.destroy({ where: { projectId: id } });
    await project.destroy(); // cascades: bugs, test_cases, sprint_data

    await ActivityLog.create({
      action: `Project deleted: ${name}`,
      entityType: 'project',
      icon: '✕', iconColor: 'var(--rd)',
    });

    broadcast(req.io, 'project:deleted', { id });
    res.json({ message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getStats = async (req, res) => {
  try {
    const total   = await Project.count();
    const active  = await Project.count({ where: { status: 'Active' } });
    const pending = await Project.count({ where: { status: 'Pending' } });
    const completed = await Project.count({ where: { status: 'Completed' } });
    const hold    = await Project.count({ where: { status: 'Hold' } });
    const totalBugs = await Bug.count();
    const openBugs  = await Bug.count({ where: { status: 'Open' } });
    const totalTC   = await TestCase.count();
    const totalExec = await TestExecution.count();
    const passedExec= await TestExecution.count({ where: { status: 'Passed' } });
    const overallPassRate = totalExec > 0 ? Math.round((passedExec / totalExec) * 100) : 0;

    res.json({ total, active, pending, completed, hold, totalBugs, openBugs, totalTC, totalExec, passedExec, overallPassRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSprintData = async (req, res) => {
  try {
    // Return global sprint data (from first project's sprints)
    const sprints = await SprintData.findAll({ order: [['sprint', 'ASC']] });
    // Group by sprint name, aggregate
    const grouped = {};
    for (const s of sprints) {
      if (!grouped[s.sprint]) grouped[s.sprint] = { ...s.toJSON() };
    }
    res.json(grouped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
