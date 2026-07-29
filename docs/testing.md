# Pinkora EduKonekta testing guide

This guide covers local manual and automated testing for Pinkora EduKonekta.

## Start the application

From the repository root run `docker compose up -d`, then `docker compose ps`. If `docker` is not available in PowerShell, use Docker Desktop's executable:

```powershell
$dockerPath = "C:\Users\Acer\AppData\Local\Programs\DockerDesktop\resources\bin\docker.exe"
& $dockerPath compose up -d
& $dockerPath compose ps
```

Services:

- Web: http://localhost:3000
- API: http://localhost:4000
- PostgreSQL: localhost:5432
- Web health: http://localhost:3000/api/health
- API health: http://localhost:4000/api/v1/health

The API health response should report `status: ok` and `database: up`.

## Demo accounts

All seeded demo accounts use `PinkoraDemo!2026`.

| Email                           | Role                 | Test scope                                |
| ------------------------------- | -------------------- | ----------------------------------------- |
| `admin@demo.edukonekta.test`    | School administrator | Structure and publishing                  |
| `teacher@demo.edukonekta.test`  | Teacher              | Assigned classes, assignments, attendance |
| `parent@demo.edukonekta.test`   | Parent               | Linked children and dashboard             |
| `student@demo.edukonekta.test`  | Student              | Own assignments and attendance            |
| `guidance@demo.edukonekta.test` | Guidance             | Guidance communications                   |

These are local-development-only credentials. Never use them in staging or production.

## Application screens

- Login: http://localhost:3000/auth
- Role-based workspace: http://localhost:3000/workspace
- Assignments: http://localhost:3000/assignments
- Attendance: http://localhost:3000/attendance
- Parent dashboard: http://localhost:3000/dashboard/parent
- Communications and calendar: http://localhost:3000/communications
- School administration: http://localhost:3000/admin/structure
- Progress notes: http://localhost:3000/progress

The demonstration school ID is `c9932ad5-3217-4ef6-908b-980eb97dfb63`.

Main API routes include `/api/v1/assignments`, `/api/v1/attendance`, `/api/v1/attendance/me`, `/api/v1/attendance/children`, and `/api/v1/dashboard/parent`.

### Evaluations and progress notes

1. Sign in as the teacher and open `/progress`. Create a neutral progress note using the demonstration student profile ID from the administrator's student record.
2. Verify that a teacher can create a note only for a student in an assigned class.
3. Create an `INTERNAL_SAFEGUARDING` note and confirm that `PARENT_VISIBLE` is rejected.
4. Sign in as the parent and confirm only parent-visible notes for the linked child appear; internal notes must never appear.
5. Acknowledge a visible note as the parent, then confirm the acknowledgement is retained.
6. Edit a note as its author and confirm its history is available to authorized staff and an audit event is generated.

## Manual scenarios

### Authentication and workspace

1. Open `/auth` and confirm public registration is unavailable.
2. Log in as each demo role and confirm login redirects to `/workspace`.
3. Confirm each role sees only its relevant workspace tasks and navigation links.
4. Log out and confirm protected requests return `401`.
5. Make six invalid logins for one identity; the sixth should return `429`.

### School structure

As an administrator, create a school year, subject, class, profiles, enrollment, teacher assignment, and parent/student link. Repeat an enrollment and confirm `409`.

As a teacher, confirm assigned classes are visible and an unassigned class returns `403`.

As a parent, confirm only approved linked children are visible.

### Announcements and calendar

1. Create a draft and confirm recipients cannot see it before publication.
2. Publish it and confirm only intended recipients can see it.
3. Publish a class announcement as a teacher only to an assigned class.
4. Attempt another class and confirm `403`.
5. As a parent, mark an announcement read and acknowledge it.
6. Confirm expired announcements are absent.
7. Submit unsafe HTML or executable attachment metadata; confirm `400`.

### Assignments and submissions

1. Confirm teachers manage assignments only for assigned classes and subjects.
2. Confirm drafts are invisible to students and parents.
3. Submit student work and confirm timestamp and late status.
4. Confirm students cannot submit under another student's identity.
5. Confirm parents can read assignments and feedback but cannot edit or submit.
6. Confirm invalid or cross-school attachment access is denied.

### Attendance and parent dashboard

1. Sign in as the teacher and open `/attendance`.
2. Record Present, Absent, Late, or Excused for each enrolled student.
3. Repeat the same class/date sheet and confirm `409` duplicate prevention.
4. Correct a record with a reason and confirm `/api/v1/attendance/:id/history` shows old state, new state, reason, and authorized staff member.
5. Confirm an unassigned teacher receives `403` when recording or correcting attendance.
6. Confirm an Absent record generates `attendance.absence.recorded` for only approved parent links.
7. Sign in as the parent and confirm `/dashboard/parent` shows only linked children, attendance totals, assignment status, feedback, announcements, and upcoming events.
8. Confirm parents cannot call attendance recording or correction endpoints; expect `403`.
9. Sign in as the student and confirm `/attendance` shows only that student's records.
10. Confirm changing child identifiers cannot expose another child.

## Automated validation

Use `npm.cmd` in PowerShell if execution policy blocks `npm.ps1`:

```powershell
npm.cmd run format:check
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:e2e
npm.cmd run check:secrets
```

To enable database integration tests:

```powershell
$env:RUN_DB_TESTS = 'true'
npm.cmd test --workspace=@pinkora/api
Remove-Item Env:RUN_DB_TESTS
```

Playwright uses the running web service at `http://localhost:3000`.

## Docker logs and cleanup

Use `docker compose logs -f api`, `docker compose logs -f web`, or `docker compose logs -f postgres` to inspect logs. Stop services with `docker compose down`.

To discard local PostgreSQL data and reseed from scratch, run `docker compose down -v` followed by `docker compose up -d`. Only use this when local data can be discarded.
