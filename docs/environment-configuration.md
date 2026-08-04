# Environment configuration guide

Use separate hosting-project environments and separate managed PostgreSQL databases for staging and production. Configure values through the hosting provider's secret manager, not checked-in `.env` files.

## Backend environment

| Variable                | Staging/production value                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`              | `production`                                                                                            |
| `PORT`                  | Provider-assigned HTTP port                                                                             |
| `DATABASE_URL`          | Environment-specific managed PostgreSQL connection string; enforce provider TLS where required          |
| `CORS_ORIGIN`           | Exact HTTPS frontend URL for the same environment                                                       |
| `API_PREFIX`            | `api`                                                                                                   |
| `API_VERSION`           | `v1`                                                                                                    |
| `LOG_LEVEL`             | `info` (or `warn` for reduced volume)                                                                   |
| `SAFETY_ENCRYPTION_KEY` | Unique managed secret, 32+ characters, preserved for safe recovery of encrypted safety/guidance records |

The backend must have a least-privileged database account, outbound access only to approved services, HTTPS enforced by the host/proxy, and a health check at `/api/v1/health`.

## Frontend environment

| Variable              | Staging/production value                                              |
| --------------------- | --------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Exact HTTPS API URL, ending in `/api/v1` for the matching environment |

Because `NEXT_PUBLIC_*` values are embedded in the browser build, it must contain no secret. Build staging and production frontend artifacts separately.

## Required provider configuration before release

- Vercel (or equivalent): separate staging and production projects/domains, HTTPS, environment-specific `NEXT_PUBLIC_API_URL`, deployment health check.
- Render/Lightsail (or equivalent): immutable API image/release, `/api/v1/health` health check, structured log destination, error alerting, exact `CORS_ORIGIN`.
- Managed PostgreSQL: private connectivity where supported, daily encrypted backups, retention period, restore owner, and quarterly isolated restore exercise.
- Object storage: private bucket/container, signed short-lived reads, malware scanning, encryption, retention policy, and no public listing. Do not enable sensitive evidence uploads without these controls.
- GitHub Actions: protect the deployment environment, require review, and grant only registry/deployment credentials required by the workflow.

## Email and notification scope

In-app notifications may be enabled after queue checks pass. The repository intentionally uses a `NoopEmailAdapter`; email notifications, verification, and password-reset delivery require an approved provider integration, sending domain, SPF/DKIM/DMARC, credentials in the secret manager, retry/error alerts, and privacy-template verification. Do not set placeholder SMTP values or claim email delivery is live before that work is complete.

## Rotation and change control

Record secret owner, creation date, rotation date, and recovery impact. Rotate database credentials and external-provider keys through a staged rollout. Rotate `SAFETY_ENCRYPTION_KEY` only with an approved encryption-key migration plan; losing it prevents decryption of protected records.
