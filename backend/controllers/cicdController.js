const crypto = require('crypto');
const {
  TestExecution, TestCase, ActivityLog, Project, SprintData, sequelize,
} = require('../models');
let CICDApiKey;
function getApiKeyModel() {
  if (!CICDApiKey) CICDApiKey = require('../models').CICDApiKey;
  return CICDApiKey;
}

// ── POST /api/webhooks/ci-result (API-key auth, no JWT) ──────────────────────
exports.receiveCIResult = async (req, res) => {
  try {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) return res.status(401).json({ error: 'Missing X-API-Key header' });

    const AK = getApiKeyModel();
    const keyRecord = await AK.findOne({ where: { key: apiKey, isActive: true } });
    if (!keyRecord) return res.status(403).json({ error: 'Invalid or revoked API key' });

    // Update lastUsedAt
    await keyRecord.update({ lastUsedAt: new Date() });

    const { projectId, provider, buildId, status, tests = [] } = req.body;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    if (!Array.isArray(tests) || tests.length === 0) {
      return res.status(400).json({ error: 'tests array is required and must not be empty' });
    }

    const normalise = (s = '') => {
      const m = { passed: 'Passed', pass: 'Passed', failed: 'Failed', fail: 'Failed', skipped: 'Skipped', skip: 'Skipped' };
      return m[s.toLowerCase()] || 'Failed';
    };

    let imported = 0;
    let skipped  = 0;
    const sprint = `CI-${buildId || Date.now()}`;

    for (const t of tests) {
      const testStatus = normalise(t.status);
      const duration   = t.duration ? `${Math.round(t.duration)}ms` : '';
      const name       = t.name || 'Unnamed CI Test';

      // Try linking to existing TestCase
      let testCaseId = null;
      try {
        const tc = await TestCase.findOne({ where: { projectId, name } });
        if (tc) testCaseId = tc.id;
      } catch { /* no match is fine */ }

      try {
        await TestExecution.create({
          projectId,
          testCaseId,
          sprint,
          status: testStatus,
          duration,
          executedBy: provider || 'CI',
        });
        imported++;
      } catch {
        skipped++;
      }
    }

    // Log activity
    await ActivityLog.create({
      action:     `CI result from ${provider || 'unknown'} (build ${buildId || 'N/A'}): ${imported} tests imported for project #${projectId}`,
      entityType: 'execution',
      entityId:   projectId,
      icon:       '⚙',
      iconColor:  'var(--cy)',
      userId:     keyRecord.userId,
    });

    res.json({ imported, skipped, sprint, provider, buildId, status });
  } catch (err) {
    console.error('receiveCIResult error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── GET /api/cicd/api-keys (auth required) ───────────────────────────────────
exports.listApiKeys = async (req, res) => {
  try {
    const AK = getApiKeyModel();
    const keys = await AK.findAll({
      where: { userId: req.user.id },
      attributes: ['id', 'name', 'key', 'lastUsedAt', 'isActive', 'createdAt'],
      order: [['createdAt', 'DESC']],
    });
    // Mask the key for listing (show first 8 chars)
    const masked = keys.map(k => {
      const j = k.toJSON();
      j.maskedKey = j.key.substring(0, 8) + '...';
      return j;
    });
    res.json(masked);
  } catch (err) {
    console.error('listApiKeys error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── POST /api/cicd/api-keys (auth required) ──────────────────────────────────
exports.generateApiKey = async (req, res) => {
  try {
    const AK = getApiKeyModel();
    const { name } = req.body;
    const key = 'qadk_' + crypto.randomBytes(32).toString('hex');

    const record = await AK.create({
      userId: req.user.id,
      key,
      name: name || 'Unnamed Key',
      isActive: true,
    });

    // Return full key only at creation time
    res.status(201).json({ id: record.id, name: record.name, key, createdAt: record.createdAt });
  } catch (err) {
    console.error('generateApiKey error:', err);
    res.status(500).json({ error: err.message });
  }
};

// ── DELETE /api/cicd/api-keys/:id (auth required) ────────────────────────────
exports.revokeApiKey = async (req, res) => {
  try {
    const AK = getApiKeyModel();
    const record = await AK.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!record) return res.status(404).json({ error: 'API key not found' });

    await record.update({ isActive: false });
    res.json({ message: 'API key revoked', id: record.id });
  } catch (err) {
    console.error('revokeApiKey error:', err);
    res.status(500).json({ error: err.message });
  }
};
