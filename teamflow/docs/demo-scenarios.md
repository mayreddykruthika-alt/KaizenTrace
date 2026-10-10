# TeamFlow — KaizenTrace Incident Investigation Scenarios

This document outlines the four controlled incident scenarios engineered into **TeamFlow** for **KaizenTrace** to monitor, investigate, and verify.

---

## Scenario 1: Permission Regression

### Description
In an enterprise team environment, security roles dictate who can mutate data. A **Viewer** must only have read permissions. In this scenario, we verify that attempts by unauthorized roles to modify records are rejected, and we test how KaizenTrace catches permission regressions when code checks are bypassed.

### Normal Behavior
1. Log in or send request as Viewer persona (`jordan.lee@teamflow.io`, role: `viewer`).
2. Attempt to update a task via `PATCH /api/tasks/:id`.
3. The backend rejects the request with **HTTP 403 Forbidden** and error code `FORBIDDEN`.
4. A structured warning log is emitted containing the `requestId`, `actorId`, `actorRole`, and requested operation.
5. The database state remains unmodified.

### Controlled Fault Injection
- Set `TEST_DISABLE_PERMISSIONS=true` in `backend/.env`.
- When active, the role-checking middleware logs a warning: `[FAULT_INJECTION] TEST_DISABLE_PERMISSIONS active - bypassing role verification` and permits the request.
- **KaizenTrace Investigation**: KaizenTrace correlates the code diff bypassing the authorization check with the suspicious HTTP 200 update event triggered by a Viewer actor.

---

## Scenario 2: Missing Records & Audit Retention

### Description
When resources are requested that do not exist, the API must return a distinguishable error code rather than crashing or returning generic 500 errors. Furthermore, when synthetic records are deleted, authoritative audit events must permanently survive to facilitate root-cause investigation.

### Normal Behavior
1. Request a nonexistent task ID: `GET /api/tasks/507f1f77bcf86cd799439011`.
2. The backend responds with **HTTP 404** and code `TASK_NOT_FOUND`.
3. Delete an existing synthetic task: `DELETE /api/tasks/:id`.
4. The task document is removed from the `tasks` collection.
5. In `activity_events`, an immutable record with action `task_deleted` is recorded with `entityId`, `entityTitle`, and `before` snapshot.
6. **KaizenTrace Investigation**: When a downstream process queries the missing ID, KaizenTrace inspects `activity_events` to determine who deleted the entity, when, and with what correlation request ID.

---

## Scenario 3: Failed Background Job & Deduplication

### Description
Background jobs (such as deadline reminders) frequently encounter temporary infrastructure partitions or external service failures. Workers must record detailed execution statuses in `job_runs` without crashing the main application, and subsequent retries must avoid spamming users with duplicate alerts.

### Normal Behavior
1. Synthetic tasks with deadlines within 48 hours are scanned by `DeadlineReminderJob`.
2. In-app notifications are dispatched to assignees.
3. Each run writes a document to `job_runs` with `status: 'completed'`, `processedCount`, and duration.
4. Subsequent runs within 24 hours check existing notifications and suppress duplicates (`NOTIFICATION_DEDUPLICATED`).

### Controlled Fault Injection
1. Navigate to **Settings & Scenarios** in the UI and click **"Simulate Worker Failure"** or send `POST /api/demo/trigger-deadline-job` with `{ "forceFailure": true }`.
2. The job worker catches the simulated network partition, records `status: 'failed'` in `job_runs`, and sets `errorSummary`.
3. The server continues running smoothly without crashing.
4. **KaizenTrace Investigation**: KaizenTrace detects the `job_runs` status failure, correlates it with Pino error logs (`JOB_FAILED`), and suggests retry remediation.

---

## Scenario 4: Inconsistent Updates & Persistence Failure

### Description
When multi-step updates occur (e.g., updating a task status and recording the corresponding activity audit event), failures during persistence must never result in false success reporting or corrupt states where an audit log claims a change occurred that the database rejected.

### Normal Behavior
1. Update a task status via `PATCH /api/tasks/:id/status`.
2. Database write succeeds.
3. Activity audit event is persisted.
4. API responds with HTTP 200.

### Controlled Fault Injection
1. Set `TEST_FAIL_TASK_UPDATE=true` in `backend/.env`.
2. Attempt to update a task via API.
3. The server simulates a database write failure before persistence, aborts the operation, and responds with **HTTP 500** and code `DATABASE_ERROR`.
4. No false success audit event is written to `activity_events`.
5. **KaizenTrace Investigation**: KaizenTrace inspects the failed transaction log and confirms that database state integrity was preserved.

---

## Resetting Synthetic Data

To restore the demo application back to its clean baseline state at any time:
- In the UI: Navigate to **Settings & Scenarios** and click **"Reset Demo Data"**.
- Via CLI: Run `npm --prefix backend run reset`.
- Via API: Send `POST /api/demo/reset-data`.
