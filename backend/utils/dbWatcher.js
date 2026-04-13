/**
 * DB Watcher — polls SQL Server every 5 seconds
 * Detects manual changes made directly in SSMS and pushes
 * real-time updates to all connected browsers via Socket.io
 */

const { Project, Bug, TestCase, TestExecution, Meeting, ActivityLog } = require('../models');
const { broadcast } = require('../socket/handlers');

// Last known state snapshots
let snap = {
  projectCount:   null,
  projectHash:    null,
  bugCount:       null,
  tcCount:        null,
  execCount:      null,
  meetingCount:   null,
};

// Build a quick fingerprint of all projects
async function getProjectsSnapshot() {
  const rows = await Project.findAll({
    attributes: ['id', 'name', 'status', 'health', 'passRate', 'testCasesCount', 'updatedAt'],
  });
  const count = rows.length;
  const hash  = rows
    .map(p => `${p.id}|${p.name}|${p.status}|${p.health}|${p.passRate}|${p.testCasesCount}|${new Date(p.updatedAt).getTime()}`)
    .sort()
    .join('::');
  return { count, hash, rows };
}

async function watchCycle(io) {
  try {
    // ── Projects ────────────────────────────────────────────────
    const { count: pCount, hash: pHash, rows: pRows } = await getProjectsSnapshot();

    if (snap.projectHash !== null) {
      if (pCount > snap.projectCount) {
        // New project added in SSMS
        const newProjects = pRows.slice(-(pCount - snap.projectCount));
        newProjects.forEach(p => broadcast(io, 'project:created', p));
        console.log(`[DB Watcher] ${pCount - snap.projectCount} new project(s) detected`);
      } else if (pCount < snap.projectCount) {
        // Project deleted in SSMS
        broadcast(io, 'project:deleted', { source: 'db-watcher' });
        console.log(`[DB Watcher] Project deletion detected`);
      } else if (pHash !== snap.projectHash) {
        // Project updated in SSMS (status/health/passRate changed)
        broadcast(io, 'project:updated', { source: 'db-watcher' });
        console.log(`[DB Watcher] Project update detected`);
      }
    }

    snap.projectCount = pCount;
    snap.projectHash  = pHash;

    // ── Bugs ─────────────────────────────────────────────────────
    const bugCount = await Bug.count();
    if (snap.bugCount !== null && bugCount !== snap.bugCount) {
      broadcast(io, 'bug:created', { source: 'db-watcher' });
      console.log(`[DB Watcher] Bug change detected (${snap.bugCount} → ${bugCount})`);
    }
    snap.bugCount = bugCount;

    // ── Test Cases ────────────────────────────────────────────────
    const tcCount = await TestCase.count();
    if (snap.tcCount !== null && tcCount !== snap.tcCount) {
      broadcast(io, 'testcases:bulk_imported', { source: 'db-watcher' });
      console.log(`[DB Watcher] Test case change detected (${snap.tcCount} → ${tcCount})`);
    }
    snap.tcCount = tcCount;

    // ── Test Executions ───────────────────────────────────────────
    const execCount = await TestExecution.count();
    if (snap.execCount !== null && execCount !== snap.execCount) {
      broadcast(io, 'execution:created', { source: 'db-watcher' });
      console.log(`[DB Watcher] Execution change detected (${snap.execCount} → ${execCount})`);
    }
    snap.execCount = execCount;

    // ── Meetings ──────────────────────────────────────────────────
    const meetingCount = await Meeting.count();
    if (snap.meetingCount !== null && meetingCount !== snap.meetingCount) {
      broadcast(io, 'meeting:updated', { source: 'db-watcher' });
      console.log(`[DB Watcher] Meeting change detected`);
    }
    snap.meetingCount = meetingCount;

  } catch (err) {
    console.error('[DB Watcher] Error:', err.message);
  }
}

function startDBWatcher(io, intervalMs = 5000) {
  // Run first cycle immediately to set baseline snapshot
  watchCycle(io).then(() => {
    // Then poll every 5 seconds
    setInterval(() => watchCycle(io), intervalMs);
    console.log(`✓ DB Watcher running — syncing every ${intervalMs / 1000}s`);
  });
}

module.exports = { startDBWatcher };
