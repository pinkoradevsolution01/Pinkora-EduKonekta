# Partner-school pilot readiness

This is the release gate for a single, controlled partner-school pilot. It does not authorize a production launch or collection of real data by itself.

## Proposed scope

- One named school, approved school year, and limited list of participating classes.
- Named school administrator, ICT/security contact, guidance lead, data-protection contact, and Pinkora support lead.
- Core workflows: invitation access, announcements, assignments, attendance, parent monitoring, and parent-teacher messaging.
- Safety reporting and guidance case management remain disabled until the school has named and trained authorized safeguarding personnel and approved its escalation policy.
- Pilot duration, success measures, support hours, data-import method, and planned end date must be signed off before invitations are issued.

## Technical release gate

| Check             | Evidence                                                                                                                                           | Status                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Critical journeys | API authorization suite plus Playwright desktop and mobile sign-in/navigation journeys                                                             | Ready for execution in the pilot environment |
| Security          | [hardening findings](hardening-findings.md) records no unresolved critical or high authorization/data-exposure finding                             | Technical review passed                      |
| Backup restore    | Run `powershell -ExecutionPolicy Bypass -File scripts/restore-test.ps1` against the pilot environment and attach its output to the pilot record    | Required before go-live                      |
| Monitoring        | API and web health probes, request IDs, structured logs, queue-count endpoint, and alert thresholds in [monitoring runbook](monitoring-runbook.md) | Configure owner and alert destination        |
| Rollback          | Feature flags, account deactivation, deployment rollback, and isolated restore procedure below                                                     | Ready; school approval required              |

## Required partner-school sign-off

Do not state that the pilot is approved until a school representative records all of the following:

- School name, participating classes, start/end dates, and allowed modules.
- Named support and incident contacts, including an after-hours emergency contact policy.
- Completion of the administrator and teacher training checklists in [pilot-training.md](pilot-training.md).
- Acceptance of the privacy notice, data-processing arrangement, safeguarding escalation policy, and data exit plan.
- Restore-test date, operator, result, recovery time, and recovery point.
- Written approval from the authorized school representative.

## Rollback procedure

1. Pause new invitations and set affected feature flags to `false` through the school settings endpoint.
2. Deactivate affected accounts or the school in the platform administration process; preserve audit logs.
3. If a release causes a fault, deploy the last known-good image, verify `/api/v1/health`, then run the critical-journey tests.
4. If data recovery is required, restore only into an isolated database first, validate tenant isolation and record counts, then follow the school-approved recovery decision.
5. Notify the named school contact using the incident guide; do not include learner or case details in status messages.
6. Record the decision, timestamps, scope, request IDs, and follow-up action in the audit/incident record.

## Current approval status

**Technical package prepared; partner-school approval, named support contacts, completed training, and a witnessed restore exercise are still external gates.**
