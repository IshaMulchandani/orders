# Frontend — Ordering System

React + Vite + TypeScript + Tailwind PWA. See root `PLAN.md` for the full architecture and phased build plan.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in values.
3. Start the dev server: `npm run dev` → `http://localhost:5173`

## Project layout

```
src/
  api/          Shared Axios client (single source for API calls)
  components/   Reusable UI building blocks (SearchableDropdown, OrderStatusPill, etc. — Phase 3+)
  hooks/        useAuth, useRole, useNotifications (Phase 1+)
  pages/        Route-level pages (Login, Orders, OrderDetail, History, admin/*)
  App.tsx       Route table
  main.tsx      Entry point, router + PWA setup
```

Routes and pages are added phase by phase per `PLAN.md` section 6 — only `Login` and `Orders` exist as placeholders right now.
