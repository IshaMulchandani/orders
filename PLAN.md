# Ordering System — Implementation Plan

## 1. Confirmed decisions (from clarifying questions)

| Area | Decision |
|---|---|
| Auth | Google OAuth. Partners invite users by email; role pre-assigned to the invite. |
| Master data (Clients, Products) | CSV bulk import + in-app admin UI. Partner-only can add/edit/delete. **Name-only** — no code/SKU/notes/price fields, by design (Phase 2 decision). |
| Product price | **No default price on the Product model.** Always typed manually on every order line (Phase 2 decision, revises the earlier "default + override" plan). |
| Order number | Yearly prefix, e.g. `2026-00001`, resets Jan 1. |
| Currency / units | INR, price 2 decimals, quantity integer. |
| Order edit | Only while status = `Pending`. Salesman-creator or any Partner. |
| Cancellation | Salesman-creator or Partner while `Pending`. Partner-only after that. Accountants can never cancel. |
| GST / tax | Not stored in the app. Bills happen outside. |
| Audit trail | Full log: every status change + every edit, with user + timestamp. Rendered as a timeline on the order detail page. |
| Salesman visibility | Read-only list of ALL orders they created, across every stage. |
| Partner dashboard | Four active-stage tabs: Pending, Bill Created, Shipped, Payment Pending. |
| Done / Cancelled | Not tabs. Partners get in-app badge + toast when an order becomes Done or Cancelled → click routes to a chronological History page. |
| Team notifications | In-app badge only when an order lands on your team's queue. |
| Delete master data | Partner-only, confirm modal, HARD delete. Order lines snapshot the client/product name at creation so history stays readable. |
| PWA | Yes — installable, offline app-shell, data still requires network. |
| Hosting | Supabase (Postgres + Auth optional) + Render/Railway (Django backend) + Vercel (React frontend). All free-tier. |
| Order line price | No default price (Phase 2 decision) — must be ≥ ₹0.01, always typed manually. |
| Team order visibility | Current queue **plus** any order the user has personally acted on (via the audit trail), even after it moves to another team (Phase 3 decision — Partners still see everything). |
| Partner dashboard tabs | **3 active tabs**: Pending, Bill Created, Payment Pending — no "Shipped" tab, since an order never actually rests in that status (it auto-cascades straight to Payment Pending the instant Packaging marks it shipped). The "Marked shipped" moment is still fully visible in the order's audit timeline (Phase 4 decision, revises the earlier "four tabs" plan). |
| Available actions | Backend is the single source of truth: `OrderDetailSerializer.available_actions` calls the exact same validation the transition endpoint enforces, so the frontend can never show a button the backend would then reject (Phase 4 design). |
| Notifications (Phase 5) | In-app only, 30s polling (no websockets in v1). Fires on: order created → Accountants; Bill Created → Packaging; Shipped (auto-cascade to Payment Pending) → Accountants; Done → Partners; Cancelled → Partners. The acting user is never notified about their own action. Clicking a Done/Cancelled notification routes to `/history`; anything else routes to the order detail page. |
| History page | Partner-only, `/history` — Done + Cancelled orders, filterable by kind/date range/client-name search (`order_no` isn't filterable server-side since it's a computed year+seq property, not a DB column). |

## 2. System architecture

```
[ React PWA on Vercel ]  ── HTTPS/JWT ──▶  [ Django + DRF on Render ]  ──▶  [ Supabase Postgres ]
        │                                          │
        └── Google OAuth (client-side) ─────────────┘ (backend verifies id_token, mints JWT)
```

**Why this shape.** Frontend and backend are deployed independently so we can iterate on either without redeploying the other. Postgres lives in Supabase because their free tier is generous, backed up nightly, and we can grow into it. Django + DRF on Render gives us a real Python runtime with cron support (needed for a nightly cleanup job later). Google OAuth runs client-side (via `@react-oauth/google`), the backend only verifies the returned ID token and issues our own short-lived JWT — this keeps mobile-friendly session behaviour without cookies-across-domains headaches.

**Auth model.** Google OAuth ID token → backend verifies signature and email against the `Invitation` table → if the email is invited and not yet activated, the `User` row is created with the pre-assigned role → JWT (access + refresh) issued. Subsequent requests carry the access token in `Authorization: Bearer …`. Refresh token stored in `httpOnly` cookie or in-memory (mobile Safari has cookie quirks; we'll decide during build).

## 3. Data model (Django models)

```
User               (email, name, role[Partner|Salesman|Accountant|Packaging], is_active, created_at)
Invitation         (email, role, invited_by→User, token, expires_at, accepted_at)
Client             (name, created_by, created_at)   # name-only, hard-deletable
Product            (name, created_by, created_at)   # name-only, hard-deletable, no price field
Order              (order_no, client→Client(SET_NULL), client_name_snapshot,
                    salesman→User(PROTECT), status[Pending|BillCreated|Shipped|PaymentPending|Done|Cancelled],
                    year, seq, created_at, updated_at)
OrderLine          (order→Order, product→Product(SET_NULL), product_name_snapshot,
                    quantity[int≥1], price[Decimal 12,2])
OrderEvent         (order→Order, actor→User, kind[status_change|edit|created|cancelled],
                    from_status, to_status, payload_json, created_at)  # audit trail
Notification       (user→User, kind, order→Order(NULL), message, is_read, created_at)
```

Notes on the model:
- `client_name_snapshot` and `product_name_snapshot` are populated at order creation. If the master row is later hard-deleted, the FK becomes NULL but the snapshot preserves display.
- `order_no` is a computed unique field, formatted `{year}-{seq:05d}`. `year + seq` also stored as separate columns for indexing / next-number generation. A DB unique constraint on `(year, seq)` prevents duplicates under concurrency; we use a `SELECT … FOR UPDATE` in a transaction to allocate the next `seq`.
- `OrderEvent` is written via Django signals on `Order.save()` and explicit calls in status-change endpoints.
- `Notification.is_read` drives the in-app badge.

## 4. Order state machine

```
                (create by Salesman/Partner)
                          │
                          ▼
                      ┌────────┐   cancel (creator or Partner)
                      │Pending │ ─────────────────────────────▶ Cancelled
                      └────┬───┘
                           │ mark 'Bill Created' (Accountant or Partner)
                           ▼
                    ┌────────────┐   cancel (Partner only)
                    │Bill Created│ ─────────────────────────▶ Cancelled
                    └────┬───────┘
                         │ mark 'Shipped' (Packaging or Partner)
                         ▼
                    ┌────────┐   cancel (Partner only)
                    │Shipped │ ─────────────────────────▶ Cancelled
                    └────┬───┘
                         │ (auto) status → Payment Pending, assigned back to Accounts
                         ▼
                ┌───────────────┐   cancel (Partner only)
                │Payment Pending│ ─────────────────────────▶ Cancelled
                └────┬──────────┘
                     │ mark 'Done' (Accountant or Partner)
                     ▼
                  ┌────┐
                  │Done│  (terminal — Partner gets notification + toast)
                  └────┘
```

Each transition is a single API endpoint that (a) checks role, (b) checks the current status is legal, (c) writes the new status inside a transaction, (d) creates an `OrderEvent`, (e) creates `Notification` rows for the receiving team (or Partners on Done/Cancelled).

## 5. API design (DRF)

Grouped by resource; all endpoints require JWT auth.

```
POST   /api/auth/google              body: {id_token} → {access, refresh, user}
POST   /api/auth/refresh             body: {refresh}  → {access}
POST   /api/auth/logout

# Partner-only
POST   /api/invitations              body: {email, role}
GET    /api/invitations
DELETE /api/invitations/{id}

# Master data
GET    /api/clients          (all authenticated users can list for the dropdown)
POST   /api/clients          (Partner)
PATCH  /api/clients/{id}     (Partner)
DELETE /api/clients/{id}     (Partner, HARD delete, confirm on FE)
POST   /api/clients/import   (Partner, CSV upload → bulk create/update)

GET    /api/products         (same rules)
POST   /api/products         (Partner)
PATCH  /api/products/{id}    (Partner)
DELETE /api/products/{id}    (Partner, HARD delete, confirm on FE)
POST   /api/products/import  (Partner, CSV upload)

# Orders
GET    /api/orders           (filtered per role; supports ?status, ?client, ?salesman, ?date_from, ?date_to, ?q)
POST   /api/orders           (Salesman or Partner)
GET    /api/orders/{id}      (includes lines + events timeline)
PATCH  /api/orders/{id}      (creator or Partner, only if status == Pending)
POST   /api/orders/{id}/transition   body: {to_status}  (permission-checked in serializer)

# Notifications
GET    /api/notifications              (unread first, paginated)
POST   /api/notifications/{id}/read
POST   /api/notifications/read-all

# History (Done + Cancelled), Partner-only
GET    /api/history           (?kind=done|cancelled|all, ?date_from, ?date_to, ?q)
```

**Reusable backend components** (aligns with your project rule 1):
- `PermissionByRole(*allowed_roles)` — generic DRF permission class parametrised by role list.
- ~~`StatusTransitionMixin`~~ — built instead as plain functions in `apps/orders/services.py` (`_validate_transition`, `can_transition`, `available_transitions`, `apply_transition`). Order is the only resource with a state machine right now, so a generic mixin would have been an abstraction with one caller — the functions are just as reusable (any future entry point, e.g. a management command, can call `apply_transition` directly) without guessing at a shape a hypothetical second resource might need (Phase 4 decision).
- `CsvImportMixin` — one abstract view that both `clients/import` and `products/import` extend; each subclass just declares a serializer and unique-key column.
- `snapshot_on_create` — a small helper that runs at `Order.save()` to copy client/product names onto the order rows.

## 6. Frontend architecture (React + Vite + Tailwind)

**Routing** (React Router):
```
/login
/orders                  role-aware landing (tabs for Partner; list for others)
/orders/new
/orders/:id
/history                 Partner-only
/admin/clients           Partner-only
/admin/products          Partner-only
/admin/users             Partner-only (invite + role management)
/notifications
```

**Reusable component library** (aligns with your project rule 1):
- `SearchableDropdown` — used for both Client and Product pickers; keyboard-narrowed search.
- `OrderStatusPill` — colour-coded status chip used in list, detail, and notifications.
- `OrderList` — table/list component consuming a filter object; the Partner tabs and the Salesman "my orders" page share it.
- `OrderTimeline` — renders `OrderEvent` rows on the detail page.
- `Confirm` — modal used for cancel + hard-delete confirmations.
- `useAuth`, `useRole`, `useNotifications` — hooks that expose current user, gated render helpers, and a live unread count (poll every 30 s in v1; can swap to websocket later).

**UI style**: navy-blue accents (`#0B2447` primary, `#19376D` secondary, `#A5D7E8` accent), Tailwind, minimal chrome, mobile-first.

**Responsive layout** (revised after a mobile pass): header collapses to hamburger + brand + notification bell below the `sm` breakpoint, opening a full-height slide-in drawer (`MobileNavDrawer`) with all nav links, user info, and logout — large tap targets, one shared `navItemsForRole()` config so desktop and mobile nav can't drift apart. Desktop (`sm`+) keeps the original horizontal nav in the header, unchanged. List pages (Orders, History) render as cards below `sm` and as a table at `sm`+; admin lists (Clients/Products/Users) use a single flex-row layout that works at every size instead of a table. The order form's line items keep the product picker full-width with qty/price/total/remove sharing one compact row, so scrolling through many items on a phone doesn't take five screens' worth of stacked fields.

**PWA**: `vite-plugin-pwa` gives us the service worker; we cache the app shell (HTML/CSS/JS/fonts/icons) with `cache-first`, and API requests use `network-only` (or `network-first` with a friendly offline banner). Manifest ships app icons for iOS/Android home-screen install.

## 7. Task breakdown (phased)

**Phase 0 — Repos & scaffolding (½ day)**
1. Two repos (or one monorepo with `/backend` and `/frontend`).
2. Django project + DRF, dj-database-url, django-cors-headers, django-environ.
3. Vite React app + Tailwind + React Router + Axios.
4. `.env.example` for both. Local Postgres via Docker for dev.

**Phase 1 — Auth & users (1–2 days)**
5. Supabase project + Postgres connection string.
6. Google OAuth client set up. `POST /api/auth/google` verifying `id_token` via `google-auth`.
7. `User`, `Invitation` models + migrations.
8. JWT with `djangorestframework-simplejwt`.
9. Frontend login page + protected route wrapper + `useAuth` hook.
10. Partner-only `/admin/users` page (invite by email + role, revoke pending invite).

**Phase 2 — Master data (1–2 days)**
11. `Client`, `Product` models. CRUD endpoints with `PermissionByRole('Partner')` for writes.
12. CSV import endpoint (`CsvImportMixin`).
13. Admin pages: list, add, edit, delete-with-confirm. CSV upload button.

**Phase 3 — Orders core (2–3 days)**
14. `Order`, `OrderLine`, `OrderEvent` models + snapshot logic + order number allocator.
15. Order create/list/detail/edit endpoints. Role-based queryset filtering.
16. `SearchableDropdown` component.
17. Order create form (add lines 1–50, price prefill from product, per-line total, grand total).
18. Order list (role-aware) and order detail page with timeline.

**Phase 4 — State machine & queues (1–2 days)**
19. Transition endpoint + `StatusTransitionMixin`.
20. Partner four-tab dashboard.
21. Accountant and Packaging team queues.
22. Cancel flow with role/stage rules.

**Phase 5 — Notifications & history (1 day)**
23. `Notification` model + endpoints + write on transitions.
24. In-app badge + toast + notifications drawer.
25. Partner History page (Done + Cancelled), filterable.

**Phase 6 — PWA polish & deploy (1 day)**
26. `vite-plugin-pwa` + icons + manifest.
27. Deploy backend to Render, frontend to Vercel, DB on Supabase.
28. Smoke test the full lifecycle on a phone.

**Phase 7 — Hardening (½–1 day)**
29. Rate limits on auth + order create.
30. Sentry (free tier) on backend and frontend.
31. Backup verification on Supabase.
32. README with setup + deploy steps.

Rough total: **8–12 focused build days** for a solid v1.

## 8. Things I'm deliberately leaving for later

- Websocket-based real-time notifications (polling every 30 s is fine for v1).
- Analytics dashboards (top clients, salesman leaderboard) — easy to add on this schema when you want them.
- Offline order drafting — you chose app-shell only; we can add background sync later without a rewrite.
- Multi-company / multi-tenant — single-tenant now, room to grow via a `Company` FK later.
- Email/SMS notifications — added only if the in-app badge proves insufficient.

## 9. Confirmed open items

a. **Supabase**: Postgres only. Google OAuth handled through our Django backend. One auth path, no Supabase Auth.

b. **`Bill Created` attribution**: Order stores `billed_by → User` (nullable). Set when the transition to `Bill Created` happens (whether by an Accountant or a Partner). Shown on the order detail page.

c. **50 items is a hard cap**: Enforced server-side in the `OrderLine` serializer (min 1, max 50). Frontend also disables the "add line" button at 50.

d. **First Partner bootstrap**: Django management command `python manage.py bootstrap_partner --email <email> --name <name>`, run once on first deploy. Env var `BOOTSTRAP_PARTNER_EMAIL` can also trigger it automatically on first migrate for CI.

e. **Timezone**: `TIME_ZONE = "Asia/Kolkata"` in Django settings. Yearly order-number reset uses IST midnight of Jan 1.

f. **CSV format**: Draft below in section 10, subject to your feedback before the importer is built.

## 10. CSV column formats (final — built in Phase 2)

Both simplified to a single required column after review.

**clients.csv**
```
name
ACME Corp
Beta Industries
Gamma Traders
```

**products.csv**
```
name
Widget X
Bolt 8mm
Custom Gadget
```

**Import behaviour** (as built):
- One-step: every valid row is committed immediately on upload.
- A row is skipped (not imported) if: the name is blank, it duplicates another row in the same file, or it already exists in the database. Skipped rows are reported back with a reason, e.g. "Row 14: Already exists" — the rest of the file still imports.
- Matching for duplicates is case-insensitive.

## 11. Waiting on your go-ahead

Per your README workflow, I will not start building until you say so. When you're ready, either:
- Approve the CSV columns above (or send edits), then say "go", or
- Send any remaining questions/changes to the plan first.
