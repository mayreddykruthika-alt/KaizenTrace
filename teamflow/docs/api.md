# TeamFlow — REST API Reference

Base URL: `/api`

All responses follow a consistent JSON format:
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional feedback message",
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Error responses:
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Role 'viewer' is not authorized to perform this operation",
    "details": null
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## Authentication Endpoints

### 1. `GET /api/auth/me`
Returns current authenticated actor profile.
- **Headers**: `x-actor-id: <userId>` (Optional demo actor override)

### 2. `POST /api/auth/demo-login`
Switches demo persona context.
- **Body**: `{ "userId"?: string, "role"?: "admin" | "project_manager" | "member" | "viewer" }`

### 3. `GET /api/auth/demo-users`
Lists all available seeded personas with roles and avatars.

---

## Projects Endpoints

### 1. `GET /api/projects`
Query parameters:
- `status`: `planning` | `active` | `on_hold` | `completed`
- `search`: string
- `isArchived`: boolean

### 2. `POST /api/projects`
Requires role: `admin` or `project_manager`.
- **Body**:
  ```json
  {
    "name": "Distributed Consensus Engine",
    "description": "Raft protocol implementation",
    "dueDate": "2026-11-30",
    "status": "planning",
    "category": "Core Infrastructure",
    "memberIds": ["<userId>"]
  }
  ```

### 3. `GET /api/projects/:id`
Returns project details, live progress %, and task list.

### 4. `PATCH /api/projects/:id`
Requires role: `admin` or `project_manager`.

### 5. `POST /api/projects/:id/archive`
Requires role: `admin` or `project_manager`.

---

## Tasks Endpoints

### 1. `GET /api/tasks`
Query parameters:
- `projectId`: string
- `assigneeId`: string
- `status`: `todo` | `in_progress` | `in_review` | `done`
- `priority`: `low` | `medium` | `high` | `urgent`
- `isOverdue`: boolean
- `search`: string

### 2. `POST /api/tasks`
Requires role: `admin` or `project_manager`.
- **Body**:
  ```json
  {
    "title": "Implement TLS 1.3 Cipher Suites",
    "projectId": "<projectId>",
    "assigneeId": "<userId>",
    "priority": "high",
    "status": "todo",
    "dueDate": "2026-11-15"
  }
  ```

### 3. `GET /api/tasks/:id`
Returns full task details including comment history.

### 4. `PATCH /api/tasks/:id`
Requires role: `admin`, `project_manager`, or `member`.
*Note: Viewers receive 403 FORBIDDEN.*

### 5. `DELETE /api/tasks/:id`
Requires role: `admin` or `project_manager`.
Deletes task and creates an immutable deletion audit record in `activity_events`.

### 6. `PATCH /api/tasks/:id/status`
Updates status and records transition timestamp.

### 7. `POST /api/tasks/:id/comments`
Adds a discussion comment and notifies assignee.

---

## Team & Users Endpoints

### 1. `GET /api/users`
Returns team roster enriched with project and active task counts.

### 2. `POST /api/users`
Requires role: `admin`.

### 3. `PATCH /api/users/:id/role`
Requires role: `admin`.
- **Body**: `{ "role": "project_manager" }`

### 4. `PATCH /api/users/:id/active`
Requires role: `admin`.
- **Body**: `{ "isActive": false }`

---

## Audit & Activity Endpoints

### 1. `GET /api/activity`
Returns authoritative audit timeline.
- Parameters: `projectId`, `actorId`, `action`, `limit`, `page`.

### 2. `GET /api/activity/:id`
Returns single audit event with before and after state snapshots.

---

## Notifications Endpoints

### 1. `GET /api/notifications`
Returns in-app notifications and unread count for current actor.

### 2. `PATCH /api/notifications/:id/read`
Marks single notification as read.

### 3. `POST /api/notifications/read-all`
Marks all notifications as read.

---

## Dashboard Analytics Endpoints

### 1. `GET /api/dashboard/summary`
Calculates live counts from database: total/active/completed projects, total/completed/overdue tasks, weekly completions, active team members.

### 2. `GET /api/dashboard/task-status`
Aggregates tasks by status and priority for charts.

### 3. `GET /api/dashboard/recent-activity`
Returns the 10 most recent audit events.

---

## Demo & Scenario Endpoints

### 1. `GET /api/demo/scenarios`
Lists documentation and triggers for all 4 KaizenTrace scenarios.

### 2. `POST /api/demo/trigger-deadline-job`
Triggers deadline reminder worker immediately. Supports `{ "forceFailure": true }` to simulate Scenario 3 failure.

### 3. `GET /api/demo/job-runs`
Returns history of worker runs from `job_runs` collection.

### 4. `POST /api/demo/reset-data`
Resets the synthetic demo dataset cleanly.
