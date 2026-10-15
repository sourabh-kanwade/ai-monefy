# AI Monefy 💸

> **A high-performance, local-first personal finance tracker inspired by Monefy.**  
> Built for **Web (PWA)** and **Android** with offline-first IndexedDB (Dexie.js) and cloud delta synchronization backed by **PostgreSQL** and **Supabase**.

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.5-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Supabase Ready](https://img.shields.io/badge/Supabase-Ready-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tests Passing](https://img.shields.io/badge/Tests-65%20Passed-brightgreen?logo=vitest&logoColor=white)](https://vitest.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Monorepo Structure](#-monorepo-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Environment Configuration](#environment-configuration)
  - [Running the Web Client](#running-the-web-client)
  - [Running the Backend Server](#running-the-backend-server)
- [Database Setup & Supabase Migration](#-database-setup--supabase-migration)
  - [Local PostgreSQL](#1-local-postgresql)
  - [Supabase Setup](#2-supabase-setup)
- [Android Native Packaging (Capacitor)](#-android-native-packaging-capacitor)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [API Reference](#-api-reference)
  - [Health & Auth Endpoints](#health--auth-endpoints)
  - [Delta Synchronization Endpoints](#delta-synchronization-endpoints)
- [Design Decisions](#-design-decisions)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

Most expense tracking applications force users through mandatory account registrations, suffer from network latency, and present tedious spreadsheet-like interfaces.

**AI Monefy** solves this by providing:
1. **Zero-friction Guest Mode**: Open the app and start recording expenses instantly — no login or network connection required.
2. **Iconic Radial Monefy UX**: An intuitive circular donut chart displaying category spending distribution, surrounded by touch-friendly radial category icons for rapid two-tap entry.
3. **Local-First Speed**: All data is written immediately to client-side IndexedDB with sub-millisecond response times.
4. **Seamless Multi-Device Sync**: Optional cloud account linking with an asynchronous delta-synchronization engine powered by PostgreSQL and Supabase.

---

## ✨ Key Features

- **🍩 Iconic Monefy Radial Chart & Center Balance**
  - Interactive SVG donut wheel displaying category proportions with slice highlights.
  - Central net balance display with real-time green (surplus) and red (deficit) feedback.
  - Peripheral category icons for instant pre-selected transaction logging.
- **🧮 Embedded Calculator Keypad**
  - Full numeric pad with inline arithmetic evaluation (`+`, `-`, `*`, `/`) supporting operator precedence.
  - Calculate split bills or grocery totals directly within the entry modal.
- **⚡ Local-First & 100% Offline Capable**
  - Powered by [Dexie.js](https://dexie.com/) (IndexedDB) with optimistic local writes and an offline sync queue.
  - Fully functional in airplane mode; zero network requests needed for core logging.
- **🔄 Multi-Device Cloud Synchronization**
  - Asynchronous delta sync engine (`/api/sync/pull` and `/api/sync/push`) with deterministic Last-Write-Wins (LWW) conflict resolution.
  - Automatic migration of local guest data to the cloud upon user registration or sign-in.
- **🏦 Multi-Account & Internal Transfers**
  - Track balances across multiple accounts (e.g. *Cash*, *Bank Card*, *Savings*).
  - Internal fund transfers (e.g. ATM cash withdrawal) that adjust balances without distorting income/expense analytics.
  - Filter dashboard views by a single account or an aggregate view.
- **📊 Budgets & Expense Analytics**
  - Monthly budget thresholds per category with color-coded warning meters (green, amber, red).
  - Dedicated expense analytics view ranking spending by volume and percentage.
- **📅 Time Interval Navigation**
  - Effortlessly filter by `Day`, `Week`, `Month`, `Year`, `All Time`, or custom date intervals.
- **💾 Data Ownership & Portability**
  - Full database JSON backup and restore.
  - One-click CSV transaction export.
- **📱 Cross-Platform (Web, PWA & Android)**
  - Progressive Web App with offline caching.
  - Native Android packaging via [Capacitor](https://capacitorjs.com/) with native haptic feedback, immersive status bar, and splash screen integration.
- **🎨 Premium Dark & Light Themes**
  - Carefully crafted *Obsidian Slate* dark theme and clean light theme.
  - Custom category colors and Lucide icon selector.

---

## 🏛 System Architecture

```mermaid
graph TD
    subgraph Client ["Client Workspace (React 19 + TypeScript + Vite + Capacitor)"]
        UI["Monefy UI Layer\n(Circular Chart, Radial Categories, Keypad)"]
        State["Finance Context & State Provider"]
        LocalDB["Local-First IndexedDB (Dexie.js)"]
        SyncQueue["Offline Sync Change Queue"]
        Capacitor["Capacitor Native Bridges\n(Haptics, Status Bar, App Lifecycle)"]

        UI --> State
        State --> LocalDB
        LocalDB --> SyncQueue
        UI -.-> Capacitor
    end

    subgraph Backend ["Backend Workspace (Node.js + Express + PostgreSQL / Supabase)"]
        AuthAPI["Auth API (/api/auth)\nJWT & Bcrypt"]
        SyncAPI["Delta Sync API (/api/sync)\nPush & Pull Batches"]
        PG["PostgreSQL Connection Pool (pg)"]
        RLS["Row Level Security (RLS) & UUIDs"]

        AuthAPI --> PG
        SyncAPI --> PG
        PG --- RLS
    end

    subgraph Targets ["Deployment Platforms"]
        WebPWA["Modern Responsive Web / PWA"]
        AndroidApp["Native Android Application (APK)"]
    end

    SyncQueue <-->|Asynchronous Delta Sync| SyncAPI
    Client --> WebPWA
    Client --> AndroidApp
```

---

## 🛠 Tech Stack

| Domain | Technology | Description |
|---|---|---|
| **Frontend Framework** | [React 19](https://react.dev/) | Modern concurrent UI architecture |
| **Language** | [TypeScript 5.7](https://www.typescriptlang.org/) | Strict type safety across client and server |
| **Bundler & Tooling** | [Vite 6](https://vitejs.dev/) | Sub-second HMR and optimized production builds |
| **Client Storage** | [Dexie.js 4](https://dexie.com/) | High-performance IndexedDB wrapper with reactive queries |
| **Mobile Runtime** | [Capacitor 8](https://capacitorjs.com/) | Native Android container with Haptics and Status Bar plugins |
| **Styling** | Vanilla CSS Design Tokens | Curated *Obsidian Slate* palette, glassmorphism, responsive grid |
| **Icons & Effects** | [Lucide React](https://lucide.dev/) & [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti) | Vector icons and celebratory budget animations |
| **Backend Framework** | [Express 4](https://expressjs.com/) | Lightweight REST API for authentication and delta synchronization |
| **Database** | [PostgreSQL 15+](https://www.postgresql.org/) / [Supabase](https://supabase.com/) | Relational database with UUID keys, UTC timestamps, and RLS |
| **Testing** | [Vitest](https://vitest.dev/), [RTL](https://testing-library.com/), [Supertest](https://github.com/ladjs/supertest) | Seam-driven unit, integration, and API testing suites |

---

## 📂 Monorepo Structure

```text
ai-monefy/
├── client/                     # Frontend client workspace
│   ├── android/                # Native Android Capacitor project
│   ├── capacitor.config.ts     # Capacitor runtime configuration
│   ├── index.html              # HTML entry point with PWA meta tags
│   ├── src/
│   │   ├── components/         # Modular UI components
│   │   │   ├── accounts/       # Account selector and management modals
│   │   │   ├── analytics/      # Spending breakdown and category rankings
│   │   │   ├── budgets/        # Budget meters and limit configuration
│   │   │   ├── categories/     # Category icons and manager
│   │   │   ├── dashboard/      # Primary view and summary statistics
│   │   │   ├── keypad/         # Numeric pad with inline math evaluator
│   │   │   ├── layout/         # Header, app layout, and navigation drawer
│   │   │   ├── monefy-wheel/   # Donut chart, radial icons, center balance
│   │   │   ├── settings/       # Currency, data export/import, theme toggles
│   │   │   ├── sync/           # Cloud login/register and sync status modal
│   │   │   └── transactions/   # Grouped transaction history and edit modal
│   │   ├── context/            # Global finance state provider
│   │   ├── db/                 # Dexie IndexedDB store and delta sync engine
│   │   ├── types/              # Domain TypeScript types
│   │   ├── utils/              # Calculator evaluator, date filters, exports
│   │   └── index.css           # Global design system & theme tokens
│   └── vite.config.ts          # Vite build and test configuration
├── server/                     # Backend API workspace
│   ├── src/
│   │   ├── db/
│   │   │   ├── db.ts           # PostgreSQL connection pool & bootstrap
│   │   │   └── schema.sql      # ANSI SQL migration schema with RLS policies
│   │   ├── middleware/         # JWT authentication middleware
│   │   ├── routes/             # Health, Auth, and Sync REST endpoints
│   │   ├── app.ts              # Express application setup
│   │   └── index.ts            # Server entrypoint
│   └── tsconfig.json
├── docs/                       # Project documentation and specifications
│   ├── specs/                  # Technical specifications (SPEC-01-AI-MONEFY.md)
│   └── agents/                 # Contributor and agent guidelines
├── PLAN.md                     # Master implementation roadmap
├── TRACKER.md                  # Task progression tracker (100% complete)
└── package.json                # Root monorepo configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: Local instance or a free [Supabase](https://supabase.com/) project *(optional if running in offline guest mode)*
- **Android Studio & JDK 17+**: *(Only required for building native Android APK)*

### Installation

Clone the repository and install dependencies from the root directory:

```bash
git clone https://github.com/your-username/ai-monefy.git
cd ai-monefy
npm install
```

### Environment Configuration

The server expects standard environment variables. Create a `.env` file in the `server/` directory:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` according to your environment:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_monefy
JWT_SECRET=your-secure-jwt-secret-key
```

### Running the Web Client

Start the Vite development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173`. The application runs immediately in **Guest Mode** with seeded categories and accounts stored in your browser's IndexedDB.

### Running the Backend Server

To enable multi-device cloud synchronization, start the backend server:

```bash
npm run server:dev
```

The API will start at `http://localhost:3001`. On launch, the server automatically initializes tables from `server/src/db/schema.sql` if they do not yet exist.

---

## 🗄 Database Setup & Supabase Migration

The database schema (`server/src/db/schema.sql`) is written in pure ANSI SQL with standard UUIDs, UTC timestamps, and Row-Level Security (RLS). It is compatible with both self-hosted PostgreSQL and Supabase.

### 1. Local PostgreSQL

Create the database locally:

```bash
createdb ai_monefy
```

When you start the server (`npm run server:dev`), it will automatically execute `server/src/db/schema.sql` on the first run.

Alternatively, execute the schema manually:

```bash
psql -d ai_monefy -f server/src/db/schema.sql
```

### 2. Supabase Setup

1. Create a new project in the [Supabase Dashboard](https://supabase.com/).
2. Open the **SQL Editor** in your Supabase project.
3. Paste the contents of `server/src/db/schema.sql` and run the query.
4. Copy your project's connection string from **Project Settings -> Database** and set it as `DATABASE_URL` in `server/.env`:
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

---

## 📱 Android Native Packaging (Capacitor)

The mobile client is packaged using Capacitor 8.

### 1. Build Web Assets

Compile and bundle the production web application:

```bash
npm run build
```

### 2. Sync Web Assets with Android Platform

Transfer compiled assets to the native Android directory:

```bash
cd client
npx cap sync android
```

### 3. Open in Android Studio & Run

Open the native Android project in Android Studio:

```bash
npx cap open android
```

From Android Studio:
- Select an Android Virtual Device (AVD) or connect a physical Android device with USB debugging enabled.
- Click **Run** (`Shift + F10`) or navigate to **Build > Build Bundle(s) / APK(s) > Build APK(s)** to generate the APK.

---

## 🧪 Testing & Quality Assurance

AI Monefy emphasizes interface (seam) testing, ensuring that core calculation logic, synchronization engines, and user workflows are thoroughly validated without asserting against internal private state.

### Running Client Tests

Runs 55 unit and component seam tests covering the calculator evaluator, date interval calculations, budget thresholds, Dexie migrations, and React components:

```bash
npm run test
```

### Running Server Tests

Runs 10 integration tests validating JWT authentication, registration boundaries, password hashing, and delta synchronization endpoints:

```bash
npm run server:test
```

### Type Checking & Production Builds

Validate strict TypeScript compliance and production builds across both workspaces:

```bash
# Build Client (Vite + TypeScript)
npm run build

# Build Server (TypeScript)
npm run server:build
```

---

## 📡 API Reference

Base URL: `http://localhost:3001`

### Health & Auth Endpoints

| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/api/health` | Healthcheck and PostgreSQL pool status | No |
| `POST` | `/api/auth/register` | Register a new user (`email`, `password`, `name`) | No |
| `POST` | `/api/auth/login` | Authenticate user and receive JWT bearer token | No |

#### Example: Register User

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "securepassword123", "name": "Jane Doe"}'
```

Response:
```json
{
  "user": {
    "id": "e44dcfb2-32b7-4c74-a690-db05c48b2da5",
    "email": "user@example.com",
    "name": "Jane Doe"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### Delta Synchronization Endpoints

All sync endpoints require an `Authorization: Bearer <token>` header.

#### 1. Push Changes (`POST /api/sync/push`)

Pushes local mutations (transactions, categories, accounts, budgets) queued during offline operation.

```bash
curl -X POST http://localhost:3001/api/sync/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "items": [
      {
        "id": "item-uuid-1",
        "entityType": "transaction",
        "action": "create",
        "payload": {
          "id": "tx-uuid-1",
          "amount": 42.50,
          "type": "expense",
          "categoryId": "cat-uuid-food",
          "accountId": "acc-uuid-cash",
          "date": "2026-10-15T12:00:00.000Z",
          "note": "Lunch with team"
        }
      }
    ]
  }'
```

#### 2. Pull Changes (`GET /api/sync/pull`)

Retrieves records created or updated since the last sync timestamp.

```bash
curl -X GET "http://localhost:3001/api/sync/pull?since=2026-10-15T00:00:00.000Z" \
  -H "Authorization: Bearer <token>"
```

Response:
```json
{
  "timestamp": "2026-10-15T12:05:00.000Z",
  "transactions": [...],
  "categories": [...],
  "accounts": [...],
  "budgets": [...]
}
```

---

## 💡 Design Decisions

- **Local-First Architecture**: IndexedDB serves as the single source of truth for the client. The application is completely decoupled from cloud uptime, delivering instant UI interactions.
- **Guest-to-Cloud Migration**: Unauthenticated users start immediately. When creating an account, all local transactions and accounts are claimed and synchronized automatically.
- **Conflict Resolution (LWW)**: Timestamps (`updated_at`) with UUID tie-breaking ensure deterministic resolution across concurrent offline edits.
- **Single Global Currency in v1**: Eliminates fragile network dependencies for real-time exchange rates, prioritizing instant offline calculation speed.
- **ANSI SQL & RLS**: Guarantees zero vendor lock-in; switch between local PostgreSQL, AWS RDS, or Supabase without altering migration schemas.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. **Fork** the repository and create your branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. **Ensure tests pass**:
   ```bash
   npm run test
   npm run server:test
   ```
3. **Commit your changes** with clear, descriptive commit messages:
   ```bash
   git commit -m "feat(category): add custom color palette picker"
   ```
4. **Push** to your branch and open a **Pull Request**.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

*Inspired with ❤️ by the classic Monefy interface.*
