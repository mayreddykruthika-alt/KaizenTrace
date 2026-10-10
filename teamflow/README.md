# TeamFlow — Team Project Management System

> **Demo application monitored by KaizenTrace.**  
> A realistic, full-stack, enterprise-grade project management application designed for testing incident investigation, code change correlation, observability, and regression verification.

---

### 🌐 Quick Access & Website URLs

| Service | URL | Status |
|---|---|---|
| **Web Application** | [http://localhost:5173/](http://localhost:5173/) | Active Local Demo |
| **Backend API** | [http://localhost:5000/api](http://localhost:5000/api) | Live |
| **Health & Database Status** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Live |
| **GitHub Repository** | [https://github.com/riddhilahoti-12/KaizenTrace_demo](https://github.com/riddhilahoti-12/KaizenTrace_demo) | Main |

---

## 1. Features & Capabilities

- **Interactive Workspace Dashboard**: Real-time delivery statistics, task completion rates, overdue work alerts, and interactive charts built with Recharts.
- **Projects Directory & Workstreams**: Complete project lifecycle tracking (Planning, Active, On Hold, Completed) with progress bars, milestone deadlines, and assigned member avatars.
- **My Tasks (Kanban Board & Table View)**: Full task CRUD with status workflows (`To Do`, `In Progress`, `In Review`, `Done`), priorities (`Urgent`, `High`, `Medium`, `Low`), quick move transitions, and discussion comment threads.
- **Team Directory & Role-Based Access Control (RBAC)**: Manage members, titles, departments, and roles (`admin`, `project_manager`, `member`, `viewer`).
- **Authoritative Audit History (`activity_events`)**: System-generated immutable audit trail capturing actor, entity, action, request ID, and expandable before/after state diffs.
- **In-App Notification Center**: Instant alerts for task assignment, approaching deadlines, and task completion, backed by deduplication algorithms.
- **Background Worker Scheduler**: Automated `DeadlineReminderJob` that scans approaching deadlines, alerts assignees, and logs execution runs to `job_runs`.
- **Instant Demo Persona Switcher**: Top-navigation dropdown allowing reviewers to test different security permissions in 1-click (Alex Rivera - Admin, Sarah Chen - PM, Elena Rostova - Member, Jordan Lee - Viewer).
- **Engineered for KaizenTrace**: Centralized request IDs (`x-request-id`), structured Pino logging, stable error codes, and safe fault injection flags.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS, CSS Custom Properties Design System
- **Icons**: Lucide React
- **Routing**: React Router DOM v7
- **Server State**: TanStack React Query v5
- **Charts**: Recharts
- **Forms & Validation**: Zod, React Hook Form

### Backend
- **Runtime**: Node.js v24+, Express.js, TypeScript
- **Database & ODM**: MongoDB Atlas / Mongoose v8
- **Logging**: Pino structured logger with redaction and request tracing
- **Validation**: Zod request schemas
- **Task Worker**: In-process scheduler for deadline processing
- **Testing**: Vitest, Supertest, MongoMemoryServer

---

## 3. Project Structure

```
KaizenTrace_demo/
├── backend/
│   ├── src/
│   │   ├── config/              # Environment validation & MongoDB connection
│   │   ├── controllers/         # Express controllers
│   │   ├── jobs/                # Background worker (DeadlineReminderJob)
│   │   ├── logger/              # Structured Pino logger
│   │   ├── middleware/          # Request ID, request logger, auth/RBAC, error handler
│   │   ├── models/              # Mongoose models (User, Project, Task, Activity, Notification, JobRun)
│   │   ├── repositories/        # Instrumented DB layer capturing operation durations
│   │   ├── routes/              # Express API route modules
│   │   ├── scripts/             # seed.ts and reset.ts CLI scripts
│   │   ├── services/            # Layered business logic & audit generation
│   │   ├── tests/               # Vitest suite covering all 4 KaizenTrace scenarios
│   │   ├── utils/               # AppError class, Zod schemas, synthetic seed dataset
│   │   ├── app.ts               # Express app factory
│   │   └── index.ts             # Server entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── components/          # Sidebar, Navbar, TaskModal, ProjectModal, MemberModal, UI badges
│   │   ├── context/             # AuthContext with demo persona switching
│   │   ├── layouts/             # DashboardLayout with notification polling
│   │   ├── lib/                 # Typed API client with actor header injection
│   │   ├── pages/               # Overview, Projects, ProjectDetail, MyTasks, Team, Activity, Notifications, Settings
│   │   ├── types/               # TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── docs/
│   ├── architecture.md          # System design & observability architecture
│   ├── api.md                   # REST API specification
│   └── demo-scenarios.md        # Step-by-step KaizenTrace test procedures
├── .env.example                 # Safe environment template
├── package.json                 # Monorepo orchestration scripts
└── README.md
```

---

## 4. Getting Started

### Prerequisites
- Node.js v18+ (tested on v24)
- npm v9+

### Environment Configuration

Copy `.env.example` to `backend/.env`:
```bash
cp .env.example backend/.env
```

Configure your MongoDB connection in `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/teamflow?retryWrites=true&w=majority
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=info

# Background Worker Settings
ENABLE_DEADLINE_JOB=true
DEADLINE_JOB_INTERVAL_MS=60000

# KaizenTrace Fault Injection Flags (Disabled by default)
TEST_FAIL_DEADLINE_JOB=false
TEST_FAIL_TASK_UPDATE=false
TEST_DISABLE_PERMISSIONS=false
```

> **Note for Local Testing**: If `MONGODB_URI` is not provided or points to a cluster without credentials, TeamFlow automatically initializes an in-memory Mongo server during local development and testing, so you can test the application immediately with zero setup!

---

## 5. Running the Application

### 1. Install Dependencies
```bash
# In backend
cd backend && npm install

# In frontend
cd ../frontend && npm install
```

### 2. Run Automated Test Suite
Verify that all 11 backend tests (including all 4 KaizenTrace scenarios) pass:
```bash
npm --prefix backend test
```

### 3. Start Development Servers
From the root workspace:

**Terminal 1 (Backend API on port 5000):**
```bash
npm run dev:backend
```

**Terminal 2 (Frontend on port 5173):**
```bash
npm run dev:frontend
```

Open your browser to `http://localhost:5173`. The backend will automatically seed initial demo data if the database is empty.

---

## 6. Demo Personas

TeamFlow includes pre-configured demo personas to test permissions without requiring an external email service:

| Persona | Role | Email | Permissions |
|---|---|---|---|
| **Alex Rivera** | Admin | `alex.rivera@teamflow.io` | Full workspace access, user role changes, delete operations |
| **Sarah Chen** | Project Manager | `sarah.chen@teamflow.io` | Manage projects, create & assign tasks within projects |
| **Marcus Vance** | Project Manager | `marcus.vance@teamflow.io` | Manage infrastructure projects & task assignments |
| **Elena Rostova** | Member | `elena.rostova@teamflow.io` | Update assigned tasks, move Kanban cards, add comments |
| **David Kim** | Member | `david.kim@teamflow.io` | Update assigned tasks, move Kanban cards, add comments |
| **Priya Patel** | Member (QA) | `priya.patel@teamflow.io` | Quality assurance, task status updates, discussion |
| **Jordan Lee** | Viewer | `jordan.lee@teamflow.io` | **Read-only access**. API returns 403 Forbidden on write attempts |

Use the top-right persona selector in the navigation bar to switch between roles instantly.

---

## 7. KaizenTrace Incident Scenarios

TeamFlow is specifically instrumented for KaizenTrace testing:

1. **Scenario 1: Permission Regression**: Verify Viewer cannot update tasks (`403 FORBIDDEN` + audit log). Toggle `TEST_DISABLE_PERMISSIONS=true` to simulate code regression.
2. **Scenario 2: Missing Records & Audit Retention**: Verify `404 TASK_NOT_FOUND` on nonexistent IDs. Deleting tasks permanently retains the `before` state in `activity_events`.
3. **Scenario 3: Background Worker Failure & Retries**: Trigger deadline reminder worker with simulated failure. Inspect failure record in `job_runs` and verify no duplicate notifications are sent on retry.
4. **Scenario 4: Inconsistent Updates**: Simulate database persistence failure (`TEST_FAIL_TASK_UPDATE=true`) to verify that the API returns `500 DATABASE_ERROR` and avoids false success audit records.

For full test procedures and log signatures, see [docs/demo-scenarios.md](docs/demo-scenarios.md).

---

## 8. Database Reseeding & Reset

To restore clean synthetic demo records at any time:
- In the UI: Open **Settings & Scenarios** and click **"Reset Demo Data"**.
- Via CLI: Run `npm --prefix backend run reset`.
- Via API: Send `POST /api/demo/reset-data`.

---

## 9. Verification & Build Status

- Backend TypeScript Build: `tsc` passes with 0 errors.
- Frontend Vite Build: `tsc && vite build` passes with 0 errors.
- Vitest Suite: 11/11 tests pass with 100% scenario coverage.
