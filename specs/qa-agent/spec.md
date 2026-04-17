# QA Agent Module — Specification

## Overview
AI-powered test case generation engine that crawls websites, analyzes page structure, and generates exhaustive test cases across 7 categories using LLM providers.

## Architecture
- **Frontend**: Standalone vanilla JS module in `frontend/public/qa-agent/` loaded inside an iframe
- **Host page**: `frontend/src/pages/QAAgentPage.jsx` — manages iframe ↔ backend communication via `postMessage`
- **Backend**: `backend/controllers/qaAgentController.js` — site crawling, config, run persistence

## Data Flow
```
User Input (iframe) 
  → postMessage('crawl-request') → QAAgentPage.jsx 
  → API POST /api/qa-agent/crawl → qaAgentController.crawlSite()
  → postMessage('crawl-result') back to iframe
  → iframe calls AI provider directly (browser-side fetch)
  → postMessage('run-saved') → QAAgentPage.jsx 
  → API POST /api/qa-agent/runs → saved to qa_agent_runs table
```

## Site Crawler (5 strategies, executed in order)
1. **Sitemap.xml** — parse sitemap + sitemap_index + robots.txt Sitemap directives
2. **BFS link crawl** — Cheerio + regex href extraction, depth-limited traversal
3. **Next.js __NEXT_DATA__** — extract routes from SSR hydration JSON
4. **Page structure analysis** — Cheerio: forms, buttons, images, headings, interactive elements, meta tags
5. **Playwright deep crawl** — optional fallback when static crawl finds <5 pages

## Test Generation Pipeline
1. Crawl site → discover pages with real structure
2. Split pages into batches (8 pages per batch)
3. For each category × batch: call AI with `buildPrompt()` including real page elements
4. Stream results → throttled UI updates (500ms) → parse pipe-delimited test cases
5. Self-critique pass: second AI call reviews and refines generated test cases
6. Page-validation filter: strip cases referencing non-existent paths
7. Renumber test case IDs sequentially

## Test Categories
| ID   | Label       | Focus Areas |
|------|-------------|-------------|
| FN   | Functional  | Forms, navigation, state, error handling, edge cases |
| UIUX | UI/UX       | Layout, typography, responsive, accessibility, states |
| SEC  | Security    | XSS, injection, auth, headers, data exposure, CORS |
| API  | API Testing | CRUD, validation, auth, error handling, performance |
| PERF | Performance | Core Web Vitals, network, assets, caching, stability |
| SEO  | SEO         | Meta tags, headings, images, technical SEO, links |
| CONT | Content     | Accuracy, completeness, formatting, links, encoding |

## AI Providers Supported
Groq, OpenAI, OpenRouter, Anthropic, Google AI Studio, Together AI, Mistral AI

## Database Models
- `QAAgentConfig` — per-user settings (provider, apiKey, state)
- `QAAgentRun` — run results (projectId, url, testCases JSON, passRate, etc.)

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/qa-agent/config` | Get user config |
| PUT    | `/api/qa-agent/config` | Save config |
| POST   | `/api/qa-agent/crawl` | Crawl a website |
| GET    | `/api/qa-agent/runs` | List user's runs |
| POST   | `/api/qa-agent/runs` | Save a run |
| GET    | `/api/qa-agent/runs/project/:projectId` | Runs for a project |
| GET    | `/api/qa-agent/runs/:id` | Single run detail |
| DELETE | `/api/qa-agent/runs/:id` | Delete a run |

## Timeouts & Performance
- AI fetch: 120s initial, 45s stream stall detection
- Crawl: 90s total (iframe + axios + backend 75s budget)
- Streaming UI: throttled to 2 updates/second
- Per-page fetch: 8s, status check: 6s
