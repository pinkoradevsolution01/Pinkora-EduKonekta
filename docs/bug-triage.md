# Pilot bug-triage workflow

1. Capture reporter role, tenant, route/workflow, time, browser/device, request ID, expected result, actual result, and reproducible steps. Exclude personal, safety, and guidance content.
2. Triage daily during the first two pilot weeks, then weekly. Classify using the incident severity table for security/privacy issues; otherwise use blocker, major, minor, or enhancement.
3. A blocker prevents an approved critical journey; a major has no safe workaround; a minor has a reasonable workaround. Cross-tenant access is always Critical.
4. Assign an owner, target date, and decision: fix, configuration/training, defer, or duplicate. Link the verifying test.
5. Verify the fix with the reporter's role and an unauthorized/cross-tenant negative check where relevant. Record the release and close only after confirmation.

Pilot expansion is blocked by any open Critical issue or any High authorization/data-exposure issue.
