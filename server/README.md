# ⚙️ CampusPrint Express API Server (`server/`)

The **CampusPrint API Server** is built with **Express.js (v5)** and **TypeScript**, engineered around **Domain-Driven Design (DDD)** bounded contexts and an **Event-Driven Transactional Outbox Pattern**. 

It handles authentication, payments, print job queuing, delivery dispatching, notification delivery, and shop analytics.

---

## ✨ Core Features

- **🏛️ Domain-Driven Design (DDD) Bounded Contexts**:
  - `payments`: Invoicing, Razorpay integration, webhook verification.
  - `fulfillment`: Print queue management, status transitions.
  - `delivery`: Hostel delivery routing, agent assignment, delivery timeout handling.
  - `scheduling`: Print shop operating hours, print batch scheduling.
  - `notification`: Nodemailer email OTPs, WebPush (VAPID) push notifications.
  - `analytics`: Campus-wide revenue metrics, order projections.
- **🔄 Transactional Outbox Pattern**:
  - `outbox_events` table ensures 100% atomic domain state & event writes.
  - `OutboxWorker` and `EventDispatcher` process event handlers in isolated failure domains.
- **🗄️ Custom Dual-Mode Database Layer**:
  - **Development**: Zero-dependency SQLite driver (`better-sqlite3`) with dynamic MySQL SQL translation.
  - **Production**: High-performance MySQL connection pool (`mysql2`) on Serv00.
- **🔐 Security & Guard Rails**:
  - Mandatory environment variable check on boot in production (`JWT_SECRET`, `RAZORPAY_KEY_SECRET`, `PAYOUT_ENCRYPTION_KEY`, etc.).
  - HMAC SHA-256 signature verification for payment webhooks (`req.rawBody`).
  - Granular route rate limiters, Helmet security headers, CORS origin verification.

---

## 🛠️ Tech Stack

- **Runtime & Framework**: Node.js v18+, Express 5, TypeScript v5 (`ts-node`)
- **Database**: MySQL 9 (`mysql2`) / SQLite (`better-sqlite3`)
- **Auth & Crypto**: JWT (`jsonwebtoken`), `bcryptjs`, Crypto HMAC
- **Payment & External Services**: Razorpay Node SDK, Nodemailer (SMTP), Cloudinary, WebPush

---

## 📂 Architecture Overview

```
server/src/
├── config/               # Database dual-mode adapter & environment configuration
├── controllers/          # Legacy REST controllers (/api/*)
├── routes/               # Express route definitions
├── migrations/           # Multi-DB migration scripts (SQLite & MySQL)
├── middleware/           # Auth, rate limiting, maintenance, CORS, performance tracing
├── analytics/            # Analytics Bounded Context
├── delivery/             # Delivery Bounded Context
├── fulfillment/          # Fulfillment Bounded Context
├── notification/         # Notification Bounded Context
├── payments/             # Payments Bounded Context & EventDispatcher
└── scheduling/           # Scheduling Bounded Context
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- MySQL Database (or SQLite for zero-config local development)

### Setup & Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env` file in the `server/` root directory:
   ```env
   NODE_ENV=development
   PORT=5000
   DB_MODE=sqlite
   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=7d
   CLIENT_URL=http://localhost:3000
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
   PAYOUT_ENCRYPTION_KEY=your_32byte_encryption_key
   ADMIN_EMAIL=admin@campusprint.com
   ADMIN_PASSWORD=adminpassword
   ```

3. **Run Schema Migrations**:
   ```bash
   npm run migrate
   ```

4. **Start Development Server**:
   ```bash
   # JS watch mode
   npm run dev

   # TypeScript context watch mode
   npm run dev:ts
   ```

5. **Build & Start Production Server**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📜 Available Scripts

- `npm run dev` — Runs nodemon on `src/index.js`.
- `npm run dev:ts` — Runs ts-node with watcher for TypeScript bounded contexts.
- `npm run migrate` — Executes schema migrations for SQLite and MySQL.
- `npm run build` — Compiles TypeScript into `dist/` and copies static assets.
- `npm run start` — Runs compiled `dist/index.js` server.
