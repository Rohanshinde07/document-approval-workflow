export interface DocumentTemplate {
  id: string;
  name: string;
  category: string;
  icon: string;
  summary: string;
  titleSuggestion: string;
  content: string;
}

export const DOCUMENT_TEMPLATES: DocumentTemplate[] = [
  {
    id: 'prd',
    name: 'Product Requirement Document (PRD)',
    category: 'Product & Planning',
    icon: '📋',
    summary: 'Standard industry specification for product features, user stories, and acceptance criteria.',
    titleSuggestion: 'Feature Specification: Core Module',
    content: `# Product Requirement Document (PRD)

## 1. Executive Summary
Brief high-level overview of the feature, business context, and targeted outcome.

## 2. Problem Statement & Opportunity
- What customer pain point does this solve?
- What happens if we don't build this?

## 3. Targeted User Personas
| Persona | Role | Key Goal |
|---|---|---|
| Primary | Operations Lead | Streamline team verification |
| Secondary | Compliance Auditor | Verify regulatory trail |

## 4. Key Functional Requirements
- **FR-1:** Users must be authenticated before accessing the workspace.
- **FR-2:** The workflow must enforce sequential 2-stage verification.
- **FR-3:** Audit events must be appended immutably upon state transitions.

## 5. Success Metrics & KPIs
- 40% reduction in turnaround time for document clearance.
- 100% adherence to compliance audit verification.

## 6. Out of Scope
- Direct third-party SMS notifications in v1.
`,
  },
  {
    id: 'tech_spec',
    name: 'Technical Architecture Specification',
    category: 'Engineering & Systems',
    icon: '🏗️',
    summary: 'Comprehensive design covering topology, database schema, concurrency controls, and security.',
    titleSuggestion: 'Architecture Spec: High-Throughput Engine',
    content: `# Technical Architecture Specification

## 1. Architecture Overview
This specification details the structural blueprint, data flow, and runtime constraints of the system.

## 2. System Topology
\`\`\`
[Client SPA (React + Vite)]
          │  HTTPS / JWT
          ▼
[API Gateway / Express 5 Engine]
          │  Transactional Isolation (SELECT FOR UPDATE)
          ▼
[Relational Database (Prisma + ACID Engine)]
\`\`\`

## 3. Data Models & Relational Boundaries
- **Project**: Root container for team members and permissions.
- **Document**: Core asset maintaining revision lifecycle and version snapshots.
- **AuditEvent**: Immutable journal with append-only guarantees.

## 4. Concurrency & Race-Condition Safeguards
1. All state-changing transitions run inside atomic database transactions.
2. Row-level locking protects against concurrent double-decision race conditions.
3. Reviewer and Approver assignments are strictly snapshotted upon submission.

## 5. Security & Authentication
- JWT Bearer tokens with strict expiration.
- Password hashes salted using bcrypt.
- Granular permission matrix calculated server-side per action.
`,
  },
  {
    id: 'sla',
    name: 'Service Level Agreement (SLA)',
    category: 'Legal & Operations',
    icon: '⚖️',
    summary: 'Formal agreement detailing service commitments, uptime guarantees, and incident escalation paths.',
    titleSuggestion: 'Enterprise Service Level Agreement (SLA)',
    content: `# Service Level Agreement (SLA)

## 1. Agreement Scope
This Service Level Agreement ("SLA") outlines availability standards and operational support metrics between the Service Provider and Enterprise Customers.

## 2. Uptime & Availability Guarantee
- **Monthly Uptime Commitment:** **99.9%** (excluding pre-scheduled maintenance windows).
- **Scheduled Maintenance Window:** Sunday 02:00 UTC – 04:00 UTC.

## 3. Incident Severity & Response Times
| Severity | Description | Response Time | Target Resolution |
|---|---|---|---|
| **P1 - Critical** | Core service down; full disruption | < 15 minutes | < 2 hours |
| **P2 - Major** | Core feature impaired; workaround available | < 1 hour | < 6 hours |
| **P3 - Minor** | Non-critical bug; minimal impact | < 4 hours | < 24 hours |

## 4. Escalation Contacts & On-Call Matrix
- **Tier 1:** Operations Support Desk (support@company.com)
- **Tier 2:** Engineering Incident Commander
- **Tier 3:** VP of Infrastructure / CTO

## 5. Service Credits & Penalties
Failure to meet the guaranteed monthly uptime will result in credited billing discounts according to the Master Service Agreement.
`,
  },
  {
    id: 'release_plan',
    name: 'Deployment & Release Runbook',
    category: 'DevOps & Releases',
    icon: '🚀',
    summary: 'Execution checklist for production deployments, rollback plans, and smoke testing.',
    titleSuggestion: 'Production Release Runbook: v2.0',
    content: `# Deployment & Release Runbook

## 1. Release Metadata
- **Target Release Date:** [Insert Date]
- **Release Coordinator:** [Insert Name]
- **Target Version:** v2.0.0

## 2. Pre-Deployment Checklist
- [ ] All automated unit & integration tests passing (100% green).
- [ ] Database migration scripts validated against staging replica.
- [ ] SMTP notification gateway tested and verified.
- [ ] Environment variables configured in production secret manager.

## 3. Deployment Steps
1. Announce maintenance window commencement.
2. Run database migration: \`npx prisma db push --skip-generate\`.
3. Deploy new container build.
4. Verify healthcheck endpoint (\`/api/health\`).

## 4. Rollback Strategy
If any P1 anomaly occurs within 30 minutes of deployment:
1. Revert container image tag to previous stable build.
2. Execute rollback migration script.
3. Notify stakeholders and post incident post-mortem.

## 5. Post-Deployment Verification (Smoke Tests)
- [ ] User login and token issuance.
- [ ] Document creation and revision submission.
- [ ] Email notification delivery check.
`,
  },
];
