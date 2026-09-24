# Document Revision & Approval Workflow System

A full-stack, enterprise-grade Document Revision & Approval Workflow engine built with Node.js 22, Express 5, Prisma 6, PostgreSQL 16, and React + Vite.

---

## Key Features & Architectural Pillars

1. **Workflow State Machine Engine**:
   - Sequential 2-stage approval process (`DRAFT` → `IN_REVIEW` → `IN_APPROVAL` → `APPROVED` / `CHANGES_REQUESTED` / `REJECTED`).
   - Only legal transitions are allowed, strictly calculated by pure functions in `backend/src/domain/workflow.ts`.
   - Requires a new version (R10) and all previous comments resolved (R11) before resubmitting from `CHANGES_REQUESTED`.
2. **Role-Based Authorization from Project Membership**:
   - Roles (`OWNER`, `AUTHOR`, `REVIEWER`, `APPROVER`, `VIEWER`) are scoped per project.
   - Upon document submission, required reviewers and approvers are **snapshotted** into immutable assignment records for that round (R4).
   - Single source of truth for authorization: backend calculates `allowedActions` per document for the active user, and the frontend renders UI buttons strictly from this array.
3. **Database-Level Immutable Audit Trail**:
   - Every action writes an audit event atomically within the state-changing transaction.
   - A PostgreSQL database trigger (`prevent_audit_log_tampering`) rejects `UPDATE` and `DELETE` operations on `audit_events` at the database level.
4. **Race-Condition & Concurrency Protection**:
   - Workflow operations execute inside `prisma.$transaction` with row locking (`SELECT ... FOR UPDATE`), preventing concurrent double-advancement or split-brain transitions.
5. **✨ Google Gemini AI Compliance Verification**:
   - Integrated with Google Gemini Flash for automated compliance & risk audits on draft specifications.
   - Evaluates technical specs against industry guidelines, flags ambiguities, and suggests actionable reviewer recommendations with 1-click apply.
6. **📬 Automated Email Notifications (SMTP / Nodemailer)**:
   - Asynchronous, non-blocking notification engine for end-to-end workflow updates:
     - **On Submit:** Dispatches review requests with deep links to all designated technical reviewers.
     - **On Feedback:** Notifies authors immediately when changes are requested or comments added.
     - **On Stage Advance:** Alerts executive approvers when Stage 2 unanimous review passes.
     - **On Final Sign-off:** Dispatches sealed completion notices to project stakeholders.
     - **SLA Nudge:** One-click escalation reminders to pending reviewers approaching deadline.
7. **🛡️ Enterprise Governance Suite**:
   - **1-Click Sealed Audit Certificate:** Generates official compliance reports with cryptographic SHA-256 checksums, 4-Eyes sign-off timestamps, and native PDF/print export.
   - **Side-by-Side Visual Diff Viewer:** Compares document revisions side-by-side or unified with color-coded additions (`+`) and deletions (`-`).
   - **Review SLA Countdown Timers:** Dynamic 48h (Review) and 24h (Approval) deadline chips with visual overdue alerts.
   - **Multi-Format Document Import:** Drag-and-drop support for `.md`, `.txt`, `.docx`, and `.pdf` text extraction.

---

## Tech Stack

- **Runtime**: Node.js 22, TypeScript (`strict`)
- **Backend Framework**: Express 5
- **ORM & Database**: Prisma 6, PostgreSQL 16 (with SQLite dual-engine support for dev)
- **Validation**: Zod schema validation
- **Authentication**: JWT Bearer Tokens (8h validity) & `bcryptjs`
- **AI Engine**: Google Gemini Flash API (`@google/genai`)
- **Email Notifications**: Nodemailer with SMTP transport
- **Frontend**: React 18, Vite, TypeScript, React Router 6, Vanilla CSS design system
- **Testing**: Vitest + Supertest against real PostgreSQL
- **Containerization**: Docker Compose (multi-stage Dockerfile)

---

## Quick Start (Docker Compose)

The easiest way to launch the entire application (PostgreSQL + Express + static React frontend) is via Docker Compose:

```bash
docker compose up --build
```

Once started:
- Access the Web Application at: **http://localhost:3000**
- Healthcheck endpoint: **http://localhost:3000/api/health**

On startup, migrations will automatically apply and the seed script will populate standard demo users and demo projects.

---

## Demo Credentials

All demo users share the password: **`password123`**

| User Name | Email | Role (Core Platform) | Role (Customer Portal) |
|---|---|---|---|
| **System Administrator** | `admin@demo.com` | `SYSTEM_ADMIN` (Global Console) | `SYSTEM_ADMIN` |
| **Alice Smith** | `alice@demo.com` | `OWNER` | `OWNER` |
| **Bob Jones** | `bob@demo.com` | `AUTHOR` | `REVIEWER` |
| **Carol Danvers** | `carol@demo.com` | `REVIEWER` | `APPROVER` |
| **Dave Miller** | `dave@demo.com` | `REVIEWER` | `AUTHOR` |
| **Erin Wright** | `erin@demo.com` | `APPROVER` | — |
| **Frank Castle** | `frank@demo.com` | `VIEWER` | `VIEWER` |
| **Grace Hopper** | `grace@demo.com` | — | `OWNER` (Cloud Infra) |

> 💡 **Quick Testing Tips:**
> - **On Login Page:** Click any of the **`⚡ Quick Fill Demo Account`** buttons (Alice, Bob, Carol, Erin, Admin) to instantly auto-fill credentials and sign in.
> - **In App:** Once signed in as an Owner or Admin, use the **`Test Personas`** switcher on the sidebar to test Author ➔ Reviewer ➔ Approver ➔ Owner handoffs in under 30 seconds without manual re-login.

---

## Running Tests

### 1. Run Unit Tests (Pure Domain Logic)
```bash
npm --prefix backend test:unit
```

### 2. Run Integration Tests in Docker (Real Postgres Instance)
```bash
docker compose --profile test run --rm test
```

---

## Key Design Decisions & Trade-offs

- **Content is Markdown text stored in the version row**, not file uploads. This keeps focus on workflow correctness without S3/volume dependencies.
- **One role per user per project.** Avoids ambiguous overlaps (e.g. same user reviewing and approving the same round).
- **Two sequential stages, unanimous within each.** Review stage catches technical/content issues before approvers spend time.
- **Snapshot of reviewers and approvers at submission.** Required sign-offs cannot shift under an in-flight document round.
- **Resubmission requires a new version and resolved feedback.** Guarantees each round reviews new content and feedback is traceably addressed.
- **Append-only audit log enforced by PostgreSQL trigger**, securing audit trail integrity at the DB level.
- **Document row locking (`FOR UPDATE`)** for all workflow transactions to eliminate race conditions on final approvals.
- **404 for non-members** to prevent leaking document existence to unauthorized project users.
