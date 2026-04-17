# Project Detail Page — Specification

## Overview
Multi-tab project detail view showing all QA data for a single project: bugs, test cases, executions, QA Agent results, API testing, performance, 404 pages, and broken links.

## Component
`frontend/src/pages/ProjectInnerPage.jsx` — single file containing the main page + all tab components.

## Tabs (10 total)
| # | Tab Name     | Component      | Data Source | Description |
|---|-------------|----------------|-------------|-------------|
| 1 | Overview    | `OverviewTab`  | TestCase API | Test case stats, pass/fail rates, API & perf summaries |
| 2 | Details     | `DetailsTab`   | Project + Bug API | Project info, bug breakdown by severity |
| 3 | Bugs        | `BugsTab`      | Bug + TestCase API | Kanban/list view, failed test cases as virtual bugs |
| 4 | Test Cases  | `TestCasesTab` | TestCase API + Upload | Manual test case upload (Excel/CSV), category analysis, AI insights |
| 5 | Execution   | `ExecutionTab` | Execution + TestCase API | Execution results, pass/fail/skip filtering, AI execution analysis |
| 6 | QA Agent    | `QAAgentTab`   | QAAgentRun API | AI-generated test cases, run history, aggregate stats |
| 7 | API Testing | `APITestingTab`| Upload API | Postman integration, JSON/Excel upload |
| 8 | Performance | `PerformanceTab` | (placeholder) | Performance metrics display |
| 9 | 404 Pages   | `Pages404Tab`  | (placeholder) | Broken page detection results |
| 10| Broken Links| `BrokenLinksTab` | (placeholder) | Link health check results |

## Tab Architecture
- Lazy loading: only active tab renders (conditional `tab === 'X' ? <Component /> : null`)
- Overview and Details tabs always render (lightweight)
- Each tab manages its own state and data fetching

## Key Sub-components Used
- `Cd` — card wrapper (defined inline)
- `StatRow`, `BarRow`, `StatPair` — stat display helpers (defined inline)
- `KanbanBoard` — drag-drop bug board (from `components/ui/`)
- `FileViewerModal` — Excel file preview (defined inline)
- `Donut`, `ProgBar` — charts (from `components/ui/Charts.jsx`)

## Data Flow
```
ProjectInnerPage mounts
  → Promise.all([getProject, getBugs, getTestCases])
  → Sets project, bugs, failedTestCases state
  → bugsBreakdown computed via useMemo (real bugs + failed test cases)
  → Tab content renders with project data passed as props
```

## Real-time Updates
- Listens to: `project:updated`, `bug:created`, `bug:updated` via `useSocket`
- Auto-reloads project + bugs on any of these events

## QA Agent Tab (sub-tabs)
1. **Overview** — aggregate stats across all runs, execution summary, categories, latest run
2. **Test Cases** — searchable table of all AI-generated test cases from all runs
3. **Runs History** — expandable run cards showing test case details on click
