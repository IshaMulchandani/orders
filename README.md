# Ordering System

Salesman-to-accounts order coordination app for a B2B product company. Orders flow from Salesmen → Accounts (billing) → Packaging & Shipping → Accounts (payment) → Done, with a Partner role that can see and act on everything. See `PLAN.md` for the full architecture, data model, and phased build plan.

## Stack

- **Backend**: Django + Django REST Framework, Postgres, Google OAuth (verified server-side, JWT sessions)
- **Frontend**: React + Vite + TypeScript + Tailwind, installable as a PWA
- **Hosting** (free tier): Supabase (Postgres) + Render (backend) + Vercel (frontend)

## Repo layout

```
backend/    Django + DRF API — see backend/README.md
frontend/   React + Vite PWA — see frontend/README.md
PLAN.md     Full architecture, data model, and phase-by-phase build plan
docker-compose.yml   Local Postgres for development
```

This is a monorepo by design — most features touch both backend and frontend, and one PR per feature keeps the two in sync. See `PLAN.md` section 2 for the reasoning.

## Getting started

1. `docker compose up -d db` — starts a local Postgres.
2. Follow `backend/README.md` to set up and run the API.
3. Follow `frontend/README.md` to set up and run the web app.

## Status

Phase 0 (scaffolding) complete. See `PLAN.md` section 7 for the phase-by-phase task breakdown and current progress.
