# Pilot incident-response guide

## Contacts and severity

Before launch, fill in and distribute the pilot contact sheet: school lead, ICT/security lead, data-protection contact, guidance lead, Pinkora incident lead, and backup support contact. Do not place personal phone numbers in this repository.

| Severity | Examples                                                                                                             | Initial target                                 | Authority                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------ |
| Critical | Confirmed cross-tenant disclosure, compromised privileged account, unavailable service during safeguarding emergency | Acknowledge immediately; contain within 1 hour | Pinkora incident lead and school security/data-protection contacts |
| High     | Suspected unauthorized record access, persistent outage, failed backups                                              | Acknowledge within 4 hours                     | Pinkora support lead and school ICT lead                           |
| Medium   | A user blocked from a non-safety workflow, repeatable function defect                                                | Acknowledge next business day                  | Support lead                                                       |
| Low      | Cosmetic issue, usability improvement, documentation gap                                                             | Weekly review                                  | Product/support lead                                               |

## First response

1. Open an incident record with time, reporter, affected tenant, request ID, symptoms, and severity. Never copy student, message, safety-report, or guidance-case content into the record unless the authorized incident lead requires it.
2. Preserve relevant structured logs and audit entries. Do not alter audit logs.
3. Contain: revoke sessions, deactivate accounts, disable a feature flag, or pause the affected integration as appropriate.
4. Verify scope with tenant-scoped queries. A suspected cross-tenant issue is Critical until disproven.
5. Notify only the named contacts using a factual, privacy-safe status message.
6. Recover using the rollback procedure in [pilot readiness](pilot-readiness.md), verify health and authorization checks, then document resolution and corrective action.

## Communications

External updates state the service/workflow, impact window, mitigation, and next update time. They must not expose credentials, request tokens, student identities, case details, or evidence metadata. Safeguarding emergencies follow the school's established emergency procedure; this service must not promise emergency response.

## Post-incident review

Within five business days, record timeline, root cause, scope, controls used, data impact assessment, notifications required by the school/privacy process, corrective actions, owner, and due date. Review open high/critical corrective actions before expanding the pilot.
