# QA Nexus Dashboard

Read `CONSTITUTION.md` before making any changes. It defines the full stack, all 22 modules, folder structure, coding conventions, and rules.

## Quick Reference

- **Frontend**: React 18 + Vite, inline styles with CSS variables, no component library
- **Backend**: Express + Sequelize, CommonJS, SQLite/MSSQL
- **Auth**: JWT via `middleware/auth.js`, RBAC via `middleware/rbac.js`
- **Real-time**: Socket.io, broadcast via `req.io`
- **All API functions**: `frontend/src/api/client.js` (single file)
- **All DB models**: `backend/models/index.js` (single file)
- **QA Agent**: standalone vanilla JS in `frontend/public/qa-agent/`, communicates via iframe postMessage

## Commands

```bash
# Frontend dev
cd frontend && npm run dev

# Backend dev
cd backend && npm run dev

# Build frontend
cd frontend && npm run build
```

## Feature Specs

Per-module specifications live in `specs/<module-name>/spec.md`. Check there before modifying a module.
