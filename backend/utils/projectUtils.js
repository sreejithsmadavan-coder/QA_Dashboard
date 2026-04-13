const { Project, Bug, TestCase, TestExecution } = require('../models');

/**
 * Recalculate and save passRate, health, testCasesCount for a project.
 * Call this after any bulk import or execution change.
 */
async function recalcProject(projectId) {
  const [executions, bugs, tcCount] = await Promise.all([
    TestExecution.findAll({ where: { projectId } }),
    Bug.findAll({ where: { projectId } }),
    TestCase.count({ where: { projectId } }),
  ]);

  // Pass rate
  const total  = executions.length;
  const passed = executions.filter(e => e.status === 'Passed').length;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  // Health from bugs + passRate
  const critical = bugs.filter(b => b.severity === 'Critical').length;
  const high     = bugs.filter(b => b.severity === 'High').length;

  let health = 'Excellent';
  if      (critical >= 3 || high >= 8)  health = 'Poor';
  else if (critical >= 1 || high >= 3)  health = passRate >= 80 ? 'Good' : 'Average';
  else if (passRate < 75)               health = 'Average';

  await Project.update(
    { passRate, health, testCasesCount: tcCount },
    { where: { id: projectId } }
  );

  return { passRate, health, testCasesCount: tcCount };
}

module.exports = { recalcProject };
