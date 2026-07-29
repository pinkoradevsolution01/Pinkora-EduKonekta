# School structure and parent linking

All structure records carry `school_id`. Services derive the tenant from the authenticated session and validate every referenced school year, class, subject, teacher profile, parent profile, and student profile before writing. Client-provided school IDs are not trusted; an `x-school-id` for another tenant is rejected by `TenantGuard`.

School administrators create school years, classes, subjects, profiles, enrollments, assignments, and parent links. Parent links are created as `APPROVED` only by an administrator, record the approving user and timestamp, and are auditable. Parents have no link-creation or arbitrary student-search endpoint; they can only read approved links for their own parent profile.

Teachers can list and open only classes for which their teacher profile has an assignment. Parents can view only approved linked children and their enrollments. Duplicate school years, classes, enrollments, assignments, profiles, and parent links are rejected by database uniqueness constraints and returned as conflicts.

Bulk enrollment validation accepts at most 1,000 rows, reports duplicate and unknown/cross-school identifiers, and performs no writes or destructive changes. An import executor should be added only after an explicit administrator confirmation workflow.
