# Document Revision & Approval Workflow — Design Spec

This file is the source of truth for the build. The coding agent reads the relevant section before every task. If a decision changes, change it here first, then in code.

---

## 1. Goal

A web app where documents belong to projects (and optionally tasks), move through a defined review → approval workflow, where the people who must review and approve are determined by their role on the project, and where every action is recorded in an append-only audit log.

Three pillars, in order of importance:

1. **Workflow state machine**: only legal transitions are possible, enforced on the backend.
2. **Role-based authorization from project membership**: who must act is derived from project roles, snapshotted at submission.
3. **Immutable audit trail**: every action is recorded atomically with the change it describes.

---

## 2. Stack

| Layer | Choice | Why |
|---|---|---|
| Runtime | Node.js 22, TypeScript (`strict`) | Required by brief |
| HTTP | Express 5 | Minimal, native async error handling |
| Validation | Zod | Typed request validation |
| ORM / migrations | Prisma 6 (pinned) | Declarative schema, reliable migrations, interactive transactions |
| Database | PostgreSQL 16 | Required by brief |
| Auth | Email + password, `bcryptjs`, JWT bearer token (8h) | Simple; `bcryptjs` is pure JS so no native build issues in Docker |
| Frontend | React + Vite + TypeScript + React Router, plain CSS | Polish is not graded; keep it thin |
| Tests | Vitest + Supertest against a real Postgres | Workflow correctness depends on the DB (transactions, locks, constraints) |
| Infra | Docker Compose | Single `docker compose up` |

The frontend is built to static files and served by the Express app. One app container, same origin, no CORS.

---

## 3. Architecture

```
HTTP routes  →  services  →  domain (pure)  
 (Zod,          (transactions,   (workflow.ts,
  auth)          locking, audit)  permissions.ts)
                     ↓
                  Prisma → PostgreSQL
```

- **Domain layer** (`backend/src/domain`): pure functions, with no Prisma or Express imports. `workflow.ts` decides whether a transition is legal and what the next state is. `permissions.ts` decides whether a user with a given role and relationship to a document may perform an action. These functions are unit-tested exhaustively.
- **Service layer** (`backend/src/services`): every state-changing operation runs inside **one** `prisma.$transaction`:
  1. Lock the document row (`SELECT ... FOR UPDATE`).
  2. Load current state, membership, and assignments.
  3. Check permission (domain).
  4. Compute transition (domain).
  5. Write changes.
  6. Write audit event(s).
  If anything throws, nothing persists, including the audit event.
- **Routes**: parse and validate input, call a service, and map domain errors to HTTP codes. No business logic.
- **`allowedActions`**: the backend computes, per document, which actions the current user may take right now, and returns them with the document. The frontend only renders buttons from this list. Authorization has exactly one source.

---

## 4. Repository layout

```
.
├── docker-compose.yml
├── Dockerfile                 # multi-stage: builds frontend + backend into one image
├── .env.example
├── .gitattributes / .gitignore
├── README.md
├── docs/DESIGN.md
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── src/
│       ├── app.ts             # builds Express app (no listen) — used by tests
│       ├── server.ts          # listens on PORT
│       ├── config.ts
│       ├── db.ts
│       ├── domain/            # workflow.ts, permissions.ts, errors.ts
│       ├── services/          # auth, projects, documents, comments, audit, queue
│       ├── routes/
│       ├── middleware/        # auth.ts, errorHandler.ts
│       └── seed/seed.ts
└── frontend/
    └── src/ (pages, api client, components)
```

---

## 5. Roles

Roles are **per project**. A user has **exactly one role per project** and can hold different roles on different projects.

| Role | Meaning |
|---|---|
| `OWNER` | Manages project members and roles. Can create documents. |
| `AUTHOR` | Can create documents. |
| `REVIEWER` | Must review submitted documents (first stage). |
| `APPROVER` | Must give final approval (second stage). Can reject. |
| `VIEWER` | Read-only. |

**Document author** is the user who created the document (`documents.author_id`). Only the document author can create new versions, submit, and resolve feedback. There is no co-authoring.

---

## 6. Data model

### Enums

- `ProjectRole`: `OWNER`, `AUTHOR`, `REVIEWER`, `APPROVER`, `VIEWER`
- `DocumentStatus`: `DRAFT`, `IN_REVIEW`, `IN_APPROVAL`, `CHANGES_REQUESTED`, `APPROVED`, `REJECTED`
- `AssignmentStage`: `REVIEW`, `APPROVAL`
- `AssignmentStatus`: `PENDING`, `APPROVED`, `CHANGES_REQUESTED`, `REJECTED`, `CANCELLED`
- `AuditAction`: see section 9

### Tables

**users**: `id` (uuid), `email` (unique), `name`, `password_hash`, `created_at`

**projects**: `id`, `name`, `description`, `created_by_id → users`, `created_at`

**project_members**: `id`, `project_id → projects`, `user_id → users`, `role` (ProjectRole), `created_at`
- unique (`project_id`, `user_id`)

**tasks**: `id`, `project_id → projects`, `title`, `description`, `created_at`

**documents**: `id`, `project_id → projects`, `task_id → tasks` (nullable), `title`, `author_id → users`, `status` (DocumentStatus, default `DRAFT`), `current_version_id → document_versions` (nullable), `created_at`, `updated_at`

**document_versions**: `id`, `document_id → documents`, `version_number` (int, starts at 1), `content` (text, Markdown), `change_summary` (text), `created_by_id → users`, `created_at`
- unique (`document_id`, `version_number`)

**review_assignments**: `id`, `document_id`, `version_id → document_versions`, `user_id → users`, `stage` (AssignmentStage), `status` (AssignmentStatus, default `PENDING`), `decided_at` (nullable), `decision_comment` (nullable), `created_at`
- unique (`version_id`, `user_id`, `stage`)

**comments**: `id`, `document_id`, `version_id → document_versions`, `author_id → users`, `body`, `created_at`, `resolved_at` (nullable), `resolved_by_id` (nullable), `resolved_in_version_id` (nullable)

**audit_events**: `id`, `project_id`, `document_id` (nullable), `version_id` (nullable), `actor_id → users`, `action` (AuditAction), `from_status` (nullable), `to_status` (nullable), `metadata` (jsonb), `created_at` (DB default `now()`)
- A Postgres trigger rejects `UPDATE` and `DELETE` on this table. The log is append-only at the database level.
