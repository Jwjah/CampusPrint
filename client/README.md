# 🖥️ CampusPrint Web Client (`client/`)

The **CampusPrint Web Client** is a high-performance web application built with **Next.js 16 (App Router)** and **React 19**. It features the **Print Studio**—a full-featured, in-browser PDF and image editor with AI OCR, page manipulation, live preflight checks, and real-time print cost estimation.

---

## ✨ Features

- **🎨 Pro-Grade Print Studio**:
  - **Fabric.js Canvas Engine**: Add text annotations, signatures, shapes, highlights, and document redaction.
  - **`pdf-lib` & PDF.js Integration**: Multi-page rendering, page re-ordering, lazy loading, and byte-level PDF exports.
  - **AI OCR (Tesseract.js)**: Convert scanned or handwritten documents into editable text.
  - **Live Preflight Worker**: Checks document resolution, color space, bleed bounds, and page counts in background Web Workers.
- **🏢 Multi-Role User Dashboards**:
  - **Student Portal**: Document upload, studio editing, live order tracking, and Razorpay payment checkout.
  - **Shop Dashboard**: Real-time incoming print order queue, status updates, and QR scanner verification.
  - **Agent & Admin Dashboards**: Order fulfillment tracking, hostel delivery assignments, and system metrics.
- **📱 Progressive Web App (PWA)**: Offline support, Service Worker caching (`sw.js`), and IndexedDB draft auto-saving.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router) & React 19
- **Styling**: Tailwind CSS v4 & Framer Motion
- **Editor Engines**: Fabric.js v5, PDF.js (`react-pdf`), `pdf-lib`, Tesseract.js v7
- **State Management**: Zustand v5 (Persisted session & app state)
- **Networking**: Axios with global authentication interceptors
- **Offline & Workers**: Service Worker, Web Workers (`preflight.worker.ts`), `idb` (IndexedDB)

---

## 📂 Architecture Overview

```
client/src/
├── app/                  # Next.js App Router pages (/student, /shop, /admin, /agent, /print-studio)
├── components/           # UI components (Canvas, Editor Toolbar, Preflight, Modals)
├── engines/              # Print Studio Engine system (Autosave, History, Rendering, Export, Costing)
├── hooks/                # Custom React hooks (useEngines, useAuth, useSocket)
├── lib/                  # API client, Zustand store, utility helpers
├── plugins/              # Plugin extensions manager
├── workers/              # Web Workers (preflight validation worker)
└── public/               # Static assets & PWA manifest / sw.js
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- Running CampusPrint Server (`server/`)

### Setup & Installation

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Create a `.env.local` file in the `client/` root directory:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_key_id
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
   ```

3. **Run Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. **Build for Production**:
   ```bash
   npm run build
   npm run start
   ```

---

## 📜 Available Scripts

- `npm run dev` — Boots Next.js development server with hot-reloading.
- `npm run build` — Compiles production optimized bundle.
- `npm run start` — Boots production Next.js server.
- `npm run lint` — Runs ESLint checks.
- `npm run analyze` — Generates Next.js bundle size breakdown report.
