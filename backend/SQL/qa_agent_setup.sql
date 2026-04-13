-- ================================================================
--  QA NEXUS  —  QA Agent Module Tables (SQL Server)
-- ================================================================
--  Run after qa_nexus_setup.sql
--  Safe to re-run: every block checks before creating.
-- ================================================================

USE qa_nexus;
GO

-- ── qa_agent_configs ────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'qa_agent_configs' AND xtype = 'U')
BEGIN
    CREATE TABLE qa_agent_configs (
        id          INT            IDENTITY(1,1) PRIMARY KEY,
        userId      INT            NOT NULL UNIQUE,
        provider    NVARCHAR(100)  DEFAULT 'groq',
        model       NVARCHAR(255),
        apiKey      NVARCHAR(MAX),
        url         NVARCHAR(500),
        siteType    NVARCHAR(100),
        categories  NVARCHAR(MAX),         -- JSON array
        notes       NVARCHAR(MAX),
        emailAddr   NVARCHAR(255),
        state       NVARCHAR(MAX),         -- JSON blob
        createdAt   DATETIME2      DEFAULT GETDATE(),
        updatedAt   DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT FK_qa_agent_configs_user
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    PRINT '✓ Table qa_agent_configs created';
END
ELSE
    PRINT '→ Table qa_agent_configs exists, skipping';
GO

-- ── qa_agent_runs ───────────────────────────────────────────────
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name = 'qa_agent_runs' AND xtype = 'U')
BEGIN
    CREATE TABLE qa_agent_runs (
        id            INT            IDENTITY(1,1) PRIMARY KEY,
        userId        INT            NOT NULL,
        projectId     INT            NULL,
        url           NVARCHAR(500),
        provider      NVARCHAR(100),
        model         NVARCHAR(255),
        categories    NVARCHAR(MAX),       -- JSON array
        status        NVARCHAR(50)   DEFAULT 'completed',
        totalTests    INT            DEFAULT 0,
        passCount     INT            DEFAULT 0,
        failCount     INT            DEFAULT 0,
        blockedCount  INT            DEFAULT 0,
        passRate      FLOAT          DEFAULT 0,
        durationMs    INT,
        results       NVARCHAR(MAX),       -- JSON
        bugs          NVARCHAR(MAX),       -- JSON array
        testCases     NVARCHAR(MAX),       -- JSON array
        reportHtml    NVARCHAR(MAX),
        createdAt     DATETIME2      DEFAULT GETDATE(),
        updatedAt     DATETIME2      DEFAULT GETDATE(),
        CONSTRAINT FK_qa_agent_runs_user
            FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
        CONSTRAINT FK_qa_agent_runs_project
            FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE SET NULL
    );
    PRINT '✓ Table qa_agent_runs created';

    CREATE INDEX IX_qa_agent_runs_user ON qa_agent_runs(userId, createdAt DESC);
    CREATE INDEX IX_qa_agent_runs_project ON qa_agent_runs(projectId);
    PRINT '✓ Indexes on qa_agent_runs created';
END
ELSE
    PRINT '→ Table qa_agent_runs exists, skipping';
GO

PRINT '';
PRINT '════════════════════════════════════════════════════════';
PRINT '  QA Agent tables ready';
PRINT '════════════════════════════════════════════════════════';
GO
