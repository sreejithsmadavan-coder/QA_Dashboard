const { TestExecution, TestCase, ActivityLog, Project, SprintData } = require('../models');
const { broadcast, emitToProject } = require('../socket/handlers');
const { recalcProject } = require('../utils/projectUtils');

/**
 * POST /api/reports/playwright
 * Body: {
 *   projectId: number,
 *   sprint:    string,          // e.g. "Sprint 6"
 *   results: [
 *     { title: string, status: 'passed'|'failed'|'skipped', duration: number (ms) }
 *   ]
 * }
 *
 * Called automatically by the qa-reporter.js Playwright custom reporter.
 */
exports.receivePlaywrightReport = async (req, res) => {
  try {
    const { projectId, sprint = 'Sprint 1', results = [] } = req.body;

    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!Array.isArray(results) || results.length === 0) {
      return res.status(400).json({ error: 'results array is required and must not be empty' });
    }

    // Normalise status: Playwright uses lowercase 'passed'/'failed'/'skipped'
    const normalise = (s = '') => {
      const m = { passed: 'Passed', failed: 'Failed', skipped: 'Skipped' };
      return m[s.toLowerCase()] || 'Failed';
    };

    let imported = 0;
    let skipped  = 0;

    for (const r of results) {
      const status   = normalise(r.status);
      const duration = r.duration ? `${Math.round(r.duration)}ms` : '';
      const title    = r.title || r.name || 'Unnamed Test';

      // Try to find a matching TestCase by name (optional linkage)
      let testCaseId = null;
      try {
        const tc = await TestCase.findOne({ where: { projectId, name: title } });
        if (tc) testCaseId = tc.id;
      } catch { /* no match is fine */ }

      try {
        await TestExecution.create({
          projectId,
          testCaseId,
          sprint,
          status,
          duration,
          executedBy: 'Playwright',
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    // Recalculate project stats
    const stats = await recalcProject(projectId);

    // Update (or create) SprintData aggregate for this sprint
    await upsertSprintData(projectId, sprint);

    // Emit real-time updates
    const project = await Project.findByPk(projectId);
    broadcast(req.io, 'project:updated', project);
    emitToProject(req.io, projectId, 'executions:bulk_imported', {
      count: imported,
      sprint,
      source: 'playwright',
      ...stats,
    });

    // Log activity
    await ActivityLog.create({
      action:     `Playwright report received: ${imported} executions in ${sprint} (project #${projectId})`,
      entityType: 'execution',
      entityId:   projectId,
      icon:       '▶',
      iconColor:  'var(--cy)',
    });

    broadcast(req.io, 'activity:new', {
      action:    `Playwright run completed — ${imported} tests in ${sprint}`,
      icon:      '▶',
      iconColor: 'var(--cy)',
      time:      'just now',
    });

    res.json({ imported, skipped, sprint, stats });
  } catch (err) {
    console.error('reportController error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── helpers ───────────────────────────────────────────────────────────────────

async function upsertSprintData(projectId, sprint) {
  const executions = await TestExecution.findAll({ where: { projectId, sprint } });
  const total   = executions.length;
  const passed  = executions.filter(e => e.status === 'Passed').length;
  const failed  = executions.filter(e => e.status === 'Failed').length;
  const skipped = executions.filter(e => e.status === 'Skipped').length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Build a trend array (last 10 pass rates by insertion order — just append the new value)
  let existing = await SprintData.findOne({ where: { projectId, sprint } });
  let trend = existing ? (existing.trend || []) : [];
  trend = [...trend, passRate].slice(-10); // keep last 10

  if (existing) {
    await existing.update({ totalExec: total, passed, failed, skipped, passRate, trend });
  } else {
    await SprintData.create({ projectId, sprint, totalExec: total, passed, failed, skipped, passRate, trend });
  }
}
