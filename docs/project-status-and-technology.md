# JVerse EduKonekta: project status and technology

## Current phase

The project is in the **MVP completion and pre-production phase**. It is suitable for demonstrations and controlled testing with fictional data. It is **not yet approved for production use with real school, learner, parent, safety-report, or guidance-case data**.

## Technology stack

| Area                         | Technology                                                                                                     |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Web application              | Next.js 16.3 canary, React 19, TypeScript                                                                      |
| Styling                      | Tailwind CSS 4 and responsive CSS                                                                              |
| Backend API                  | Node.js, NestJS, TypeScript                                                                                    |
| Database                     | PostgreSQL 16                                                                                                  |
| Data access and migrations   | Prisma ORM                                                                                                     |
| Local platform               | Docker and Docker Compose                                                                                      |
| Frontend development bundler | Next.js Turbopack                                                                                              |
| Testing                      | Jest, Playwright foundation                                                                                    |
| Code quality                 | ESLint, Prettier, TypeScript type checking                                                                     |
| CI foundation                | GitHub Actions                                                                                                 |
| Authentication               | Secure cookie sessions; invitation-only local authentication; managed-auth mapping prepared for Google Sign-In |
| Email direction              | Resend planned, with a verified custom sending domain required before production sending                       |

## Completed or substantially implemented

### Platform foundation

- Monorepo with web application, API, shared package, Prisma schema, Docker configuration, and documentation.
- PostgreSQL container, API health check, structured error responses, API versioning, tenant-scoped `school_id` design, and local environment templates.
- Responsive JVerse EduKonekta interface with desktop sidebar navigation, mobile menu navigation, PWA setup, and branded footer.

### Identity and tenant controls

- Closed registration and invitation-based account activation.
- Login, logout, email-verification and recovery foundations, account activation/deactivation, session cookies, role authorization, and tenant guards.
- School memberships, roles, invitations, audit logs, feature flags, and tenant-aware data access.

### School operations

- School years, classes, subjects, student/teacher/parent profiles, enrollment, teacher assignments, and approved parent-student links.
- Announcements, calendar events, audience targeting, publication states, read tracking, and acknowledgement APIs.
- Assignments, submissions, due dates, late status, feedback, attachment protection foundations, and parent read-only access.
- Attendance recording, correction history, parent/student views, and summaries.
- Respectful progress notes, visibility controls, acknowledgement, and audit history.
- Parent-teacher messaging with tenant and relationship authorization, relationship-safe contact discovery, and private signed attachment downloads.

### Safeguarding and guidance

- Confidential safety reports for verified school users.
- Encrypted report descriptions, protected reporter identity, and protected evidence metadata/content.
- Explicit safeguarding authorization, confidential intake, reporter-safe status updates, evidence links with expiry, rate limiting, and audit records.
- Restricted guidance-case data model and API foundation: case creation from reports, assignments, elevated export, encrypted notes/action data, closure/reopening rules, and audit events.

### Quality and local operations

- Docker services run locally at:
  - Web: `http://localhost:3100`
  - API: `http://localhost:4000/api/v1`
  - PostgreSQL: `localhost:5432`
- API health endpoint verifies the database connection.
- Type checking, linting, Jest tests, web production build, and secret scan have been run successfully during prior validation cycles.

## Work still required before production release

### Completed notification, reporting, and hardening work

- Queue-backed in-app notifications and a Resend-ready email adapter, user preferences, idempotency, retries, privacy-safe templates, monitoring, and validation tests.
- Responsive administrator dashboard, de-identified analytics, date-filtered reports, capped queries, and administrator-only exports.
- Security headers, CSP, CSRF origin validation, request identifiers, safe error logging, authorization-matrix tests, restore-test documentation, and a clean production dependency audit.

See [design-validation.md](design-validation.md) and [hardening-findings.md](hardening-findings.md) for traceability and findings.

### Deployment and service readiness

- Verify the production domain and Resend DNS records (SPF, DKIM, DMARC).
- Configure production secrets outside source control.
- Configure HTTPS, monitoring, error alerting, backups, restore procedures, privacy notice, data-processing agreement, retention policy, and incident response plan.
- Complete a controlled school pilot using only approved data and roles.

## Recommended next order

1. Configure the Resend sending domain and production email credentials.
2. Deploy a demo environment with fictional data.
3. Complete the controlled private-school pilot and its external approval gates before any wider rollout.
