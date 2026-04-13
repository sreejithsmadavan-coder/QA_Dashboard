const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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

db.sequelize.sync({ alter: false }).then(async () => {
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
