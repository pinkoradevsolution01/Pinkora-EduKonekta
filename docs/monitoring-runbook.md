# Monitoring dashboard and alert runbook

Configure the pilot monitoring dashboard with these privacy-safe signals only:

| Signal                           | Source                                                             | Alert condition                                         | Owner action                                                            |
| -------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| API uptime/database reachability | `GET /api/v1/health`                                               | Non-200 or `database: down` for 2 minutes               | Check deployment, database, and rollback decision                       |
| Web uptime                       | `GET /api/health`                                                  | Non-200 for 2 minutes                                   | Check web deployment and API configuration                              |
| Server failures                  | Structured logs by request ID                                      | Sustained 5xx increase or repeated same request failure | Open incident; inspect safe log metadata only                           |
| Notification backlog             | `GET /api/v1/notifications/monitoring/queue` (platform admin only) | Pending increases for 15 minutes or failed is non-zero  | Check worker/provider; do not retry manually without idempotency review |
| Authentication abuse             | Structured `LOGIN_FAILED` audit activity/rate-limit responses      | Repeated failure pattern                                | Investigate and protect affected accounts                               |
| Backup/restore                   | Signed restore exercise                                            | Older than 90 days or failed result                     | Block expansion and schedule isolated restore test                      |

The monitoring endpoint returns queue counts and maximum attempts, never recipient identities or payloads. Retain only operational logs according to the school-approved retention schedule. Test alert delivery before pilot launch and document the receiving contact.
