# Development Prompt 15 — release-readiness report

**Report date:** 2026-08-04  
**Decision:** **Not approved for production deployment or partner-school pilot yet.** The technical release package is prepared and local validation is positive, but the required hosting, managed-service, alerting, and school approval evidence has not been provided in this workspace.

## Evidence completed locally

| Requirement                   | Evidence                                                                                                                                           | Status               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| Automated authorization tests | API suite passed: 27 suites, 71 tests; includes tenant guard, school administration, relationship, security, and authentication checks             | Passed locally       |
| Browser core journeys         | Playwright passed 10/10 on desktop and mobile, including the actual invitation-only login form, teacher workspace, and school-structure layout     | Passed locally       |
| Dependency scan               | `npm audit --omit=dev --json` reported 0 vulnerabilities                                                                                           | Passed locally       |
| Quality/security checks       | Lint, non-incremental type checks, Prettier, secrets scan, and diff checks passed in the latest hardening validation                               | Passed locally       |
| Backup restoration            | `scripts/restore-test.ps1` restored the local PostgreSQL database to isolated `edukonekta_restore_test`, verified 42 public tables, and removed it | Demonstrated locally |
| Rollback/runbooks             | Deployment, migration/rollback, incident, monitoring, restore, onboarding, feedback, and triage runbooks are documented                            | Documented           |
| Critical security findings    | No unresolved critical/high authorization or application data-exposure issue was found in the recorded hardening review                            | Passed code review   |

## Required production/pilot gates

| Requirement                          | Current status                                                                              | Release action                                                                                                                                  |
| ------------------------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Frontend/backend deployment          | Not deployed; no Vercel/Render/AWS credentials or target URLs supplied                      | Deploy approved immutable images to separate staging and production environments                                                                |
| Managed PostgreSQL                   | Not configured                                                                              | Create environment-specific managed database, least-privileged user, daily backups, retention, and network restrictions                         |
| Protected object storage             | Not configured                                                                              | Configure private encrypted storage, signed reads, malware scanning, and retention before attachments/evidence are in scope                     |
| CI/CD deployment                     | CI validation exists; no deployment workflow/credentials configured                         | Add protected environment deployment jobs and required review after selecting hosts                                                             |
| Production migration                 | Not run                                                                                     | Back up then run `prisma migrate deploy`; record migration and backup IDs                                                                       |
| Production smoke/authorization tests | Not run                                                                                     | Run `scripts/smoke-test.ps1` against target URLs and conduct authenticated cross-tenant negative checks                                         |
| Monitoring test alerts               | Not run; no alert receiver/provider configured                                              | Configure uptime/log/error alerts and document receipt of a test alert                                                                          |
| Email notification service           | Resend adapter is implemented; production credentials and sending domain are not configured | Verify provider credentials/domain, privacy-safe templates, retries, delivery/error alerting—or explicitly pilot with in-app notifications only |
| Managed backup restoration           | Only local restore demonstrated                                                             | Perform and retain an isolated restore exercise using the managed production backup                                                             |
| Pilot onboarding and approval        | Not evidenced                                                                               | Complete training records, incident contacts, allowed feature flags/scope, and written school approval                                          |

## Release package

- [Deployment checklist and migration/rollback guide](deployment-runbook.md)
- [Environment configuration guide](environment-configuration.md)
- [Smoke-test script](../scripts/smoke-test.ps1)
- [Monitoring checklist](monitoring-runbook.md)
- [Incident-response contacts template](incident-response.md)
- [Pilot onboarding and training guide](pilot-training.md)
- [Pilot feedback form](pilot-feedback-form.md)
- [Backup/restore procedure](backup-restore-test.md)
- [Pilot scope and approval gate](pilot-readiness.md)
- [Whole-system validation matrix](system-validation-matrix.md)

## Approval condition

The release owner may change this report to **Approved for controlled pilot** only after every production/pilot gate above has evidence, no Critical defect is open, and the named school representative has approved the scoped rollout. Until then, use only fictional data in the local/demo environment.
