-- ================================================================
--  QA NEXUS  —  Complete Database Setup for SQL Server / SSMS
-- ================================================================
--  Steps:
--    1. Open this file in SQL Server Management Studio (SSMS)
--    2. Make sure you are connected to your SQL Server instance
--    3. Press F5  (or click Execute)
--    4. Done — database, all tables and demo data will be ready
--
--  Safe to re-run:  every block checks before creating/inserting.
--  Login after setup:  shahin@qanexus.com  /  admin123
-- ================================================================

-- ── 1. CREATE DATABASE ──────────────────────────────────────────
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = N'qa_nexus')
BEGIN
    CREATE DATABASE qa_nexus;
    PRINT '✓ Database qa_nexus created';
END
ELSE
    PRINT '→ Database qa_nexus already exists, skipping';
GO

USE qa_nexus;
GO

-- ── 2. TABLES ───────────────────────────────────────────────────

-- ── users ───────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'users' AND xtype = 'U')
BEGIN
    CREATE TABLE users (
        id          INT            IDENTITY(1,1) PRIMARY KEY,
        firstName   NVARCHAR(100)  NOT NULL DEFAULT 'Muhammed',
        lastName    NVARCHAR(100)  NOT NULL DEFAULT 'Shahin',
        email       NVARCHAR(255)  NOT NULL UNIQUE,
        password    NVARCHAR(255)  NOT NULL,
        role        NVARCHAR(100)  DEFAULT 'QA Lead',
        department  NVARCHAR(100)  DEFAULT 'Engineering',
        location    NVARCHAR(150)  DEFAULT 'Kerala, India',
        timezone    NVARCHAR(100)  DEFAULT 'Asia/Kolkata',
        bio         NVARCHAR(MAX),
        github      NVARCHAR(255),
        linkedin    NVARCHAR(255),
        avatar      NVARCHAR(MAX),
        isActive    BIT            DEFAULT 1,
        createdAt   DATETIME2      DEFAULT GETDATE(),
        updatedAt   DATETIME2      DEFAULT GETDATE()
    );
    PRINT '✓ Table users created';
END
ELSE
    PRINT '→ Table users exists, skipping';
GO

-- ── projects ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'projects' AND xtype = 'U')
BEGIN
    CREATE TABLE projects (
        id             INT            IDENTITY(1,1) PRIMARY KEY,
        name           NVARCHAR(255)  NOT NULL,
        status         NVARCHAR(50)   DEFAULT 'Active'
                           CONSTRAINT chk_proj_status
                           CHECK (status IN ('Active','Pending','Completed','Hold')),
        health         NVARCHAR(50)   DEFAULT 'Good'
                           CONSTRAINT chk_proj_health
                           CHECK (health IN ('Excellent','Good','Average','Poor')),
        description    NVARCHAR(MAX),
        passRate       FLOAT          DEFAULT 0,
        testCasesCount INT            DEFAULT 0,
        createdAt      DATETIME2      DEFAULT GETDATE(),
        updatedAt      DATETIME2      DEFAULT GETDATE()
    );
    PRINT '✓ Table projects created';
END
ELSE
    PRINT '→ Table projects exists, skipping';
GO

-- ── bugs ──────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'bugs' AND xtype = 'U')
BEGIN
    CREATE TABLE bugs (
        id          INT            IDENTITY(1,1) PRIMARY KEY,
        projectId   INT            NOT NULL,
        title       NVARCHAR(255)  NOT NULL,
        description NVARCHAR(MAX),
        severity    NVARCHAR(50)   DEFAULT 'Medium'
                        CONSTRAINT chk_bug_sev
                        CHECK (severity IN ('Critical','High','Medium','Low')),
        status      NVARCHAR(50)   DEFAULT 'Open'
                        CONSTRAINT chk_bug_st
                        CHECK (status IN ('Open','In Progress','Resolved','Closed')),
        reporter    NVARCHAR(255),
        assignee    NVARCHAR(255),
        createdAt   DATETIME2      DEFAULT GETDATE(),
        updatedAt   DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT fk_bugs_project
            FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
    PRINT '✓ Table bugs created';
END
ELSE
    PRINT '→ Table bugs exists, skipping';
GO

-- ── test_cases ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'test_cases' AND xtype = 'U')
BEGIN
    CREATE TABLE test_cases (
        id             INT            IDENTITY(1,1) PRIMARY KEY,
        projectId      INT            NOT NULL,
        name           NVARCHAR(255)  NOT NULL,
        category       NVARCHAR(100)  DEFAULT 'Functional'
                           CONSTRAINT chk_tc_cat
                           CHECK (category IN ('UI','Functional','Responsive','Integration','Security','Accessibility','Performance')),
        description    NVARCHAR(MAX),
        expectedResult NVARCHAR(MAX),
        status         NVARCHAR(50)   DEFAULT 'Active'
                           CONSTRAINT chk_tc_st
                           CHECK (status IN ('Active','Deprecated')),
        createdAt      DATETIME2      DEFAULT GETDATE(),
        updatedAt      DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT fk_tc_project
            FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
    PRINT '✓ Table test_cases created';
END
ELSE
    PRINT '→ Table test_cases exists, skipping';
GO

-- ── test_executions ───────────────────────────────────────────────
--  NOTE: testCaseId uses NO ACTION (not CASCADE/SET NULL) to avoid
--        the multi-path cascade conflict in SQL Server.
--        Orphan cleanup is handled by the application layer.
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'test_executions' AND xtype = 'U')
BEGIN
    CREATE TABLE test_executions (
        id         INT            IDENTITY(1,1) PRIMARY KEY,
        testCaseId INT            NULL,
        projectId  INT            NOT NULL,
        sprint     NVARCHAR(100)  DEFAULT 'Sprint 1',
        status     NVARCHAR(50)   DEFAULT 'Passed'
                       CONSTRAINT chk_exec_st
                       CHECK (status IN ('Passed','Failed','Skipped')),
        duration   NVARCHAR(50),
        executedAt DATETIME2      DEFAULT GETDATE(),
        executedBy NVARCHAR(255),
        createdAt  DATETIME2      DEFAULT GETDATE(),
        updatedAt  DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT fk_exec_project
            FOREIGN KEY (projectId)  REFERENCES projects(id)   ON DELETE CASCADE,
        CONSTRAINT fk_exec_testcase
            FOREIGN KEY (testCaseId) REFERENCES test_cases(id) ON DELETE NO ACTION
    );
    PRINT '✓ Table test_executions created';
END
ELSE
    PRINT '→ Table test_executions exists, skipping';
GO

-- ── meetings ──────────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'meetings' AND xtype = 'U')
BEGIN
    CREATE TABLE meetings (
        id         INT            IDENTITY(1,1) PRIMARY KEY,
        title      NVARCHAR(255)  NOT NULL,
        tag        NVARCHAR(100),
        tagColor   NVARCHAR(100)  DEFAULT 'var(--pu)',
        tagBg      NVARCHAR(200)  DEFAULT 'rgba(167,139,250,.12)',
        date       DATE           NOT NULL,
        time       NVARCHAR(100),
        attendees  INT            DEFAULT 0,
        status     NVARCHAR(50)   DEFAULT 'upcoming'
                       CONSTRAINT chk_meet_st
                       CHECK (status IN ('upcoming','past')),
        notes      NVARCHAR(MAX),
        meetingUrl NVARCHAR(500),
        createdAt  DATETIME2      DEFAULT GETDATE(),
        updatedAt  DATETIME2      DEFAULT GETDATE()
    );
    PRINT '✓ Table meetings created';
END
ELSE
    PRINT '→ Table meetings exists, skipping';
GO

-- ── activity_logs ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'activity_logs' AND xtype = 'U')
BEGIN
    CREATE TABLE activity_logs (
        id         INT            IDENTITY(1,1) PRIMARY KEY,
        action     NVARCHAR(500)  NOT NULL,
        entityType NVARCHAR(100),
        entityId   INT,
        icon       NVARCHAR(50)   DEFAULT N'●',
        iconColor  NVARCHAR(100)  DEFAULT 'var(--lime)',
        userId     INT,
        metadata   NVARCHAR(MAX),    -- stored as JSON string
        createdAt  DATETIME2      DEFAULT GETDATE(),
        updatedAt  DATETIME2      DEFAULT GETDATE()
    );
    PRINT '✓ Table activity_logs created';
END
ELSE
    PRINT '→ Table activity_logs exists, skipping';
GO

-- ── sprint_data ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'sprint_data' AND xtype = 'U')
BEGIN
    CREATE TABLE sprint_data (
        id        INT            IDENTITY(1,1) PRIMARY KEY,
        projectId INT            NULL,
        sprint    NVARCHAR(100)  NOT NULL,
        totalExec INT            DEFAULT 0,
        passed    INT            DEFAULT 0,
        failed    INT            DEFAULT 0,
        skipped   INT            DEFAULT 0,
        passRate  FLOAT          DEFAULT 0,
        trend     NVARCHAR(MAX)  DEFAULT N'[]',   -- JSON array of pass-rate snapshots
        createdAt DATETIME2      DEFAULT GETDATE(),
        updatedAt DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT fk_sprint_project
            FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
    );
    PRINT '✓ Table sprint_data created';
END
ELSE
    PRINT '→ Table sprint_data exists, skipping';
GO


-- ── 3. SEED DATA ────────────────────────────────────────────────
--  Each block only runs when the table is still empty.

-- ── users ────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM users)
BEGIN
    INSERT INTO users
        (firstName, lastName, email, password, role, department, location, timezone, bio, github, linkedin, isActive)
    VALUES
        ('Muhammed', 'Shahin', 'shahin@qanexus.com',
         '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh3y',
         'QA Lead', 'Engineering', 'Kerala, India', 'Asia/Kolkata',
         'Senior QA Lead with 6+ years of experience in test automation, API testing, and quality assurance across fintech and e-commerce domains.',
         'github.com/mshahin', 'linkedin.com/in/mshahin', 1);
    PRINT '✓ User seeded  →  shahin@qanexus.com / admin123';
END
ELSE
    PRINT '→ users has data, skipping';
GO

-- ── projects ─────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM projects)
BEGIN
    INSERT INTO projects (name, status, health, passRate, testCasesCount, description) VALUES
    ('E-Commerce Platform',      'Active',    'Excellent', 94, 245, 'Comprehensive testing for the e-commerce platform including checkout, payment processing, and user management.'),
    ('Mobile Banking App',       'Active',    'Good',      88, 312, 'Mobile banking application testing covering authentication, transactions, and security.'),
    ('Customer Portal',          'Pending',   'Average',   78, 156, 'Customer-facing portal testing including account management and support workflows.'),
    ('Analytics Dashboard',      'Active',    'Excellent', 96, 198, 'Data analytics dashboard testing covering charts, reports, and data accuracy.'),
    ('Inventory Management',     'Completed', 'Excellent', 98, 267, 'Inventory system testing covering stock tracking, alerts, and integrations.'),
    ('Payment Gateway',          'Active',    'Poor',      65, 189, 'Payment gateway integration testing covering all payment methods and security protocols.'),
    ('Social Media Integration', 'Hold',      'Average',   82, 134, 'Social media platform integration testing for authentication and content sharing.'),
    ('Reporting Module',         'Active',    'Good',      91, 176, 'Business reporting module testing covering export formats and scheduling.'),
    ('HR Management System',     'Hold',      'Average',   74,  98, 'HR management system testing covering payroll, attendance, and employee management workflows.');
    PRINT '✓ 9 Projects seeded';
END
ELSE
    PRINT '→ projects has data, skipping';
GO

-- ── bugs ──────────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM bugs)
BEGIN
    DECLARE @p1 INT, @p2 INT, @p3 INT, @p4 INT, @p5 INT,
            @p6 INT, @p7 INT, @p8 INT, @p9 INT;

    SELECT @p1 = id FROM projects WHERE name = 'E-Commerce Platform';
    SELECT @p2 = id FROM projects WHERE name = 'Mobile Banking App';
    SELECT @p3 = id FROM projects WHERE name = 'Customer Portal';
    SELECT @p4 = id FROM projects WHERE name = 'Analytics Dashboard';
    SELECT @p5 = id FROM projects WHERE name = 'Inventory Management';
    SELECT @p6 = id FROM projects WHERE name = 'Payment Gateway';
    SELECT @p7 = id FROM projects WHERE name = 'Social Media Integration';
    SELECT @p8 = id FROM projects WHERE name = 'Reporting Module';
    SELECT @p9 = id FROM projects WHERE name = 'HR Management System';

    INSERT INTO bugs (projectId, title, severity, status, reporter) VALUES
    (@p1, 'Cart total mismatch on discount applied',       'High',     'Open',        'Fathima Noor'),
    (@p1, 'Image lazy-load fails on Safari 17',            'Medium',   'In Progress', 'Muhammed Shahin'),
    (@p2, 'OTP not delivered on slow 4G connection',       'Critical', 'Open',        'Devika Raj'),
    (@p2, 'Balance update delayed after transaction',      'High',     'In Progress', 'Muhammed Shahin'),
    (@p3, 'Support ticket form fails on mobile viewport',  'High',     'Open',        'Fathima Noor'),
    (@p4, 'Chart tooltip flickers on window resize',       'Medium',   'Open',        'Muhammed Shahin'),
    (@p5, 'Export CSV column order inconsistent',          'Low',      'Resolved',    'Devika Raj'),
    (@p6, 'Payment timeout not handled gracefully',        'Critical', 'Open',        'Muhammed Shahin'),
    (@p6, '3DS redirect loop on failed auth',              'Critical', 'Open',        'Fathima Noor'),
    (@p6, 'Currency rounding error on large amounts',      'High',     'In Progress', 'Devika Raj'),
    (@p7, 'OAuth token refresh fails silently',            'High',     'Open',        'Muhammed Shahin'),
    (@p8, 'PDF export blank page on large datasets',       'High',     'Open',        'Fathima Noor'),
    (@p9, 'Payroll calculation wrong on leap year Feb',    'High',     'Open',        'Muhammed Shahin');
    PRINT '✓ 13 Bugs seeded';
END
ELSE
    PRINT '→ bugs has data, skipping';
GO

-- ── test_cases ────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM test_cases)
BEGIN
    DECLARE @tp1 INT, @tp2 INT, @tp3 INT, @tp4 INT, @tp5 INT,
            @tp6 INT, @tp7 INT, @tp8 INT, @tp9 INT;

    SELECT @tp1 = id FROM projects WHERE name = 'E-Commerce Platform';
    SELECT @tp2 = id FROM projects WHERE name = 'Mobile Banking App';
    SELECT @tp3 = id FROM projects WHERE name = 'Customer Portal';
    SELECT @tp4 = id FROM projects WHERE name = 'Analytics Dashboard';
    SELECT @tp5 = id FROM projects WHERE name = 'Inventory Management';
    SELECT @tp6 = id FROM projects WHERE name = 'Payment Gateway';
    SELECT @tp7 = id FROM projects WHERE name = 'Social Media Integration';
    SELECT @tp8 = id FROM projects WHERE name = 'Reporting Module';
    SELECT @tp9 = id FROM projects WHERE name = 'HR Management System';

    INSERT INTO test_cases (projectId, name, category, description, expectedResult, status) VALUES
    (@tp1, 'Login Authentication',         'Functional',  'Verify login with valid credentials',         'User logged in successfully',      'Active'),
    (@tp1, 'Cart Management',              'UI',          'Add, remove, update items in cart',           'Cart updates correctly',           'Active'),
    (@tp1, 'Checkout Process',             'Functional',  'Complete full checkout flow',                 'Order placed successfully',        'Active'),
    (@tp1, 'Payment Flow',                 'Security',    'Verify payment with all methods',             'Payment processed securely',       'Active'),
    (@tp1, 'Mobile Responsiveness',        'Responsive',  'Test on 375px mobile viewport',              'Layout adapts correctly',          'Active'),
    (@tp2, 'OTP Verification',             'Security',    'Verify OTP delivery and validation',          'OTP delivered within 30s',         'Active'),
    (@tp2, 'Balance Display',              'Functional',  'Check real-time balance updates',             'Balance updates within 2s',        'Active'),
    (@tp2, 'Transaction History',          'Integration', 'Fetch and display past transactions',         'All transactions listed correctly', 'Active'),
    (@tp3, 'Account Management',           'Functional',  'Create, update, delete accounts',             'Account operations succeed',       'Active'),
    (@tp3, 'Support Ticket Submission',    'UI',          'Submit a support ticket via form',            'Ticket created and confirmed',     'Active'),
    (@tp4, 'Chart Rendering',              'UI',          'Verify all chart types render correctly',     'Charts display without errors',    'Active'),
    (@tp4, 'Data Export',                  'Functional',  'Export reports as CSV and PDF',               'Files download correctly',         'Active'),
    (@tp5, 'Stock Tracking',               'Functional',  'Track inventory stock levels in real-time',   'Stock levels accurate',            'Active'),
    (@tp5, 'Low Stock Alerts',             'Integration', 'Trigger alert when stock drops below limit',  'Alert triggered at threshold',     'Active'),
    (@tp6, 'Payment Gateway Integration',  'Integration', 'Test all payment gateway API endpoints',      'All endpoints respond correctly',  'Active'),
    (@tp6, 'Security Headers Verification','Security',    'Verify HTTPS and required security headers',  'All headers present and correct',  'Active'),
    (@tp7, 'OAuth Social Login',           'Security',    'Login via Facebook and Google OAuth',         'OAuth redirects and tokens work',  'Active'),
    (@tp8, 'PDF Report Generation',        'Functional',  'Generate and download PDF reports',           'PDF generated correctly',          'Active'),
    (@tp9, 'Payroll Calculation',          'Functional',  'Verify monthly payroll computation accuracy', 'Payroll amounts correct',          'Active'),
    (@tp9, 'Attendance Tracking',          'Integration', 'Track and report daily attendance',           'Attendance recorded correctly',    'Active');
    PRINT '✓ 20 Test Cases seeded';
END
ELSE
    PRINT '→ test_cases has data, skipping';
GO

-- ── test_executions ───────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM test_executions)
BEGIN
    DECLARE @xp1 INT, @xp2 INT, @xp6 INT;
    SELECT @xp1 = id FROM projects WHERE name = 'E-Commerce Platform';
    SELECT @xp2 = id FROM projects WHERE name = 'Mobile Banking App';
    SELECT @xp6 = id FROM projects WHERE name = 'Payment Gateway';

    INSERT INTO test_executions (projectId, sprint, status, duration, executedBy) VALUES
    (@xp1, 'Sprint 6', 'Passed',  '1.2s', 'Muhammed Shahin'),
    (@xp1, 'Sprint 6', 'Passed',  '0.8s', 'Muhammed Shahin'),
    (@xp1, 'Sprint 6', 'Failed',  '3.4s', 'Fathima Noor'),
    (@xp1, 'Sprint 6', 'Passed',  '1.1s', 'Muhammed Shahin'),
    (@xp1, 'Sprint 5', 'Passed',  '0.9s', 'Devika Raj'),
    (@xp1, 'Sprint 5', 'Skipped', NULL,   'Muhammed Shahin'),
    (@xp2, 'Sprint 6', 'Passed',  '2.1s', 'Fathima Noor'),
    (@xp2, 'Sprint 6', 'Failed',  '1.8s', 'Muhammed Shahin'),
    (@xp6, 'Sprint 6', 'Failed',  '5.2s', 'Devika Raj'),
    (@xp6, 'Sprint 6', 'Passed',  '1.5s', 'Muhammed Shahin');
    PRINT '✓ 10 Test Executions seeded';
END
ELSE
    PRINT '→ test_executions has data, skipping';
GO

-- ── sprint_data ───────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sprint_data)
BEGIN
    DECLARE @sp1 INT;
    SELECT @sp1 = id FROM projects WHERE name = 'E-Commerce Platform';

    INSERT INTO sprint_data (projectId, sprint, totalExec, passed, failed, skipped, passRate, trend) VALUES
    (@sp1, 'Sprint 1', 280, 210, 52, 18, 75, N'[68,70,72,71,73,74,75,75]'),
    (@sp1, 'Sprint 2', 310, 248, 44, 18, 80, N'[75,77,78,79,79,80,80,80]'),
    (@sp1, 'Sprint 3', 340, 278, 44, 18, 82, N'[80,81,81,82,82,82,83,82]'),
    (@sp1, 'Sprint 4', 368, 306, 44, 18, 83, N'[82,82,83,83,84,83,83,83]'),
    (@sp1, 'Sprint 5', 410, 352, 40, 18, 86, N'[83,84,84,85,85,86,86,86]'),
    (@sp1, 'Sprint 6', 456, 398, 42, 16, 87, N'[85,86,86,87,87,87,88,87]');
    PRINT '✓ 6 Sprint records seeded';
END
ELSE
    PRINT '→ sprint_data has data, skipping';
GO

-- ── meetings ──────────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM meetings)
BEGIN
    INSERT INTO meetings (title, tag, tagColor, tagBg, date, time, attendees, status) VALUES
    ('Sprint Planning - Q2',            'planning', 'var(--pu)', 'rgba(167,139,250,.12)', '2026-04-10', '10:00 AM - 11:30 AM', 8,  'upcoming'),
    ('Test Case Review - E-Commerce',   'review',   'var(--cy)', 'rgba(56,189,248,.12)',  '2026-04-08', '2:00 PM - 3:00 PM',   5,  'upcoming'),
    ('QA Team Sync',                    'sync',     'var(--tl)', 'rgba(74,230,200,.12)',  '2026-04-07', '9:00 AM - 9:30 AM',   12, 'upcoming'),
    ('Bug Triage Meeting',              'triage',   'var(--am)', 'rgba(255,181,71,.12)',  '2026-03-28', '3:00 PM - 4:00 PM',   6,  'past'),
    ('Automation Strategy Discussion',  'strategy', '#22c55e',   'rgba(34,197,94,.12)',   '2026-03-25', '11:00 AM - 12:00 PM', 10, 'past');
    PRINT '✓ 5 Meetings seeded';
END
ELSE
    PRINT '→ meetings has data, skipping';
GO

-- ── activity_logs ─────────────────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM activity_logs)
BEGIN
    INSERT INTO activity_logs (action, entityType, icon, iconColor) VALUES
    (N'Muhammed Shahin resolved BUG-004 — Stale search results',  'bug',       N'✓', 'var(--lime)'),
    (N'Fathima Noor opened BUG-007 — API rate limit bypass',      'bug',       N'+', 'var(--rd)'),
    (N'Sprint 6 suite kicked off — 285 tests queued',             'execution', N'▶', 'var(--cy)'),
    (N'New upload: Performance Report.pdf',                        'upload',    N'↑', 'var(--am)'),
    (N'Devika Raj completed Notifications module',                 'project',   N'✓', 'var(--pu)');
    PRINT '✓ 5 Activity logs seeded';
END
ELSE
    PRINT '→ activity_logs has data, skipping';
GO


-- ── 4. VERIFY ───────────────────────────────────────────────────
PRINT '';
PRINT '========== VERIFICATION ==========';
SELECT 'users'           AS [Table], COUNT(*) AS [Rows] FROM users          UNION ALL
SELECT 'projects',        COUNT(*) FROM projects        UNION ALL
SELECT 'bugs',            COUNT(*) FROM bugs            UNION ALL
SELECT 'test_cases',      COUNT(*) FROM test_cases      UNION ALL
SELECT 'test_executions', COUNT(*) FROM test_executions UNION ALL
SELECT 'meetings',        COUNT(*) FROM meetings        UNION ALL
SELECT 'activity_logs',   COUNT(*) FROM activity_logs   UNION ALL
SELECT 'sprint_data',     COUNT(*) FROM sprint_data;
PRINT '==================================';
PRINT 'Setup complete!';
PRINT 'Login:  shahin@qanexus.com  /  admin123';
GO
