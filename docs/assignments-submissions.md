# Assignments and submissions

The assignments module is tenant scoped by `school_id`. Assignments reference an existing school class, subject, and teacher assignment. Draft and archived assignments are hidden from students and parents.

## Access rules

- Teachers create, update, publish, archive, and provide feedback only for classes and subjects assigned to them.
- School administrators and platform administrators can manage assignments in their authorized school context.
- Students see published assignments for their active enrollments and can submit only under their own `StudentProfile`.
- Parents see published assignments for linked children and can read submissions and feedback only.
- Every query includes the authenticated school tenant. Cross-school identifiers are rejected.

## Attachments

The API accepts only PDF, JPG, PNG, TXT, and DOCX files up to 10 MB. It validates the decoded byte count server-side and generates the storage key itself; clients cannot supply a key or URL. Files are written to a private storage adapter and served only through a 60-second HMAC-signed URL after role and relationship authorization. Replacing or deleting an attachment removes the prior private object safely. The local adapter is for development; production must provide a private object-storage adapter with malware scanning.

## Late status and reminders

An item is late when `submitted_at` is after `due_at`. Publication, submission, and feedback generate queued notification events. The queue runner processes deliveries and enqueues one privacy-safe `assignment.due_soon` reminder per authorized recipient per assignment per day in the 24-hour due window.

## Routes

- `GET /api/v1/assignments`
- `POST /api/v1/assignments`
- `PATCH /api/v1/assignments/:id`
- `POST /api/v1/assignments/:id/publish`
- `POST /api/v1/assignments/:id/archive`
- `POST /api/v1/assignments/:id/attachment`
- `DELETE /api/v1/assignments/:id/attachment`
- `POST /api/v1/assignments/:id/submissions`
- `POST /api/v1/assignments/submissions/:submissionId/attachment`
- `DELETE /api/v1/assignments/submissions/:submissionId/attachment`
- `GET /api/v1/assignments/:id/submissions`
- `PATCH /api/v1/assignments/submissions/:submissionId/feedback`
- `POST /api/v1/assignments/attachments/:kind/:id/sign`
- `GET /api/v1/assignments/attachments/:kind/:id?token=...`
