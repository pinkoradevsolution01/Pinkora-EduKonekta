# Assignments and submissions

The assignments module is tenant scoped by `school_id`. Assignments reference an existing school class, subject, and teacher assignment. Draft and archived assignments are hidden from students and parents.

## Access rules

- Teachers create, update, publish, archive, and provide feedback only for classes and subjects assigned to them.
- School administrators and platform administrators can manage assignments in their authorized school context.
- Students see published assignments for their active enrollments and can submit only under their own `StudentProfile`.
- Parents see published assignments for linked children and can read submissions and feedback only.
- Every query includes the authenticated school tenant. Cross-school identifiers are rejected.

## Attachments

The API accepts only approved MIME types and files up to 10 MB. The client supplies a storage key for the configured object-storage provider; the API never treats a client URL as trusted. Access is granted through a 60-second HMAC-signed URL after role and relationship authorization. A production deployment should connect the storage key to private object storage with malware scanning.

## Late status and reminders

An item is late when `submitted_at` is after `due_at`. Submission and publication generate domain events (`assignment.submitted` and `assignment.published`) for a future queue/notification worker. The current in-memory publisher keeps local development stateless and testable.

## Routes

- `GET /api/v1/assignments`
- `POST /api/v1/assignments`
- `PATCH /api/v1/assignments/:id`
- `POST /api/v1/assignments/:id/publish`
- `POST /api/v1/assignments/:id/archive`
- `POST /api/v1/assignments/:id/submissions`
- `GET /api/v1/assignments/:id/submissions`
- `PATCH /api/v1/assignments/submissions/:submissionId/feedback`
- `POST /api/v1/assignments/attachments/:kind/:id/sign`
- `GET /api/v1/assignments/attachments/:kind/:id?token=...`
