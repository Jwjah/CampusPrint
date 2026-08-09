# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository overview

CampusPrint is a campus printing marketplace monorepo. Four runnable sub-projects, each with its own `package.json`/build:

- **`client/`** — Next.js 16 (App Router) + React 19 frontend. See `client/AGENTS.md`: **this Next.js version has breaking changes vs. standard Next.js** — read the bundled guides in `node_modules/next/dist/docs/` before writing client code, and heed deprecation notices. `client/CLAUDE.md` just imports `client/AGENTS.md`.
- **`server/`** — Express backend. Hybrid: legacy JS routes/controllers plus newer TypeScript DDD "bounded contexts". This is where most architecture lives.
- **`print-agent/`** — single-file Node.js polling agent a print shop runs on a Windows/Mac machine to receive and print jobs.
- **`android-app/`** — Kotlin + Jetpack Compose app (Hilt, Retrofit, FCM, QR scanner).

Other directories: `docs/rfcs/` (RFCs for the DDD contexts, e.g. RFC-007 tracking, RFC-008 scheduling), `stirling-pdf-fork/` (vendored third-party Stirling PDF toolkit with its own CLAUDE.md — don't treat its conventions as repo-wide), `agent/` (a nano_banana image-gen skill, unrelated to the app).

There is **no root package.json** — all commands run from a sub-project.

## Commands

### Server (`server/`)
- `npm run dev` — nodemon on `src/index.js` (JS-only watch)
- `npm run dev:ts` — nodemon + ts-node for the TypeScript contexts
- `npm run migrate` — creates the schema (run before first dev boot)
- `npm run build` — `tsc` → `dist/`
- Tests: **there is no test runner** (no jest/vitest). Every `*.test.ts` is a standalone script; each file's header comment ("Runs with:") gives its exact command. Typical patterns:
  - `npx ts-node src/<context>/tests/<name>.test.ts`
  - `DB_MODE=sqlite npx ts-node src/<context>/tests/<name>.test.ts`
  - Some expect a compiled `dist-test/` build: `DB_MODE=sqlite node dist-test/<context>/tests/<name>.test.js`

### Client (`client/`)
- `npm run dev`, `npm run build`, `npm run start`, `npm run lint` (eslint)

### print-agent (`print-agent/`)
- `node agent.js` — interactive first-time setup (login, auto-discovers shop ID, saves `config.json`), then polls for print jobs.

### Android (`android-app/`)
- Standard Gradle (`./gradlew assembleDebug` etc.); builds against the same REST API.

## Environment & deployment

- Server needs a `.env` (in `server/`); there is no committed template. Required vars include `JWT_SECRET`, `JWT_EXPIRES_IN`, `DB_HOST/DB_USER/DB_PASS/DB_NAME`, `CLIENT_URL`, `RAZORPAY_KEY_ID/SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `PAYOUT_ENCRYPTION_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`. In production `src/index.js` **crashes on boot** if any are missing.
- Client needs `NEXT_PUBLIC_API_URL`, plus `NEXT_PUBLIC_RAZORPAY_KEY_ID` and `NEXT_PUBLIC_VAPID_PUBLIC_KEY` for payments/push.
- Deployed as: client on Vercel, server on Render/Serv00 (MySQL). Vercel previews are CORS-allowed via the `.vercel.app` origin check.

## Server architecture (the part that needs the big picture)

`src/index.js` wires up two parallel layers:

1. **Legacy monolith** — `src/routes/*.js` + `src/controllers/*.js` mounted at `/api/*` (auth, users, orders, shops, agent, admin, withdrawals, export, push, feedback). Plain Express + `mysql2`.
2. **Bounded contexts** (TypeScript, hexagonal/DDD) — `payments`, `fulfillment`, `delivery`, `scheduling`, `notification`, `analytics`. Each follows the same layout: `domain/` (entities, enums, value objects), `application/` (services, strategies, event listeners, replay), `infrastructure/` (SQL repositories, gateways), `interfaces/` (controllers + DTOs) or `api/`, and `worker/` (event workers). Each exports a `Module.register(app, dispatcher)` static mounted from `index.js`.

### Event-driven core (outbox + dispatcher)

Contexts communicate **only through domain events**, never by direct calls:

- Any context that produces a state change writes an event row to the **`outbox_events`** table (status `PENDING` → claimed `PROCESSING` → `COMPLETED`/`FAILED`).
- A singleton **`EventDispatcher`** lives in `payments/routes/payments.ts` (exported `dispatcher`), and a single **`OutboxWorker`** polls the outbox and calls `dispatcher.dispatch(event)` for each claimed row.
- Each `Module.register()` subscribes handlers: `dispatcher.register('PRINT_READY', (payload) => listener.handle(payload))`. Example event types: `ORDER_FINALIZED`, `PRINT_READY`, `FULFILLMENT_ASSIGNED`, `DELIVERY_COMPLETED`, `DELIVERY_TIMEOUT`.
- `EventDispatcher.dispatch` runs every consumer in isolation (fault isolation) and rethrows an aggregate error if any failed, so the worker retries the outbox event.
- Replay workers exist per context to rebuild projections/snapshots from outbox history after a crash.

**When adding cross-context behavior**: emit/publish an outbox event and subscribe a listener in the consuming context's `register()` — don't reach into another context's repository.

### Database

- `src/config/database.js` is a **dual-mode adapter**: `better-sqlite3` for local dev, `mysql2` for production, exposing the same `db.execute(query, params) → [rows, fields]` interface. SQLite mode auto-translates MySQL dialect (ENUM→TEXT, AUTO_INCREMENT, NOW(), JSON, etc.). The switch is `DB_MODE === 'sqlite'` **or** `DB_HOST === 'mysql9.serv00.com'` (which is how prod on Serv00 forces SQLite). Run migrations in this mode and you get the SQLite schema.
- `src/migrations/migrate.js` contains both a `sqliteQueries` and a `mysqlQueries` array; every new table must be added to **both**. Re-running `npm run migrate` is idempotent.
- Data model spans: `users`, `shops`, `orders`, `otp_codes`, `outbox_events`, plus per-context tables (`payments`, `invoices`, `print_jobs`, `fulfillments`, `delivery_assignments`, `scheduling_*`, `notification_*`, analytics `order_facts`/`*_analytics`, tracking projections).

### Runtime machinery worth knowing

- **Rate limiters** per concern (auth, OTP, payments, upload, general API) configured via env with defaults.
- **Maintenance mode** middleware (`middleware/maintenance.js`) — when on, non-admin requests get 503 and the client redirects to `/maintenance`.
- **Performance tracing**: every request gets an `X-Request-ID` + `req.perfTrace`; endpoints >250ms log a `[SLOW API >250ms]` warning (excluding `/stream-print`).
- **Raw body capture** for the Razorpay webhook (`/api/payments/webhook`) via the `express.json` `verify` hook → `req.rawBody`.
- Background `startDeliveryTimeoutChecker()` in `index.js` runs every 30s, scans for `ready` hostel orders with no assigned agent older than `DELIVERY_TIMEOUT_MINUTES`, and emits `DELIVERY_TIMEOUT` outbox events (with a transactional double-check).
- `tracking` is an implemented context (RFC-007) with tests but is **not mounted** in `index.js` — don't assume it's live.

## Client architecture

- App Router under `src/app/`: role sections `/student`, `/shop`, `/admin`, `/agent`, plus `/print-studio` (the editor), `/register`, `/login`, `/help`, `/maintenance`, and `(legal)/` pages. Role gating is client-side via the auth store.
- **Print Studio** is engine-based. `src/engines/` holds independent engines (`AutosaveEngine`, `HistoryEngine`, `RenderingEngine`, `ViewportEngine`, `ExportEngine`, `SelectionEngine`, `ShortcutEngine`, `PreflightEngine`, `CostingEngine`), each implementing `IEngine` (`initialize`/`dispose`/`reset`), registered in a singleton `EngineRegistry` and bootstrapped by `hooks/useEngines.ts`. Engines communicate through a shared `EventBus` (`CoreEvent` enum) — UI sends `ACTION_*` intents, engines publish document/selection/workspace events. Editing itself uses Fabric.js (`ImageEditor.tsx`) and pdf-lib/PDF.js; OCR via tesseract.js.
- `src/lib/api.ts` — shared axios instance. Auto-detects base: `NEXT_PUBLIC_API_URL` → same-origin `/api` (Vercel previews) → `http://localhost:5000/api`. Global interceptors: 401 clears session → `/login`; 503 → `/maintenance` (except admins).
- `src/lib/store.ts` — Zustand auth store persisted to `localStorage` (`token`, `user`).
- PWA: `ServiceWorkerRegistrar`, `manifest.json`, `sw.js`, and `src/workers/preflight.worker.ts`.
- `client/src/plugins/` is empty — `PluginManager` exists in engines but no plugins are registered.

## print-agent

`print-agent/agent.js` is the entire agent. It polls `GET /api/shops/:id/poll-print` every 3s, downloads queued jobs, prints via the bundled `SumatraPDF.exe` (Windows) / `lp` (macOS), and reports status back. First run does interactive login → writes `config.json` (`API_BASE_URL`, `SHOP_ID`, `AUTH_TOKEN`); it can self-install as a macOS LaunchAgent for autostart. The server-side counterpart is `GET /api/shops/:id/poll-print` in `routes/shops.js`.
