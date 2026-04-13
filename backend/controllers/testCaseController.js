const { TestCase, TestExecution, Project, ActivityLog } = require('../models');
const { emitToProject, broadcast } = require('../socket/handlers');

exports.getAll = async (req, res) => {
  try {
    const { projectId, category, status } = req.query;
    const where = {};
    if (projectId) where.projectId = projectId;
    if (category)  where.category  = category;
    if (status)    where.status    = status;

    const tcs = await TestCase.findAll({ where, order: [['createdAt','DESC']] });
    res.json(tcs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCategorySummary = async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = {};
    if (projectId) where.projectId = projectId;
    const all = await TestCase.findAll({ where, attributes: ['category'] });
    const summary = {};
    for (const tc of all) {
      summary[tc.category] = (summary[tc.category] || 0) + 1;
    }
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getDetailedAnalysis = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId required' });
    const all = await TestCase.findAll({ where: { projectId } });
    const total = all.length;
    if (total === 0) return res.json({ total: 0, testTypes: [], modules: [], severityDist: {}, priorityDist: {}, insights: [] });

    const typeMap = {};
    const moduleMap = {};
    const severityDist = {};
    const priorityDist = {};
    let totalPass = 0, totalFail = 0;

    for (const tc of all) {
      const type = tc.testType || tc.category || 'Functional';
      const mod = tc.module || 'Unknown';
      const sev = tc.severity || 'Unknown';
      const pri = tc.priority || 'Unknown';
      const result = (tc.testResult || '').toLowerCase();
      const passed = result.includes('pass');
      const failed = result.includes('fail');

      if (!typeMap[type]) typeMap[type] = { type, total: 0, passed: 0, failed: 0, modules: new Set(), severities: {} };
      typeMap[type].total++;
      if (passed) { typeMap[type].passed++; totalPass++; }
      if (failed) { typeMap[type].failed++; totalFail++; }
      typeMap[type].modules.add(mod);
      typeMap[type].severities[sev] = (typeMap[type].severities[sev] || 0) + 1;

      if (!moduleMap[mod]) moduleMap[mod] = { module: mod, total: 0, passed: 0, failed: 0, types: new Set() };
      moduleMap[mod].total++;
      if (passed) moduleMap[mod].passed++;
      if (failed) moduleMap[mod].failed++;
      moduleMap[mod].types.add(type);

      severityDist[sev] = (severityDist[sev] || 0) + 1;
      priorityDist[pri] = (priorityDist[pri] || 0) + 1;
    }

    const testTypes = Object.values(typeMap)
      .map(t => ({ ...t, modules: [...t.modules], passRate: t.total > 0 ? Math.round((t.passed / t.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    const modules = Object.values(moduleMap)
      .map(m => ({ ...m, types: [...m.types], passRate: m.total > 0 ? Math.round((m.passed / m.total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);

    const overallPassRate = total > 0 ? Math.round((totalPass / total) * 100) : 0;

    // AI-powered insights
    const insights = [];
    const failedTypes = testTypes.filter(t => t.passRate < 70 && t.total >= 3);
    if (failedTypes.length > 0) {
      insights.push({ type: 'critical', icon: '🚨', title: 'High Failure Rate Detected',
        message: `${failedTypes.map(t => t.type).join(', ')} testing ${failedTypes.length === 1 ? 'has' : 'have'} pass rate below 70%. Immediate attention recommended.` });
    }
    const missingTypes = ['Security', 'Performance', 'E2E', 'Usability', 'Compatibility'].filter(t => !typeMap[t]);
    if (missingTypes.length > 0) {
      insights.push({ type: 'warning', icon: '⚠️', title: 'Testing Coverage Gaps',
        message: `No ${missingTypes.join(', ')} test cases found. Consider adding these for comprehensive coverage.` });
    }
    const criticalSevCount = all.filter(tc => (tc.severity || '').toLowerCase() === 'critical' && (tc.testResult || '').toLowerCase().includes('fail')).length;
    if (criticalSevCount > 0) {
      insights.push({ type: 'critical', icon: '🔴', title: 'Critical Failures',
        message: `${criticalSevCount} critical severity test case${criticalSevCount > 1 ? 's' : ''} failed. These should be prioritized for immediate fix.` });
    }
    const highPassTypes = testTypes.filter(t => t.passRate === 100 && t.total >= 5);
    if (highPassTypes.length > 0) {
      insights.push({ type: 'success', icon: '✅', title: 'Excellent Coverage Areas',
        message: `${highPassTypes.map(t => t.type).join(', ')} testing ${highPassTypes.length === 1 ? 'has' : 'have'} 100% pass rate. Great job!` });
    }
    const failedModules = modules.filter(m => m.passRate < 60 && m.total >= 3);
    if (failedModules.length > 0) {
      insights.push({ type: 'warning', icon: '📍', title: 'Problematic Modules',
        message: `${failedModules.map(m => m.module).join(', ')} module${failedModules.length > 1 ? 's have' : ' has'} high failure rates. Focus debugging efforts here.` });
    }
    if (testTypes.length >= 5) {
      insights.push({ type: 'info', icon: '📊', title: 'Testing Diversity',
        message: `${testTypes.length} different testing types covering ${modules.length} modules. ${testTypes.length >= 8 ? 'Excellent' : 'Good'} testing diversity.` });
    }
    if (overallPassRate >= 80) {
      insights.push({ type: 'success', icon: '🎯', title: 'Overall Quality Score',
        message: `Overall pass rate is ${overallPassRate}%. The project is in ${overallPassRate >= 90 ? 'excellent' : 'good'} quality health.` });
    } else {
      insights.push({ type: 'warning', icon: '🎯', title: 'Overall Quality Score',
        message: `Overall pass rate is ${overallPassRate}%. Quality improvement needed — target at least 80%.` });
    }

    res.json({ total, totalPass, totalFail, overallPassRate, testTypes, modules, severityDist, priorityDist, insights });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { projectId, name, category, description, expectedResult } = req.body;
    const tc = await TestCase.create({ projectId, name, category: category || 'Functional', description, expectedResult, status: 'Active' });

    await Project.increment('testCasesCount', { where: { id: projectId } });
    emitToProject(req.io, projectId, 'testcase:created', tc);
    res.status(201).json(tc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const tc = await TestCase.findByPk(req.params.id);
    if (!tc) return res.status(404).json({ error: 'Test case not found' });
    const { name, category, description, expectedResult, status } = req.body;
    await tc.update({ name, category, description, expectedResult, status });
    emitToProject(req.io, tc.projectId, 'testcase:updated', tc);
    res.json(tc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const tc = await TestCase.findByPk(req.params.id);
    if (!tc) return res.status(404).json({ error: 'Test case not found' });
    const projectId = tc.projectId;
    await tc.destroy();
    await Project.decrement('testCasesCount', { where: { id: projectId, testCasesCount: { [require('sequelize').Op.gt]: 0 } } });
    emitToProject(req.io, projectId, 'testcase:deleted', { id: req.params.id });
    res.json({ message: 'Test case deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Executions
exports.getExecutions = async (req, res) => {
  try {
    const { projectId, sprint, status } = req.query;
    const where = {};
    if (projectId) where.projectId = projectId;
    if (sprint)    where.sprint    = sprint;
    if (status)    where.status    = status;

    const execs = await TestExecution.findAll({
      where,
      include: [{ model: TestCase, as: 'testCase', attributes: ['id','name','category'] }],
      order: [['executedAt','DESC']],
    });
    res.json(execs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createExecution = async (req, res) => {
  try {
    const { projectId, testCaseId, sprint, status, duration, executedBy } = req.body;
    const exec = await TestExecution.create({ projectId, testCaseId, sprint, status, duration, executedBy });

    await ActivityLog.create({
      action: `Test executed: ${status} [${sprint}]`,
      entityType: 'execution', entityId: exec.id,
      icon: status === 'Passed' ? '✓' : status === 'Failed' ? '✕' : '⏭',
      iconColor: status === 'Passed' ? 'var(--lime)' : status === 'Failed' ? 'var(--rd)' : 'var(--am)',
    });

    emitToProject(req.io, projectId, 'execution:created', exec);
    broadcast(req.io, 'activity:new', {
      action: `Test ${status}: ${sprint}`,
      icon: status === 'Passed' ? '✓' : '✕',
      iconColor: status === 'Passed' ? 'var(--lime)' : 'var(--rd)',
      time: 'just now',
    });
    res.status(201).json(exec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getExecutionSummary = async (req, res) => {
  try {
    const { projectId } = req.query;
    const where = {};
    if (projectId) where.projectId = projectId;
    const all = await TestExecution.findAll({ where });
    const total   = all.length;
    const passed  = all.filter(e => e.status === 'Passed').length;
    const failed  = all.filter(e => e.status === 'Failed').length;
    const skipped = all.filter(e => e.status === 'Skipped').length;
    const successRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    res.json({ total, passed, failed, skipped, successRate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
