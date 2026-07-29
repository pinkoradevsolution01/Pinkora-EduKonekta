# Evaluations and progress notes

The evaluations module records respectful educator observations to support learning and communication. It does not diagnose students, assess risk, issue punishment, label learners, or produce automated disciplinary outcomes.

## Note types and visibility

- `ACADEMIC_PROGRESS`, `BEHAVIOR_OBSERVATION`, `POSITIVE_ACHIEVEMENT`, and `TEACHER_FEEDBACK` can be parent-visible or internal.
- `INTERNAL_SAFEGUARDING` is always internal-only and is never returned by parent or student endpoints.
- Parent-visible notes may be acknowledged by a parent with an approved `ParentStudentLink` only.

## Access and tenant isolation

- Every evaluation and history record has `school_id` and every query scopes by the authenticated session's school.
- Teachers create, edit, and view notes only for students enrolled in their assigned classes. Teachers can edit only notes they authored.
- School and platform administrators can manage records in their authorized tenant scope.
- Parents view only parent-visible notes for approved linked children. Students view only their own parent-visible notes.
- Cross-school student IDs and unlinked parent requests are rejected with `403`.

## Audit trail

Creating, editing, and acknowledging notes produces an `AuditLog` event. Before every edit, the previous content, type, visibility, editor, timestamp, and optional reason are stored in `EvaluationHistory`.

## API

- `GET /api/v1/evaluations`
- `GET /api/v1/evaluations/summary`
- `POST /api/v1/evaluations`
- `PATCH /api/v1/evaluations/:id`
- `POST /api/v1/evaluations/:id/acknowledge`
- `GET /api/v1/evaluations/:id/history`
