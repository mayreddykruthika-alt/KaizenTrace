# KaizenTrace — Evidence-Based Software Incident Investigation Tool

> **A focused, lightweight developer tool designed to investigate software regressions in full-stack applications through verifiable Git, test, and database evidence.**

KaizenTrace monitors code changes, reproduces regressions via test suites, retrieves historical baseline context from **MongoDB Atlas**, identifies the most probable root cause through a transparent rule-based engine, recommends targeted safe fixes, and verifies recovery.

---

## 🌐 System Architecture & Ports

| Component | Port | Description |
|---|---|---|
| **KaizenTrace Web Workspace** | `http://localhost:5180` | Light-theme, single-page incident investigation workspace |
| **KaizenTrace Backend API** | `http://localhost:5050` | Investigation engine, Git CLI inspector, test runner, MongoDB integration |
| **TeamFlow Web App** | `http://localhost:5173` | Monitored demo project (Team Project Management System) |
| **TeamFlow Backend API** | `http://localhost:5000` | TeamFlow REST API with RBAC, MongoDB persistence, background jobs |

---

## 🚀 Key Features

1. **Integrated Workspace Structure**: TeamFlow (`teamflow/`) and KaizenTrace (`kaizentrace/`) live in a single unified workspace while maintaining strict logical separation and isolated processes.
2. **True Git CLI Diff Correlation**: Inspects working tree modifications with `git status --porcelain` and `git diff --unified=5`.
3. **Reproducible Test Execution**: Executes the real Vitest regression suite on TeamFlow, extracting actual failure stacks, assertion diffs, and exit codes.
4. **MongoDB Atlas Historical Store**: Persists baselines, runs, diagnostic events, and investigations into MongoDB Atlas collections (`runs`, `events`, `investigations`) using Mongoose/MongoDB drivers with aggregation pipelines.
5. **Explainable Rule-Based Engine**: Transparently scores hypotheses using code diff proximity, failure stack traces, and historical passing baselines.
6. **Safe Patch Review & Application**: Allows developers to review targeted line-by-line diffs before confirming, preserves in-memory backups, and supports instant rollback.
7. **Rigorous Three-State Verification**: Reruns failing tests after fix application and outputs authoritative `PASS`, `FAIL`, or `INCONCLUSIVE` statuses.
8. **Soft Professional Light Theme**: Designed exclusively with a high-contrast, clean, distraction-free light palette (no dark-mode toggle).

---

## 🛠️ Prerequisites

- **Node.js**: v18+ (tested on Node v24.15.0)
- **Git**: Git CLI installed and on system PATH
- **npm**: v9+ (tested on npm 11.12.1)
- **MongoDB Atlas** (Optional / Recommended): A MongoDB Atlas cluster URI. *(If not provided, KaizenTrace and TeamFlow automatically initialize an isolated local in-memory Mongo database so the tool runs out-of-the-box!)*

---

## ⚙️ MongoDB Atlas Configuration

1. Copy `.env.example` to `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
2. Open `.env` and configure your MongoDB Atlas connection string:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/kaizentrace?retryWrites=true&w=majority
   ```
3. If Atlas credentials are omitted or offline, KaizenTrace logs a clear notification and falls back to an in-memory database to guarantee uninterrupted local evaluation.

---

## 📦 Quick Start (Windows PowerShell)

### 1. Install Dependencies
Run from the workspace root:

```powershell
# 1. Install KaizenTrace Backend & Frontend dependencies
cd kaizentrace/backend; npm install; cd ../..
cd kaizentrace/frontend; npm install; cd ../..

# 2. Install TeamFlow dependencies
cd teamflow/backend; npm install; cd ../..
cd teamflow/frontend; npm install; cd ../..
```

### 2. Start the Applications

Open 4 separate terminal windows or start the backend and frontend services:

**Terminal 1 — KaizenTrace Backend (Port 5050):**
```powershell
npm --prefix kaizentrace/backend run dev
```

**Terminal 2 — KaizenTrace Frontend (Port 5180):**
```powershell
npm --prefix kaizentrace/frontend run dev
```

**Terminal 3 — TeamFlow Backend (Port 5000):**
```powershell
npm --prefix teamflow/backend run dev
```

**Terminal 4 — TeamFlow Frontend (Port 5173):**
```powershell
npm --prefix teamflow/frontend run dev
```

Open your browser to:
👉 **[http://localhost:5180](http://localhost:5180)** (KaizenTrace Investigation Workspace)  
👉 **[http://localhost:5173](http://localhost:5173)** (TeamFlow Demo Application)

---

## 🔄 The 10-Step Investigation Workflow

1. **Step 1 — Connect to Demo Project**: Validates the TeamFlow directory, confirms Git repository integrity, and checks server health.
2. **Step 2 — Establish Baseline**: Click **"Record Baseline"** to run all 11 backend tests and save a known-good reference run to MongoDB Atlas.
3. **Step 3 — Detect Developer Changes**: Detects uncommitted changes in the working tree using `git status` and `git diff -U5`.
4. **Step 4 — Detect Failure**: Runs tests and server health checks, capturing failing test names, stack traces, and HTTP error codes.
5. **Step 5 — Retrieve Historical Evidence**: Queries MongoDB Atlas for previous healthy runs, failing runs, and aggregation statistics.
6. **Step 6 — Identify Primary Cause**: The rule-based engine correlates the failing test with the Git diff to formulate a high-confidence hypothesis.
7. **Step 7 — Recommend Targeted Fix**: Generates the minimal source code patch required to resolve the regression.
8. **Step 8 — Apply Fix Safely**: Developer reviews the patch in the **Review and Apply Fix** modal and clicks **Confirm & Apply Patch**.
9. **Step 9 — Rerun and Verify**: Click **Verify Fix Now** to rerun the test suite and confirm all 11 tests pass.
10. **Step 10 — Save Completed Investigation**: Persists the investigation outcome (`PASS`), before-vs-after diffs, and verification run to MongoDB Atlas.

---

## 🧪 Demonstration Scenarios

### Scenario A — Permission Regression (Authorization Bypass)
- **What happens:** A developer accidentally removes `requireRole(['admin', 'project_manager', 'member'])` from `PATCH /api/tasks/:id` in `backend/src/routes/task.routes.ts`.
- **How to test:**
  1. Click **"Scenario A: Permission Regression"** in the top navigation bar.
  2. Click **"Run Investigation"**.
  3. Observe that KaizenTrace identifies the changed route file, flags the 403 vs 200 security failure, and suggests restoring `requireRole`.
  4. Click **"Review and Apply Fix"** → **"Confirm & Apply Patch"**.
  5. Click **"Verify Fix Now"** → Final status turns to **PASS**.

### Scenario B — Database Persistence Failure
- **What happens:** An unhandled error or database persistence fault occurs during a task state transition in `backend/src/services/taskService.ts`.
- **How to test:**
  1. Click **"Scenario B: Task Update Failure"**.
  2. Click **"Run Investigation"**.
  3. Observe that KaizenTrace flags the 500 `DATABASE_ERROR` test failure and locates the fault block in `taskService.ts`.
  4. Click **"Review and Apply Fix"** → **"Confirm & Apply Patch"**.
  5. Click **"Verify Fix Now"** → Final status turns to **PASS**.

### Resetting to Baseline
Click **"Reset Code to Baseline"** at any time to restore the TeamFlow repository back to clean `git HEAD`.

---

## 📊 Automated Verification & Build Commands

Run the automated test suites and production builds:

```powershell
# Run TeamFlow vitest suite (11/11 tests pass)
npm run test:teamflow

# Typecheck and build KaizenTrace backend
npm --prefix kaizentrace/backend run build

# Typecheck and build KaizenTrace frontend
npm --prefix kaizentrace/frontend run build
```
