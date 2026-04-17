# QA Nexus Dashboard — Project Constitution

> This document defines the existing architecture, stack, modules, and rules that all future work must respect.
> Any AI assistant or developer working on this codebase must read this first.

---

## EXISTING STACK (do not change)

| Layer       | Technology                                    |
|-------------|-----------------------------------------------|
| Frontend    | React 18 + Vite 5                             |
| Backend     | Node.js + Express 4                           |
| Database    | Sequelize ORM → SQLite (dev) / MSSQL (prod)   |
| Auth        | JWT (7-day expiry, bcrypt, OTP password reset) |
| Real-time   | Socket.io 4.6                                 |
| AI          | Anthropic SDK (Claude) + multi-provider via OpenRouter/Groq/OpenAI/Google/Mistral/Together |
| File Upload | Multer → disk storage                         |
| CSS         | Custom CSS Variables (dark/light themes) — no Tailwind, no CSS-in-JS, no component library |
| Charts      | Custom SVG components (Donut, AreaChart, ProgBar, SparkBar) in `Charts.jsx` |

**Key Dependencies (do not swap):**
- Frontend: react, react-dom, axios, socket.io-client, xlsx
- Backend: express, sequelize, sqlite3, tedious, jsonwebtoken, bcryptjs, multer, cheerio, @anthropic-ai/sdk, nodemailer, socket.io, cors, compression, morgan, dotenv

---

## EXISTING MODULES (do not modify unless explicitly asked)

### Core Modules (22 total)

| # | Module               | Frontend                           | Backend                                  | DB Models                        |
|---|----------------------|------------------------------------|------------------------------------------|----------------------------------|
| 1 | Dashboard            | `DashboardPage.jsx`                | `analyticsController.js`                 | aggregated queries               |
| 2 | Projects             | `ProjectsPage.jsx`                 | `projectController.js`                   | Project                          |
| 3 | Project Detail       | `ProjectInnerPage.jsx` (10 tabs)   | project + bugs + testcases + qa-agent    | Project, Bug, TestCase, QAAgentRun |
| 4 | Bugs                 | `KanbanBoard.jsx` + inline         | `bugController.js`                       | Bug                              |
| 5 | Test Cases           | inline in ProjectInnerPage         | `testCaseController.js`                  | TestCase                         |
| 6 | Test Executions      | inline in ProjectInnerPage         | `testCaseController.js`                  | TestExecution                    |
| 7 | QA Agent             | `QAAgentPage.jsx` + iframe(`qa-agent/`) | `qaAgentController.js`              | QAAgentConfig, QAAgentRun        |
| 8 | Meetings             | `MeetingsPage.jsx`                 | `meetingController.js`                   | Meeting                          |
| 9 | AI Chat Bot          | `ChatBotIcon.jsx`                  | `chatController.js`                      | ChatMessage                      |
| 10| Search               | `CommandPalette.jsx`               | `searchController.js`                    | cross-table queries              |
| 11| Notifications        | `NotificationCenter.jsx`           | `notifications.js` (util)                | Notification                     |
| 12| Audit Logs           | `AuditTimeline.jsx`                | via routes/chat.js                       | AuditLog                         |
| 13| Reports / Export     | inline in ProjectInnerPage         | `reportController.js`, `reportExportController.js` | aggregated queries   |
| 14| Analytics            | inline in DashboardPage            | `analyticsController.js`                 | aggregated queries               |
| 15| File Upload/Import   | inline in ProjectInnerPage         | `uploadController.js`                    | bulk insert into TestCase/Bug    |
| 16| User Profile         | `ProfilePage.jsx`                  | `authController.js`                      | User                             |
| 17| Auth                 | `LoginPage.jsx`, `AuthContext.jsx` | `authController.js`                      | User                             |
| 18| Settings             | `SettingsPage.jsx`                 | `cicdController.js`, `integrationsController.js` | CICDApiKey, ScheduledReport, IntegrationWebhook |
| 19| Tags                 | inline                             | `tagController.js`                       | Tag, TestCaseTag                 |
| 20| Flakiness Tracker    | `FlakinessTable.jsx`               | `flakinessController.js`                 | derived from TestExecution       |
| 21| CI/CD Integration    | inline in Settings                 | `cicdController.js`                      | CICDApiKey                       |
| 22| Integrations         | `IntegrationSettings.jsx`          | `integrationsController.js`              | IntegrationWebhook               |

### QA Agent Sub-modules (inside `frontend/public/qa-agent/`)
- **Site Crawler** — multi-strategy: sitemap → robots.txt → Next.js __NEXT_DATA__ → BFS link crawl → Playwright fallback
- **Test Case Generator** — batched AI generation per category (FN, UIUX, SEC, API, PERF, SEO, CONT) with self-critique pass
- **Automation Script Generator** — Playwright/Cypress/Selenium/Puppeteer code generation from test cases
- **Page Analysis** — Cheerio-based form/button/image/heading/interactive element extraction
- **Previous Runs** — run history with re-run and resume support

---

## FOLDER STRUCTURE (canonical)

```
qa-dashboard/
├── frontend/
│   ├── public/
│   │   └── qa-agent/              # Standalone QA Agent module (vanilla JS, loaded in iframe)
│   │       ├── index.html
│   │       ├── qa-agent.js        # ~3600 LOC, all QA Agent logic
│   │       └── qa-agent.css
│   └── src/
│       ├── api/
│       │   └── client.js          # Axios instance + ALL API functions (40+)
│       ├── components/
│       │   ├── layout/            # Sidebar.jsx, Topbar.jsx
│       │   └── ui/                # 14 reusable components
│       ├── context/
│       │   └── AuthContext.jsx    # JWT auth provider
│       ├── hooks/
│       │   ├── useSocket.js       # Socket.io event subscriptions
│       │   └── useKeyboardShortcuts.js
│       ├── pages/                 # 8 page components
│       ├── styles/
│       │   └── globals.css        # CSS variables, theme, utility classes
│       ├── App.jsx                # Router + state + page switching
│       └── main.jsx               # React 18 entry
├── backend/
│   ├── controllers/               # 18 controller files
│   ├── routes/                    # 19 route files
│   ├── models/
│   │   └── index.js               # ALL 18 Sequelize models in one file
│   ├── middleware/                 # auth.js, rbac.js, upload.js
│   ├── socket/
│   │   └── handlers.js            # Socket.io room management + broadcast
│   ├── utils/                     # dbWatcher, mailer, notifications, projectUtils
│   ├── seeders/
│   │   └── seed.js
│   ├── uploads/                   # User file storage
│   └── server.js                  # Express app + Socket.io + DB sync + migrations
├── CONSTITUTION.md                # This file
└── specs/                         # Feature specifications (per-module)
```

---

## DATABASE SCHEMA (18 models)

```
users ─────────────┬──> qa_agent_configs (1:1)
                   ├──> qa_agent_runs (1:many)
                   ├──> chat_messages (1:many)
                   ├──> notifications (1:many)
                   ├──> audit_logs (1:many)
                   ├──> scheduled_reports (1:many)
                   ├──> cicd_api_keys (1:many)
                   └──> integration_webhooks (1:many)

projects ──────────┬──> bugs (1:many)
                   ├──> test_cases (1:many)
                   ├──> test_executions (1:many)
                   ├──> sprint_data (1:many)
                   └──> qa_agent_runs (1:many)

test_cases ────────┬──> test_executions (1:many)
                   └──> test_case_tags (many:many via junction) ──> tags

meetings (standalone)
activity_logs (standalone, FK to users)
```

---

## RULES FOR NEW WORK

### Architecture Rules
1. Follow the existing folder structure — pages in `src/pages/`, reusable components in `src/components/ui/`, layout in `src/components/layout/`
2. All API functions go in `src/api/client.js` — do not create separate API files per module
3. All Sequelize models go in `backend/models/index.js` — do not create separate model files
4. Backend follows controller → route pattern — one controller file + one route file per feature
5. New routes must be registered in `backend/server.js` with the `/api/` prefix

### Coding Style Rules
6. Frontend: functional components only, React 18 hooks (useState, useEffect, useCallback, useMemo, useRef)
7. Frontend: inline styles using style objects — no CSS modules, no Tailwind, no styled-components
8. Frontend: use `var(--tx)`, `var(--t2)`, `var(--t3)`, `var(--bg)`, `var(--bc)`, `var(--b2)`, `var(--bd)`, `var(--lime)`, `var(--rd)`, `var(--am)`, `var(--tl)`, `var(--cy)`, `var(--pu)` CSS variables for theming
9. Backend: CommonJS `require()` / `exports.*` — no ES modules
10. Backend: async/await with try/catch, return `res.json()` or `res.status(N).json({ error: ... })`
11. Use the existing `Cd` card wrapper component (defined in ProjectInnerPage) for cards
12. Use the existing `StatRow`, `BarRow`, `StatPair` components for stat displays

### Integration Rules
13. All authenticated routes must use the `auth` middleware
14. Role-restricted routes must use `rbac(['Admin', 'QA Lead'])` etc.
15. Real-time updates: broadcast via `req.io` (injected by middleware) using `broadcast(io, event, data)` from `socket/handlers.js`
16. File uploads: use the existing `upload` middleware from `middleware/upload.js`
17. Activity logging: create `ActivityLog` entries for important actions
18. Notifications: use the `createNotification()` util for user-facing notifications

### Quality Rules
19. Never edit existing files without showing a diff first
20. Reuse existing components and utilities before creating new ones
21. Match the visual style of existing pages (font sizes, spacing, border radius, color palette)
22. All new endpoints need error handling (try/catch with 500 status)
23. Test new features against both dark and light themes
24. Do not introduce new npm dependencies without explicit approval

---

## API ROUTE MAP

| Prefix              | Route File          | Controller                | Auth Required |
|---------------------|---------------------|---------------------------|---------------|
| `/api/auth`         | `auth.js`           | `authController`          | Partial       |
| `/api/projects`     | `projects.js`       | `projectController`       | Yes           |
| `/api/bugs`         | `bugs.js`           | `bugController`           | Yes           |
| `/api/test-cases`   | `testcases.js`      | `testCaseController`      | Yes           |
| `/api/meetings`     | `meetings.js`       | `meetingController`       | Yes           |
| `/api/uploads`      | `uploads.js`        | `uploadController`        | Yes           |
| `/api/analytics`    | `analytics.js`      | `analyticsController`     | Yes           |
| `/api/activity`     | `activity.js`       | (inline)                  | Yes           |
| `/api/reports`      | `reports.js`        | `reportController`        | Yes           |
| `/api/reports`      | `reportExport.js`   | `reportExportController`  | Yes           |
| `/api/qa-agent`     | `qaAgent.js`        | `qaAgentController`       | Yes           |
| `/api/chat`         | `chat.js`           | `chatController`          | Yes           |
| `/api/search`       | `search.js`         | `searchController`        | Yes           |
| `/api/admin`        | `admin.js`          | `adminController`         | Yes + RBAC    |
| `/api`              | `cicd.js`           | `cicdController`          | API Key       |
| `/api/tags`         | `tags.js`           | `tagController`           | Yes           |
| `/api/flakiness`    | `flakiness.js`      | `flakinessController`     | Yes           |
| `/api/integrations` | `integrations.js`   | `integrationsController`  | Yes           |

---

## THEME VARIABLES (reference)

```css
/* Dark theme (default) */
--bg: #121418;   --bc: #1a1d23;   --b2: #22252b;   --bd: #2d3039;
--tx: #eaf0f6;   --t2: #9ca3af;   --t3: #6b7280;
--lime: #C8E64A; --rd: #FF4D4D;   --am: #FFB547;   --tl: #4AE6C8;
--cy: #38BDF8;   --pu: #A78BFA;

/* Light theme (.light class) */
--bg: #F0F2F7;   --bc: #FFFFFF;   --b2: #F7F8FA;   --bd: #E2E5EB;
--tx: #1a1d23;   --t2: #6b7280;   --t3: #9ca3af;
```

---

## Socket.io Events (reference)

| Event                      | Direction     | Payload                            |
|----------------------------|---------------|------------------------------------|
| `project:created/updated/deleted` | Server→Client | `{ id, name, ... }`         |
| `bug:created/updated/deleted`     | Server→Client | `{ id, title, severity, ... }` |
| `testcase:created/updated`        | Server→Client | `{ id, name, ... }`         |
| `execution:created`               | Server→Client | `{ id, status, ... }`       |
| `testcases:bulk_imported`         | Server→Client | `{ count }`                 |
| `bugs:bulk_imported`              | Server→Client | `{ count }`                 |
| `executions:bulk_imported`        | Server→Client | `{ count }`                 |
| `qa-agent:run-created`            | Server→Client | `{ id, url, passRate }`     |
| `activity:new`                    | Server→Client | `{ action, icon, ... }`     |
| `user:updated`                    | Server→Client | `{ id, ... }`               |
