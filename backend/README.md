# Backend — Ordering System

Django + DRF API. See root `PLAN.md` for the full architecture and phased build plan.

## Local setup

1. Create a virtual environment and install dependencies:
   ```
   python -m venv venv
   source venv/bin/activate   # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Copy `.env.example` to `.env` and fill in values (a local Postgres is provided via the root `docker-compose.yml`).
3. Start Postgres (from the repo root): `docker compose up -d db`
4. Run migrations and start the dev server:
   ```
   python manage.py migrate
   python manage.py runserver
   ```
5. Confirm it's up: `http://localhost:8000/api/health/` should return `{"status": "ok"}`.

## Project layout

```
config/       Django project settings, root urls, wsgi/asgi
apps/
  common/     Reusable permission classes + mixins shared by every app
  users/      Accounts, roles, invitations (Phase 1)
  clients/    Client master data (Phase 2)
  products/   Product master data (Phase 2)
  orders/     Orders, order lines, status timeline (Phase 3-4)
  notifications/  In-app notification badges (Phase 5)
```

Each app is currently a skeleton (`apps.py` + placeholder `models.py`) — models and endpoints are filled in phase by phase per `PLAN.md`.
