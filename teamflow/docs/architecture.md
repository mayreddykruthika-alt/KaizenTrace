# TeamFlow — Architecture & System Design

## 1. System Overview

**TeamFlow** is a modern, enterprise-grade Team Project Management System designed to serve as the monitored target application for **KaizenTrace**. KaizenTrace correlates code changes, API failures, database outcomes, application logs, and background worker jobs to detect anomalies, investigate incidents, and verify fixes.

### Architecture Diagram

```
+-------------------------------------------------------------+
|                  TeamFlow React Frontend                     |
|  (Vite + React 18 + Tailwind CSS + TanStack Query + Lucide) |
+------------------------------+------------------------------+
                               | HTTP / REST (X-Request-Id, X-Actor-Id)
                               v
+-------------------------------------------------------------+
|                  TeamFlow Express API                       |
|                                                             |
|  [Middleware Pipeline]                                      |
|    - Request ID Generation (UUIDv4 / Header propagation)    |
|    - Structured Request Logging (Pino JSON stream)          |
|    - Demo Role-Based Auth Context (req.actor)               |
|    - Centralized Error Handling & Stable Error Codes        |
|                                                             |
|  [Layered Application Services]                             |
|    - ProjectService / TaskService / UserService             |
|    - ActivityService (Authoritative Audit Log)              |
|    - NotificationService (In-app Alerts & Deduplication)    |
|    - DashboardService (Real DB Aggregations)                |
|                                                             |
|  [Background Workers]                                       |
|    - DeadlineReminderJob (In-process scheduler)             |
|                                                             |
|  [Repository Instrumentation Layer]                         |
|    - Duration Timing, Entity IDs, Error Categorization      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                      MongoDB Atlas                          |
|  Collections: users, projects, tasks, activity_events,       |
|               notifications, job_runs                       |
+-------------------------------------------------------------+
```

---

## 2. Layered Backend Design

The backend is built with strict separation of concerns:

- **Routes (`src/routes/`)**: Declarative endpoint definitions with input validation and role authorization gates.
- **Controllers (`src/controllers/`)**: HTTP transport handling, request parameter extraction, and status code dispatching.
- **Services (`src/services/`)**: Business logic, workflow rules (e.g. status completion timestamping, notification triggers), and consistency guarantees.
- **Repositories & Instrumentation (`src/repositories/`)**: Wraps database operations to measure duration, extract entity IDs, and categorize outcomes (`SUCCESS`, `EMPTY_RESULT`, `NOT_FOUND`, `ERROR`).
- **Models (`src/models/`)**: Mongoose schemas with strict types, indexes, and JSON sanitization.

---

## 3. Observability & KaizenTrace Integration

### A. Structured Logging with Pino
Every incoming request receives an `X-Request-Id`. Log lines are structured JSON objects with:
- `timestamp`, `service`, `env`
- `requestId`
- `actorId`, `actorRole`
- `method`, `url`, `statusCode`, `durationMs`
- `errorCode`, `errorMessage` (safe, redacted from secrets)

### B. Stable Error Codes
The application uses standardized error codes:
- `VALIDATION_ERROR` (HTTP 400)
- `BAD_REQUEST` (HTTP 400)
- `UNAUTHORIZED` (HTTP 401)
- `FORBIDDEN` (HTTP 403)
- `PROJECT_NOT_FOUND` (HTTP 404)
- `TASK_NOT_FOUND` (HTTP 404)
- `USER_NOT_FOUND` (HTTP 404)
- `CONFLICT` (HTTP 409)
- `DATABASE_ERROR` (HTTP 500)
- `JOB_FAILED` (HTTP 500)

### C. Authoritative Audit Trail (`activity_events`)
All create, update, delete, role change, and assignment operations generate immutable audit events:
- Recorded on the backend *after* persistence succeeds.
- Preserves `before` and `after` snapshots for inspection.
- When an entity is deleted, its deletion audit record survives with its original `entityId` and `entityTitle`.

---

## 4. Database Schema & Indexes

### Collections:
1. **users**: Unique index on `email`, index on `role`, `isActive`.
2. **projects**: Compound index on `status`, index on `ownerId`, `memberIds`, text search on `name` & `description`.
3. **tasks**: Compound indexes on `(projectId, status)`, `(assigneeId, status)`, indexes on `dueDate`, `priority`, text search on `title` & `description`.
4. **activity_events**: Descending index on `createdAt`, indexes on `actorId`, `projectId`, `(entityType, entityId)`.
5. **notifications**: Compound index on `(recipientId, readAt, createdAt)`.
6. **job_runs**: Indexes on `(jobType, startedAt)`, `status`.
