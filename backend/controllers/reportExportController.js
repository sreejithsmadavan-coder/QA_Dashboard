const {
  Bug, TestExecution, TestCase, SprintData, Project, sequelize,
} = require('../models');
let ScheduledReport;
try { ScheduledReport = require('../models').ScheduledReport; } catch (e) {}

// lazy getter – the model is added to the index export at startup
function getScheduledReport() {
  if (!ScheduledReport) ScheduledReport = require('../models').ScheduledReport;
  return ScheduledReport;
}

// ── GET /api/reports/export/bugs?projectId=X&format=json ─────────────────────
exports.exportBugs = async (req, res) => {
  try {
    const { projectId, format } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const bugs = await Bug.findAll({
      where: { projectId },
      include: [{ model: Project, as: 'project', attributes: ['name'] }],
      order: [['createdAt', 'DESC']],
    });

    if (format === 'csv') {
      const header = 'id,title,severity,status,reporter,assignee,createdAt\n';
      const rows = bugs.map(b =>
        `${b.id},"${(b.title || '').replace(/"/g, '""')}",${b.severity},${b.status},"${b.reporter || ''}","${b.assignee || ''}",${b.createdAt}`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=bugs_project_${projectId}.csv`);
      return res.send(header + rows);
    }

    // default: JSON
    res.json({ count: bugs.length, bugs });
  } catch (err) {
    console.error('exportBugs error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/reports/export/test-summary?projectId=X ─────────────────────────
exports.testSummary = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const executions = await TestExecution.findAll({
      where: { projectId },
      include: [{ model: TestCase, as: 'testCase', attributes: ['category'] }],
    });

    // Group by category
    const byCategory = {};
    for (const ex of executions) {
      const cat = ex.testCase?.category || 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { passed: 0, failed: 0, skipped: 0, total: 0 };
      byCategory[cat][ex.status === 'Passed' ? 'passed' : ex.status === 'Failed' ? 'failed' : 'skipped']++;
      byCategory[cat].total++;
    }

    const totalPassed  = executions.filter(e => e.status === 'Passed').length;
    const totalFailed  = executions.filter(e => e.status === 'Failed').length;
    const totalSkipped = executions.filter(e => e.status === 'Skipped').length;

    res.json({
      projectId: Number(projectId),
      totalExecutions: executions.length,
      passed: totalPassed,
      failed: totalFailed,
      skipped: totalSkipped,
      passRate: executions.length ? Math.round((totalPassed / executions.length) * 100) : 0,
      byCategory,
    });
  } catch (err) {
    console.error('testSummary error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/reports/export/sprint-report?projectId=X ────────────────────────
exports.sprintReport = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const sprints = await SprintData.findAll({
      where: { projectId },
      order: [['createdAt', 'ASC']],
    });

    res.json({
      projectId: Number(projectId),
      sprintCount: sprints.length,
      sprints,
    });
  } catch (err) {
    console.error('sprintReport error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/reports/schedule ───────────────────────────────────────────────
exports.createSchedule = async (req, res) => {
  try {
    const SR = getScheduledReport();
    const { reportType, frequency, emailTo, projectId } = req.body;
    if (!reportType || !frequency || !emailTo || !projectId) {
      return res.status(400).json({ error: 'reportType, frequency, emailTo and projectId are required' });
    }

    const schedule = await SR.create({
      userId: req.user.id,
      reportType,
      frequency,
      emailTo,
      projectId,
      isActive: true,
    });

    res.status(201).json(schedule);
  } catch (err) {
    console.error('createSchedule error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/reports/schedules ───────────────────────────────────────────────
exports.listSchedules = async (req, res) => {
  try {
    const SR = getScheduledReport();
    const schedules = await SR.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json(schedules);
  } catch (err) {
    console.error('listSchedules error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/reports/schedules/:id ────────────────────────────────────────
exports.deleteSchedule = async (req, res) => {
  try {
    const SR = getScheduledReport();
    const schedule = await SR.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found' });
    await schedule.destroy();
    res.json({ message: 'Schedule deleted' });
  } catch (err) {
    console.error('deleteSchedule error:', err);
    res.status(500).json({ error: err.message });
  }
};
