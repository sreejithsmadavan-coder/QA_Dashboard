const { QAAgentConfig, QAAgentRun, ActivityLog } = require('../models');
const { broadcast } = require('../socket/handlers');

// ── Config (one row per user) ─────────────────────────────────────────────────
exports.getConfig = async (req, res) => {
  try {
    const cfg = await QAAgentConfig.findOne({ where: { userId: req.user.id } });
    res.json(cfg || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.upsertConfig = async (req, res) => {
  try {
    const { provider, model, apiKey, url, siteType, categories, notes, emailAddr, state } = req.body;
    const payload = { provider, model, apiKey, url, siteType, categories, notes, emailAddr, state };
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    let cfg = await QAAgentConfig.findOne({ where: { userId: req.user.id } });
    if (cfg) {
      await cfg.update(payload);
    } else {
      cfg = await QAAgentConfig.create({ userId: req.user.id, ...payload });
    }
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteConfig = async (req, res) => {
  try {
    await QAAgentConfig.destroy({ where: { userId: req.user.id } });
    res.json({ message: 'Config cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Runs ──────────────────────────────────────────────────────────────────────
exports.listRuns = async (req, res) => {
  try {
    const { projectId, limit = 50 } = req.query;
    const where = { userId: req.user.id };
    if (projectId) where.projectId = projectId;
    const runs = await QAAgentRun.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      attributes: { exclude: ['reportHtml', 'results'] },
    });
    res.json(runs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRun = async (req, res) => {
  try {
    const run = await QAAgentRun.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createRun = async (req, res) => {
  try {
    const body = req.body || {};
    const run = await QAAgentRun.create({
      userId: req.user.id,
      projectId: body.projectId || null,
      url: body.url,
      provider: body.provider,
      model: body.model,
      categories: body.categories || [],
      status: body.status || 'completed',
      totalTests: body.totalTests || 0,
      passCount: body.passCount || 0,
      failCount: body.failCount || 0,
      blockedCount: body.blockedCount || 0,
      passRate: body.passRate || 0,
      durationMs: body.durationMs,
      results: body.results || {},
      bugs: body.bugs || [],
      testCases: body.testCases || [],
      reportHtml: body.reportHtml,
    });

    await ActivityLog.create({
      action: `QA Agent run completed for ${body.url || 'site'}`,
      entityType: 'qa_agent_run', entityId: run.id,
      icon: '🤖', iconColor: 'var(--lime)',
      userId: req.user.id,
    });

    if (req.io) broadcast(req.io, 'qa-agent:run-created', { id: run.id, url: run.url, passRate: run.passRate });
    res.status(201).json(run);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteRun = async (req, res) => {
  try {
    const run = await QAAgentRun.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    await run.destroy();
    res.json({ message: 'Run deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.clearRuns = async (req, res) => {
  try {
    await QAAgentRun.destroy({ where: { userId: req.user.id } });
    res.json({ message: 'All runs cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
