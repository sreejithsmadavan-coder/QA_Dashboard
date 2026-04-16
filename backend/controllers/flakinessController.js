const { TestCase, TestExecution } = require('../models');

exports.getFlakinessData = async (req, res) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    // Get all test cases for the project that have executions
    const testCases = await TestCase.findAll({
      where: { projectId },
      include: [{
        model: TestExecution,
        as: 'executions',
        attributes: ['id', 'status', 'executedAt'],
        order: [['executedAt', 'ASC']],
      }],
    });

    const results = [];

    for (const tc of testCases) {
      const execs = (tc.executions || [])
        .sort((a, b) => new Date(a.executedAt) - new Date(b.executedAt));

      if (execs.length < 2) continue;

      // Count status flips
      let flips = 0;
      for (let i = 1; i < execs.length; i++) {
        if (execs[i].status !== execs[i - 1].status) {
          flips++;
        }
      }

      if (flips === 0) continue;

      const flakinessScore = Math.round((flips / execs.length) * 10000) / 100; // 2 decimals

      // Trend: last 10 statuses
      const trend = execs.slice(-10).map(e => e.status);
      const lastStatus = execs[execs.length - 1].status;

      results.push({
        testCaseId: tc.id,
        testCaseName: tc.name,
        totalRuns: execs.length,
        flips,
        flakinessScore,
        lastStatus,
        trend,
      });
    }

    // Sort by flakinessScore DESC
    results.sort((a, b) => b.flakinessScore - a.flakinessScore);

    res.json(results);
  } catch (err) {
    console.error('Flakiness error:', err);
    res.status(500).json({ error: 'Failed to compute flakiness data' });
  }
};
