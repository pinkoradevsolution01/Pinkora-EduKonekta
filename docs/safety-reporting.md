# Confidential safety reporting

Reports require an authenticated, active, email-verified school account. They are confidential to ordinary users, rather than publicly anonymous. The system states clearly that it does not provide emergency response.

## Access and tenant isolation

- Every report and update is scoped by `school_id`; all reads use the authenticated school context.
- Reporters may submit a report and view only their own status updates. They never see staff identity or internal review details.
- Teachers, parents, students, and school administrators have no confidential intake endpoint.
- A guidance user must also have an active `SafeguardingAccess` record for the same school. This explicit authorization gates reporter identity, decrypted descriptions, and evidence metadata.
- Each confidential view, status update, and evidence-link action creates an audit record.

## Protected content

Descriptions, reporter identity, and evidence metadata are encrypted with AES-256-GCM before persistence. `SAFETY_ENCRYPTION_KEY` should be supplied by a secrets manager in production and rotated under a documented key-management process. The application uses a development-only fallback only outside production.

Evidence is restricted to PDF, JPEG, and PNG files up to 5 MB and is encrypted with the report. Production deployments should move encrypted file bytes to an approved malware-scanned object store. Evidence access uses a signed URL token that expires after 60 seconds. Notification events contain only category/status metadata—never descriptions, evidence, or reporter details.

## Threat model

Primary threats are unauthenticated reporting spam, cross-school data access, curious-insider disclosure, evidence-link replay, sensitive notifications, and automated disciplinary interpretation. Controls are login and verified-account requirements, per-user rate limits, tenant predicates, explicit safeguarding authorization plus audit trail, expiring HMAC-signed links, metadata-only events, and neutral factual input. Duplicate/abuse indicators are review signals only and never trigger accusations, discipline, or automated outcomes.
