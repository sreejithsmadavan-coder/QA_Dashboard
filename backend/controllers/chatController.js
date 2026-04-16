const { Project, Bug, TestCase, TestExecution, ActivityLog, QAAgentRun, ChatMessage, Notification, AuditLog } = require('../models');
const { Op } = require('sequelize');

// ── Cached context (30s TTL) ────────────────────────────────────────────────
let _ctxCache = null;
let _ctxExpiry = 0;
async function getCachedContext() {
  if (_ctxCache && Date.now() < _ctxExpiry) return _ctxCache;
  _ctxCache = await buildContext();
  _ctxExpiry = Date.now() + 30000;
  return _ctxCache;
}

// ── Build system context from live DB data ───────────────────────────────────
async function buildContext() {
  const [projects, bugs, testCases, executions, recentActivity, recentRuns] = await Promise.all([
    Project.findAll({ attributes: ['id', 'name', 'status', 'health', 'passRate', 'testCasesCount'] }),
    Bug.findAll({ attributes: ['id', 'projectId', 'title', 'severity', 'status', 'reporter', 'assignee'] }),
    TestCase.findAll({ attributes: ['id', 'projectId', 'name', 'category', 'status'] }),
    TestExecution.findAll({ attributes: ['id', 'projectId', 'status', 'sprint', 'executedAt'], order: [['executedAt', 'DESC']], limit: 200 }),
    ActivityLog.findAll({ order: [['createdAt', 'DESC']], limit: 20 }),
    QAAgentRun.findAll({ order: [['createdAt', 'DESC']], limit: 5, attributes: ['id', 'url', 'status', 'totalTests', 'passCount', 'failCount', 'passRate', 'createdAt'] }),
  ]);

  const totalExec = executions.length;
  const passed = executions.filter(e => e.status === 'Passed').length;
  const failed = executions.filter(e => e.status === 'Failed').length;
  const skipped = executions.filter(e => e.status === 'Skipped').length;
  const openBugs = bugs.filter(b => b.status === 'Open');
  const criticalBugs = bugs.filter(b => b.severity === 'Critical');

  return `
## Live QA Dashboard State

### Projects (${projects.length} total)
${projects.map(p => `- **${p.name}** — Status: ${p.status}, Health: ${p.health}, Pass Rate: ${p.passRate ?? 'N/A'}%, Test Cases: ${p.testCasesCount ?? 0}`).join('\n')}

### Bugs (${bugs.length} total, ${openBugs.length} open, ${criticalBugs.length} critical)
${openBugs.slice(0, 10).map(b => `- [${b.severity}] "${b.title}" — ${b.status}, assigned to ${b.assignee || 'unassigned'}`).join('\n') || 'No open bugs'}

### Test Executions (last 200)
- Total: ${totalExec}, Passed: ${passed}, Failed: ${failed}, Skipped: ${skipped}
- Pass Rate: ${totalExec > 0 ? Math.round((passed / totalExec) * 100) : 0}%

### Test Cases (${testCases.length} total)
Categories: ${[...new Set(testCases.map(t => t.category))].filter(Boolean).join(', ') || 'None'}

### Recent Activity
${recentActivity.slice(0, 10).map(a => `- ${a.action} (${a.entityType})`).join('\n') || 'No recent activity'}

### Recent QA Agent Runs
${recentRuns.map(r => `- ${r.url} — ${r.status}, ${r.totalTests} tests, ${r.passRate}% pass rate`).join('\n') || 'No runs yet'}
`.trim();
}

// ── Daily digest ─────────────────────────────────────────────────────────────
async function buildDailyDigest() {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [todayActivity, todayBugs, todayExec] = await Promise.all([
    ActivityLog.findAll({ where: { createdAt: { [Op.gte]: since } }, order: [['createdAt', 'DESC']] }),
    Bug.findAll({ where: { createdAt: { [Op.gte]: since } } }),
    TestExecution.findAll({ where: { executedAt: { [Op.gte]: since } } }),
  ]);

  const passed = todayExec.filter(e => e.status === 'Passed').length;
  const failed = todayExec.filter(e => e.status === 'Failed').length;
  const critBugs = todayBugs.filter(b => b.severity === 'Critical').length;

  return {
    activities: todayActivity.length,
    bugsCreated: todayBugs.length,
    criticalBugs: critBugs,
    executions: todayExec.length,
    passed,
    failed,
    passRate: todayExec.length > 0 ? Math.round((passed / todayExec.length) * 100) : null,
  };
}

// ── Chat endpoint (Claude AI or fallback) ────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, history = [], sessionId = 'default' } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const userId = req.user.id;

    // Save user message to SQL
    await ChatMessage.create({ userId, sessionId, role: 'user', text: message, source: 'user' });

    const context = await getCachedContext();
    let reply, source;

    // Try Claude API if key is available
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (apiKey) {
      try {
        const Anthropic = require('@anthropic-ai/sdk');
        const client = new Anthropic({ apiKey });

        const systemPrompt = `You are QA Nexus Bot, an AI assistant for a QA Dashboard application. You help users with:
- Understanding project status, bugs, test cases, and execution results
- Navigating the dashboard (projects, QA agent, meetings, settings)
- Bug triage — suggesting severity and priority based on error descriptions
- Test strategy advice
- Summarizing test runs and activity

Here is the current live data from the dashboard:

${context}

Rules:
- Be concise and helpful. Use markdown formatting.
- When users ask about stats, use the live data above.
- When users want to navigate, tell them which page/section to go to.
- For bug triage, suggest severity (Critical/High/Medium/Low) and explain why.
- Keep responses under 200 words unless the user asks for detail.`;

        const messages = [
          ...history.slice(-10).map(m => ({
            role: m.role === 'bot' ? 'assistant' : 'user',
            content: m.text,
          })),
          { role: 'user', content: message },
        ];

        const response = await client.messages.create({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: systemPrompt,
          messages,
        });

        reply = response.content[0]?.text || 'Sorry, I could not generate a response.';
        source = 'ai';
      } catch (aiErr) {
        console.error('Claude API error:', aiErr.message);
        reply = await smartFallback(message);
        source = 'fallback';
      }
    } else {
      reply = await smartFallback(message);
      source = 'fallback';
    }

    // Save bot reply to SQL
    await ChatMessage.create({ userId, sessionId, role: 'bot', text: reply, source });

    return res.json({ reply, source });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Chat service unavailable' });
  }
};

// ── Chat history endpoints ──────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const messages = await ChatMessage.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 200,
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSessionHistory = async (req, res) => {
  try {
    const messages = await ChatMessage.findAll({
      where: { userId: req.user.id, sessionId: req.params.sessionId },
      order: [['createdAt', 'ASC']],
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteHistory = async (req, res) => {
  try {
    await ChatMessage.destroy({ where: { userId: req.user.id } });
    res.json({ message: 'Chat history cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Quick stats endpoint ─────────────────────────────────────────────────────
exports.quickStats = async (req, res) => {
  try {
    const [projects, bugs, testCases, executions] = await Promise.all([
      Project.findAll({ attributes: ['id', 'name', 'status', 'health', 'passRate'] }),
      Bug.findAll({ attributes: ['id', 'severity', 'status'] }),
      TestCase.findAll({ attributes: ['id'] }),
      TestExecution.findAll({ attributes: ['id', 'status'] }),
    ]);

    const totalExec = executions.length;
    const passed = executions.filter(e => e.status === 'Passed').length;

    res.json({
      projects: {
        total: projects.length,
        active: projects.filter(p => p.status === 'Active').length,
        completed: projects.filter(p => p.status === 'Completed').length,
      },
      bugs: {
        total: bugs.length,
        open: bugs.filter(b => b.status === 'Open').length,
        critical: bugs.filter(b => b.severity === 'Critical').length,
      },
      testCases: testCases.length,
      executions: {
        total: totalExec,
        passed,
        failed: executions.filter(e => e.status === 'Failed').length,
        passRate: totalExec > 0 ? Math.round((passed / totalExec) * 100) : 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Daily digest endpoint ────────────────────────────────────────────────────
exports.dailyDigest = async (req, res) => {
  try {
    const digest = await buildDailyDigest();
    res.json(digest);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Notifications (SQL) ─────────────────────────────────────────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { unreadOnly } = req.query;
    const where = { userId: req.user.id };
    if (unreadOnly === 'true') where.read = false;
    const notifs = await Notification.findAll({ where, order: [['createdAt', 'DESC']], limit: 50 });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    if (req.params.id === 'all') {
      await Notification.update({ read: true }, { where: { userId: req.user.id, read: false } });
    } else {
      await Notification.update({ read: true }, { where: { id: req.params.id, userId: req.user.id } });
    }
    res.json({ message: 'Marked as read' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.count({ where: { userId: req.user.id, read: false } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Audit logs (SQL) ────────────────────────────────────────────────────────
exports.getAuditLogs = async (req, res) => {
  try {
    const { entityType, entityId, limit = 50 } = req.query;
    const where = {};
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = parseInt(entityId);
    const logs = await AuditLog.findAll({ where, order: [['createdAt', 'DESC']], limit: parseInt(limit) });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ── Smart fallback (no AI key needed) ────────────────────────────────────────
async function smartFallback(message) {
  const t = message.toLowerCase();

  if (t.includes('how many') || t.includes('stats') || t.includes('status') || t.includes('overview') || t.includes('dashboard')) {
    const [projects, bugs, executions] = await Promise.all([
      Project.findAll({ attributes: ['id', 'status'] }),
      Bug.findAll({ attributes: ['id', 'severity', 'status'] }),
      TestExecution.findAll({ attributes: ['id', 'status'] }),
    ]);
    const totalExec = executions.length;
    const passed = executions.filter(e => e.status === 'Passed').length;
    return `Here's your current dashboard overview:\n\n` +
      `**Projects:** ${projects.length} total (${projects.filter(p => p.status === 'Active').length} active)\n` +
      `**Bugs:** ${bugs.length} total (${bugs.filter(b => b.status === 'Open').length} open, ${bugs.filter(b => b.severity === 'Critical').length} critical)\n` +
      `**Test Executions:** ${totalExec} total — ${totalExec > 0 ? Math.round((passed / totalExec) * 100) : 0}% pass rate\n\n` +
      `Visit the **Dashboard** page for detailed charts and metrics.`;
  }

  if (t.includes('triage') || t.includes('severity') || (t.includes('bug') && (t.includes('report') || t.includes('log') || t.includes('found') || t.includes('error')))) {
    if (t.includes('crash') || t.includes('data loss') || t.includes('security') || t.includes('down') || t.includes('production'))
      return `**Suggested Severity: Critical** 🔴\n\nThis sounds like it could cause data loss, security issues, or production downtime. I'd recommend:\n- Priority: **P0 — Immediate**\n- Assign to a senior engineer\n- Create the bug from the project's **Bugs** tab with severity set to Critical`;
    if (t.includes('block') || t.includes('cannot') || t.includes('broken') || t.includes('fail'))
      return `**Suggested Severity: High** 🟠\n\nThis appears to block key functionality. I'd recommend:\n- Priority: **P1 — High**\n- Log it in the project's **Bugs** tab with High severity`;
    if (t.includes('minor') || t.includes('ui') || t.includes('cosmetic') || t.includes('typo') || t.includes('alignment'))
      return `**Suggested Severity: Low** 🟢\n\nThis sounds like a cosmetic/minor issue. Log it with **Low** severity in the Bugs tab.`;
    return `**Suggested Severity: Medium** 🟡\n\nBased on the description, this seems like a moderate issue. Log it in the project's **Bugs** tab with **Medium** severity.\n\nFor better triage, include: steps to reproduce, expected vs actual behavior, and screenshots.`;
  }

  if (t.includes('test run') || t.includes('last run') || t.includes('execution') || t.includes('test result')) {
    const runs = await QAAgentRun.findAll({ order: [['createdAt', 'DESC']], limit: 3, attributes: ['url', 'status', 'totalTests', 'passCount', 'failCount', 'passRate', 'createdAt'] });
    if (runs.length === 0) return 'No test runs found yet. Go to the **QA Agent** page to start your first automated test run!';
    return `**Recent Test Runs:**\n\n` + runs.map((r, i) =>
      `${i + 1}. **${r.url}** — ${r.status}\n   Tests: ${r.totalTests}, Pass: ${r.passCount}, Fail: ${r.failCount}, Rate: ${r.passRate}%`
    ).join('\n\n');
  }

  if (t.includes('open bug') || t.includes('bug list') || t.includes('active bug')) {
    const openBugs = await Bug.findAll({ where: { status: 'Open' }, limit: 5, order: [['createdAt', 'DESC']] });
    if (openBugs.length === 0) return 'No open bugs right now! 🎉';
    return `**Open Bugs (latest 5):**\n\n` + openBugs.map((b, i) =>
      `${i + 1}. [${b.severity}] **${b.title}** — ${b.assignee || 'Unassigned'}`
    ).join('\n');
  }

  if (t.includes('project'))
    return 'Go to the **Projects** page from the sidebar to see all your QA projects. You can filter by status (Active, Pending, Completed, Hold) and click into any project for details.';

  if (t.includes('navigate') || t.includes('where') || t.includes('how do i') || t.includes('find'))
    return `Here's how to navigate QA Nexus:\n\n` +
      `- **Dashboard** — Overview metrics and charts\n` +
      `- **Projects** — All projects with filtering\n` +
      `- **QA Agent** — AI-powered test generation\n` +
      `- **Meetings** — Schedule QA meetings\n` +
      `- **Settings** — Theme, profile, preferences\n\n` +
      `Click any item in the sidebar to navigate!`;

  if (t.includes('meeting') || t.includes('schedule'))
    return 'Head to the **Meetings** page to schedule and manage QA team meetings. You can set up recurring meetings with agenda and attendees.';

  if (t.includes('report') || t.includes('export'))
    return 'You can export test execution reports from within any project. Look for the export options in the project detail view, or run the **QA Agent** to generate HTML reports.';

  if (t.includes('hello') || t.includes('hi ') || t.includes('hey') || t === 'hi')
    return 'Hello! 👋 I\'m QA Nexus Bot. I can help you with:\n\n- 📊 Dashboard stats & project status\n- 🐛 Bug triage & severity suggestions\n- 🧪 Test run summaries\n- 🗺️ Navigation help\n\nWhat would you like to know?';

  if (t.includes('thank'))
    return 'You\'re welcome! Let me know if you need anything else. 😊';

  return 'I can help you with:\n\n- **"Show stats"** — Dashboard overview\n- **"Open bugs"** — List active bugs\n- **"Last test run"** — Recent execution results\n- **"Triage: [describe bug]"** — Get severity suggestions\n- **"Navigate"** — Find your way around\n\nWhat would you like to know?';
}
