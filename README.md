# Pinkora EduKonekta

Pinkora EduKonekta is a Progressive Web Application foundation for multi-tenant school communication and student support. This repository is a modular monolith monorepo; business modules are intentionally not included yet.

## Repository layout

```text
apps/
  api/                 NestJS API, Prisma client, health endpoint
  web/                 Next.js + React + Tailwind frontend
packages/
  shared/              Shared TypeScript contracts
docs/
  architecture.md      Architecture decisions and extension points
prisma/                API-owned Prisma schema and future migrations
.github/workflows/     CI validation
```

## Local setup

Prerequisites: Node.js 22+, npm 10+, and Docker Desktop.

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Start PostgreSQL and the local services: `docker compose up --build`. The API container generates Prisma, applies migrations, and loads the demonstration seed before starting.
4. Check the API at `http://localhost:4000/api/v1/health` and the web app at `http://localhost:3000`.
5. Confirm all containers are healthy with `docker compose ps`; the API health response should contain `"status":"ok"` and `"database":"up"`.

For a non-Docker API process, run `npm run prisma:generate --workspace=@pinkora/api`, `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`, and `npm run prisma:seed --workspace=@pinkora/api` before starting the API.

Useful checks:

```text
npm run format:check
npm run lint
npm run typecheck
npm test
RUN_DB_TESTS=true npm test
npm run build
npm run check:secrets
```

For the Playwright smoke test, start the web app in one terminal with `npm run dev --workspace=@pinkora/web`, then run `npm run test:e2e` in another terminal.

No secrets belong in the repository. Use `.env` locally and configure CI/deployment secrets through the hosting provider.

See [docs/database.md](docs/database.md) for the ERD and tenant-isolation rules.
See [docs/testing.md](docs/testing.md) for demo users, passwords, manual scenarios, and automated testing instructions.
See [docs/deployment-runbook.md](docs/deployment-runbook.md) for the production release, migration, smoke-test, monitoring, backup, and approval gates.
See [docs/release-readiness-report.md](docs/release-readiness-report.md) for the current pilot release decision and remaining external gates.
See [docs/assignments-submissions.md](docs/assignments-submissions.md) for assignment access rules, signed attachments, events, and API routes.
See [docs/attendance-parent-dashboard.md](docs/attendance-parent-dashboard.md) for attendance access rules, correction history, notification recipients, and dashboard routes.
