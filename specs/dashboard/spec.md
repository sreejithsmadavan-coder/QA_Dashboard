# Dashboard Module — Specification

## Overview
Main landing page showing aggregated QA metrics across all projects: project health, bug counts, test case stats, sprint progress, and activity feed.

## Component
`frontend/src/pages/DashboardPage.jsx`

## Data Sources
- `GET /api/analytics/dashboard` — aggregate project stats, bug counts, test totals
- `GET /api/analytics/sprints` — sprint-level pass/fail data
- `GET /api/activity` — recent activity feed
- `GET /api/projects` — project listing for quick access

## Key Sections
1. **Metric Cards** — total projects, total bugs (by severity), total test cases, overall pass rate
2. **Sprint Overview** — sprint-by-sprint pass/fail/skip chart with trend lines
3. **Project Health Grid** — project cards showing health status, bug counts, pass rates
4. **Activity Feed** — recent actions across all projects (creates, updates, imports)
5. **Quick Actions** — create project, import test cases, navigate to QA Agent

## Charts Used
- `Donut` — pass/fail ratio
- `AreaChart` — sprint trends
- `ProgBar` — progress indicators
- `SparkBar` — compact bar charts in cards

## Real-time Updates
- Socket events trigger data reload for activity feed
- DB Watcher (5s polling) syncs dashboard stats
