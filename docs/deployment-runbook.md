# Production deployment runbook

Use this runbook for a controlled partner-school deployment. Complete each row in order and attach the command output, deployment URL, image digest, operator, and timestamp to the release record. Do not treat a local Docker run as production deployment approval.

See [environment-configuration.md](environment-configuration.md) for provider-neutral environment setup and [release-readiness-report.md](release-readiness-report.md) for the current release decision.

## Release inputs and approval

Before deployment, record the Git commit, immutable image tag/digest, target school/environment, release owner, rollback owner, approved pilot scope, and change summary. Deployment requires approval from the designated technical release owner and the school representative for the approved pilot scope.

Do not deploy real school data while any Critical or High authorization/data-exposure finding is open.

## 1. Build application images

Build both applications from the intended commit, using a unique immutable tag:

```powershell
$env:RELEASE_TAG = '2026-08-04.1' # Replace with the approved release tag.
docker compose build api web
docker image ls
```

In a registry-backed environment, tag and push the API and web images using the registry's approved naming and authentication process. Record the resulting image digests, not only a mutable tag such as `latest`.

## 2. Run release checks

Run these checks before pushing/deploying images:

```powershell
npm.cmd run format:check
npm.cmd run lint --workspace=@pinkora/api
npx.cmd tsc --noEmit --incremental false -p apps/api/tsconfig.json
npm.cmd test --workspace=@pinkora/api
npm.cmd run check:secrets
npm.cmd audit --omit=dev --json
```

For browser checks against a locally running Docker web service:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3100'
npm.cmd run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

The release fails if tests, lint, type checks, secret scan, or the production dependency audit fail.

## 3. Verify production configuration

Store values in the deployment platform's secret manager; never commit them or paste them into tickets/logs.

| Variable                     | Production requirement                                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                   | `production`                                                                                             |
| `DATABASE_URL`               | Managed PostgreSQL URL with the provider's TLS requirements; least-privileged application account        |
| `CORS_ORIGIN`                | Exact HTTPS frontend origin, with no wildcard                                                            |
| `PORT`                       | Platform-provided/listening port                                                                         |
| `API_PREFIX` / `API_VERSION` | `api` / `v1`, unless an approved API routing change exists                                               |
| `SAFETY_ENCRYPTION_KEY`      | Unique, managed secret of at least 32 characters; preserve it securely for recovery of protected records |
| `NEXT_PUBLIC_API_URL`        | Exact public HTTPS API base URL, ending in `/api/v1`                                                     |
| `LOG_LEVEL`                  | `info` or stricter; never log sensitive payloads                                                         |

Confirm HTTPS termination, HSTS, the exact CORS origin, database network access, and a separate production database before deployment.

## 4. Apply migrations and deploy the API

1. Take/confirm a database backup and record its identifier.
2. Run `npx prisma migrate status --schema apps/api/prisma/schema.prisma` using the target environment credentials.
3. Apply only committed migrations with `npx prisma migrate deploy --schema apps/api/prisma/schema.prisma`.
4. Deploy the approved API image, wait for the platform readiness check, and confirm `GET /api/v1/health` returns `status: ok` and `database: up`.
5. Do not run `prisma migrate dev` or seed demonstration data in production.

If migrations fail, stop the application rollout. Restore only through the documented, school-approved recovery process; do not modify migration history manually.

## 5. Deploy the frontend and run smoke tests

Deploy the approved web image/configuration only after the API is healthy. From an authenticated and an unauthenticated browser, verify:

1. Web health endpoint returns `200`: `/api/health`.
2. Invitation-only sign-in page loads over HTTPS.
3. A designated test administrator can sign in and reach the role-scoped workspace.
4. A designated test teacher sees only assigned classes.
5. A designated test parent sees only linked children.
6. An unauthorized request returns `401` and a cross-tenant request returns `403`.
7. Dashboard safety analytics contain aggregates only, with no reporter/case identity.

Record request IDs for any failed check. Do not use real safety or guidance content in smoke tests.

## 6. Notifications, monitoring, isolation, and backups

- Confirm in-app notification queue processing with a fictional announcement and verify only intended recipients receive it.
- The current email adapter is deliberately a `NoopEmailAdapter`. **Do not enable or claim production email delivery until an approved provider adapter, sending domain, SPF/DKIM/DMARC, credentials, retry monitoring, and privacy-template test are implemented and verified.**
- Configure uptime probes for web health and API health, structured-log/error alerts, and a platform-admin owner for `GET /api/v1/notifications/monitoring/queue`. See [monitoring-runbook.md](monitoring-runbook.md).
- Run and retain the authorization/tenant-isolation automated tests. Verify test accounts from School A cannot retrieve School B data in the deployed environment.
- Confirm managed database backup schedule, retention, encryption, restore owner, and the last successful isolated restore test. Run the restore exercise after migrations and at least quarterly; see [backup-restore-test.md](backup-restore-test.md).

## 7. Release decision and rollback

The release owner may approve only when all required checks have evidence, monitoring/backup ownership is recorded, notification scope is truthful, and the school has approved pilot scope. Record the approval name, timestamp, release digest, and known limitations.

Rollback triggers include failed health checks, a Critical/High security defect, cross-tenant exposure, irreversible migration error, or sustained service failure. Roll back by:

1. Disable the affected feature flag or pause invitations if that safely contains the impact.
2. Redeploy the last known-good API and web image digests.
3. Verify health endpoints and critical journeys.
4. If recovery is necessary, restore first into an isolated database and follow the school-approved incident process.
5. Notify named contacts using [incident-response.md](incident-response.md), without exposing learner or case details.

## Deployment approval record

| Item                                           | Evidence / owner | Complete |
| ---------------------------------------------- | ---------------- | -------- |
| Images built and digests recorded              |                  | ☐        |
| Automated checks and dependency scan passed    |                  | ☐        |
| Production secrets/configuration verified      |                  | ☐        |
| Backup confirmed; migrations applied           |                  | ☐        |
| API and web deployed; smoke tests passed       |                  | ☐        |
| Monitoring and error/log alerts tested         |                  | ☐        |
| Notification scope/provider verified           |                  | ☐        |
| Tenant-isolation check passed                  |                  | ☐        |
| Backup schedule and restore evidence confirmed |                  | ☐        |
| Technical release owner approval               |                  | ☐        |
| School pilot-scope approval                    |                  | ☐        |
