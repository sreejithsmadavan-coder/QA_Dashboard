const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const morgan = require('morgan');
require('dotenv').config();

const db = require('./models');
const { initSocket } = require('./socket/handlers');

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];

const io = new Server(httpServer, {
  cors: { origin: allowedOrigins, methods: ['GET','POST','PUT','DELETE','PATCH'], credentials: true },
});

// Middleware
app.use(compression({ level: 6 }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inject socket.io into every request
app.use((req, res, next) => { req.io = io; next(); });

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// API Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/projects',   require('./routes/projects'));
app.use('/api/bugs',       require('./routes/bugs'));
app.use('/api/test-cases', require('./routes/testcases'));
app.use('/api/meetings',   require('./routes/meetings'));
app.use('/api/uploads',    require('./routes/uploads'));
app.use('/api/analytics',  require('./routes/analytics'));
app.use('/api/activity',   require('./routes/activity'));
app.use('/api/reports',    require('./routes/reports'));
app.use('/api/qa-agent',   require('./routes/qaAgent'));
app.use('/api/chat',       require('./routes/chat'));
app.use('/api/search',     require('./routes/search'));
app.use('/api/reports',    require('./routes/reportExport'));   // advanced report & export
app.use('/api/admin',      require('./routes/admin'));          // admin / RBAC
app.use('/api',            require('./routes/cicd'));           // CI/CD webhooks & API keys
app.use('/api/tags',           require('./routes/tags'));           // tag CRUD + test-case tagging
app.use('/api/flakiness',      require('./routes/flakiness'));     // test flakiness tracker
app.use('/api/integrations',   require('./routes/integrations')); // Slack/Teams webhook integrations

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// Initialize Socket.io
initSocket(io);

// Start DB Watcher (polls every 5s, pushes changes to browser)
const { startDBWatcher } = require('./utils/dbWatcher');

const PORT = process.env.PORT || 5000;

db.sequelize.sync().then(async () => {
  console.log('✓ Database synchronized');

  // Migrate: add new test_cases columns if they don't exist
  const newCols = [
    ['testCaseRefId', 'NVARCHAR(255)'], ['module', 'NVARCHAR(255)'], ['subModule', 'NVARCHAR(255)'],
    ['testType', 'NVARCHAR(255)'], ['preconditions', 'NVARCHAR(MAX)'], ['testSteps', 'NVARCHAR(MAX)'],
    ['testData', 'NVARCHAR(MAX)'], ['actualResult', 'NVARCHAR(MAX)'], ['testResult', 'NVARCHAR(255)'],
    ['severity', 'NVARCHAR(255)'], ['priority', 'NVARCHAR(255)'], ['remarks', 'NVARCHAR(MAX)'],
  ];
  for (const [col, type] of newCols) {
    try {
      await db.sequelize.query(`IF COL_LENGTH('test_cases', '${col}') IS NULL ALTER TABLE test_cases ADD [${col}] ${type} NULL;`);
    } catch (e) { /* column may already exist */ }
  }
  // Remove CHECK constraints from category/status columns (MSSQL ENUM workaround)
  try {
    const constraints = await db.sequelize.query(
      `SELECT con.name FROM sys.check_constraints con
       JOIN sys.columns col ON con.parent_object_id = col.object_id AND con.parent_column_id = col.column_id
       WHERE OBJECT_NAME(con.parent_object_id) = 'test_cases'`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    for (const c of constraints) {
      try { await db.sequelize.query(`ALTER TABLE test_cases DROP CONSTRAINT [${c.name}];`); } catch (e) {}
    }
  } catch (e) {}
  try {
    await db.sequelize.query(`ALTER TABLE test_cases ALTER COLUMN [category] NVARCHAR(255);`);
  } catch (e) {}
  try {
    await db.sequelize.query(`ALTER TABLE test_cases ALTER COLUMN [status] NVARCHAR(255);`);
  } catch (e) {}
  console.log('✓ Test cases schema migrated');

  // Migrate: add OTP columns to users table
  for (const [col, type] of [['resetOtp', 'NVARCHAR(255)'], ['resetOtpExpiry', 'BIGINT']]) {
    try {
      await db.sequelize.query(`IF COL_LENGTH('users', '${col}') IS NULL ALTER TABLE users ADD [${col}] ${type} NULL;`);
    } catch (e) {}
  }
  // Fix: ensure resetOtpExpiry is BIGINT (drop DATETIME version if exists)
  try {
    const colInfo = await db.sequelize.query(
      `SELECT DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='resetOtpExpiry'`,
      { type: db.sequelize.QueryTypes.SELECT }
    );
    if (colInfo.length && colInfo[0].DATA_TYPE !== 'bigint') {
      await db.sequelize.query(`ALTER TABLE users DROP COLUMN [resetOtpExpiry];`);
      await db.sequelize.query(`ALTER TABLE users ADD [resetOtpExpiry] BIGINT NULL;`);
    }
  } catch (e) {}

  // Migrate: create chat_messages, notifications, audit_logs_v2 tables if they don't exist
  const newTables = [
    `IF OBJECT_ID('chat_messages','U') IS NULL CREATE TABLE chat_messages (
      id INT IDENTITY(1,1) PRIMARY KEY, userId INT NOT NULL, sessionId NVARCHAR(255) DEFAULT 'default',
      role NVARCHAR(50) NOT NULL, text NVARCHAR(MAX) NOT NULL, source NVARCHAR(50) DEFAULT 'user',
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`,
    `IF OBJECT_ID('notifications','U') IS NULL CREATE TABLE notifications (
      id INT IDENTITY(1,1) PRIMARY KEY, userId INT NOT NULL, type NVARCHAR(255) NOT NULL,
      title NVARCHAR(255) NOT NULL, message NVARCHAR(MAX) NOT NULL,
      icon NVARCHAR(50) DEFAULT N'●', iconColor NVARCHAR(50) DEFAULT 'var(--lime)',
      [read] BIT DEFAULT 0, link NVARCHAR(255), entityType NVARCHAR(50), entityId INT, metadata NVARCHAR(MAX),
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`,
    `IF OBJECT_ID('audit_logs_v2','U') IS NULL CREATE TABLE audit_logs_v2 (
      id INT IDENTITY(1,1) PRIMARY KEY, userId INT, userName NVARCHAR(255),
      action NVARCHAR(255) NOT NULL, entityType NVARCHAR(255) NOT NULL, entityId INT,
      entityName NVARCHAR(255), changes NVARCHAR(MAX), ipAddress NVARCHAR(50), userAgent NVARCHAR(500),
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL)`,
  ];
  for (const sql of newTables) {
    try { await db.sequelize.query(sql); } catch (e) {}
  }
  console.log('✓ New tables migrated');

  // Migrate: create scheduled_reports, cicd_api_keys, tags, test_case_tags tables
  const moduleTables = [
    `IF OBJECT_ID('scheduled_reports','U') IS NULL CREATE TABLE scheduled_reports (
      id INT IDENTITY(1,1) PRIMARY KEY, userId INT NOT NULL, reportType NVARCHAR(255) NOT NULL,
      frequency NVARCHAR(50) NOT NULL, emailTo NVARCHAR(255) NOT NULL, projectId INT NOT NULL,
      lastSentAt DATETIME NULL, isActive BIT DEFAULT 1,
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE)`,
    `IF OBJECT_ID('cicd_api_keys','U') IS NULL CREATE TABLE cicd_api_keys (
      id INT IDENTITY(1,1) PRIMARY KEY, userId INT NOT NULL, [key] NVARCHAR(255) NOT NULL UNIQUE,
      name NVARCHAR(255) DEFAULT 'Unnamed Key', lastUsedAt DATETIME NULL, isActive BIT DEFAULT 1,
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`,
    `IF OBJECT_ID('tags','U') IS NULL CREATE TABLE tags (
      id INT IDENTITY(1,1) PRIMARY KEY, name NVARCHAR(255) NOT NULL UNIQUE,
      color NVARCHAR(50) DEFAULT '#6366f1',
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE())`,
    `IF OBJECT_ID('test_case_tags','U') IS NULL CREATE TABLE test_case_tags (
      id INT IDENTITY(1,1) PRIMARY KEY, testCaseId INT NOT NULL, tagId INT NOT NULL,
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (testCaseId) REFERENCES test_cases(id) ON DELETE CASCADE,
      FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE)`,
  ];
  for (const sql of moduleTables) {
    try { await db.sequelize.query(sql); } catch (e) {}
  }
  console.log('✓ Module tables migrated (reports, RBAC, CICD, tags)');

  // Migrate: create integration_webhooks table
  try {
    await db.sequelize.query(`IF OBJECT_ID('integration_webhooks','U') IS NULL CREATE TABLE integration_webhooks (
      id INT IDENTITY(1,1) PRIMARY KEY, userId INT NOT NULL, platform NVARCHAR(50) NOT NULL,
      webhookUrl NVARCHAR(500) NOT NULL, events NVARCHAR(MAX) DEFAULT '[]',
      isActive BIT DEFAULT 1, lastTriggeredAt DATETIME NULL,
      createdAt DATETIME DEFAULT GETDATE(), updatedAt DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE)`);
  } catch (e) {}
  console.log('✓ Integration webhooks table migrated');

  // Migrate: add clientId column to qa_agent_runs
  try {
    await db.sequelize.query(`IF COL_LENGTH('qa_agent_runs', 'clientId') IS NULL ALTER TABLE qa_agent_runs ADD [clientId] NVARCHAR(255) NULL;`);
  } catch (e) {}

  // Performance: add indexes on foreign keys
  const indexes = [
    'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=\'idx_bugs_projectId\') CREATE INDEX idx_bugs_projectId ON bugs(projectId)',
    'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=\'idx_tc_projectId\') CREATE INDEX idx_tc_projectId ON test_cases(projectId)',
    'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=\'idx_exec_projectId\') CREATE INDEX idx_exec_projectId ON test_executions(projectId)',
    'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=\'idx_exec_testCaseId\') CREATE INDEX idx_exec_testCaseId ON test_executions(testCaseId)',
    'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=\'idx_chat_userId\') CREATE INDEX idx_chat_userId ON chat_messages(userId)',
    'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=\'idx_activity_created\') CREATE INDEX idx_activity_created ON activity_logs(createdAt DESC)',
    'IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name=\'idx_notif_userId\') CREATE INDEX idx_notif_userId ON notifications(userId,[read])',
  ];
  for (const sql of indexes) { try { await db.sequelize.query(sql); } catch (e) {} }
  console.log('✓ Database indexes created');

  const { Project } = db;
  const count = await Project.count();
  if (count === 0) {
    const { seed } = require('./seeders/seed');
    await seed();
    console.log('✓ Demo data seeded');
  }
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 QA Nexus API running on http://localhost:${PORT}`);
    console.log(`   Default login: sreejith.s@webandcrafts.com / Sree123@\n`);
    startDBWatcher(io);
  });
}).catch(err => {
  console.error('✗ Startup error:', err);
  process.exit(1);
});
