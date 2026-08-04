# Pinkora EduKonekta run and testing guide

This guide explains how to run the complete local system, sign in with demonstration accounts, and validate it before a pilot. It is for local development only; never use the demonstration credentials or database in staging or production.

See [system-validation-matrix.md](system-validation-matrix.md) for the required evidence and current status of each system area.

## Prerequisites

1. Install and start Docker Desktop.
2. Install Node.js 22 LTS if you will run checks outside Docker.
3. Open PowerShell in the repository root:

```powershell
Set-Location 'C:\JVerse EduKonekta'
docker compose version
```

## Start the complete system

Run this for the normal first start and whenever source code, dependencies, Dockerfiles, or database migrations have changed. The web container intentionally uses the production Next.js server so interaction testing is responsive rather than slowed by development compilation:

```powershell
docker compose up -d --build
docker compose ps
```

Wait until all three services show `healthy`. The API applies Prisma migrations and seeds the local demonstration records during startup. Check service health directly:

```powershell
Invoke-WebRequest -UseBasicParsing http://localhost:3100/api/health | Select-Object -ExpandProperty Content
Invoke-WebRequest -UseBasicParsing http://localhost:4000/api/v1/health | Select-Object -ExpandProperty Content
```

Expected API response includes `"status":"ok"` and `"database":"up"`.

| Service                  | Local address                       |
| ------------------------ | ----------------------------------- |
| Web application          | http://localhost:3100               |
| API                      | http://localhost:4000/api/v1        |
| PostgreSQL (host access) | `localhost:5432`                    |
| Web health               | http://localhost:3100/api/health    |
| API health               | http://localhost:4000/api/v1/health |

Open http://localhost:3100/auth and sign in with a demo account below.

### If PostgreSQL port 5432 is already allocated

Another local database/container is using the host port. Identify it first:

```powershell
Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue |
  Select-Object LocalAddress, LocalPort, OwningProcess
docker ps --format 'table {{.Names}}\t{{.Ports}}'
```

Stop the conflicting development service if it is safe to do so, then run `docker compose up -d` again. Alternatively, change only the PostgreSQL host mapping in `docker-compose.yml` from `5432:5432` to `5433:5432`; the API container continues to use `postgres:5432` and needs no configuration change. Host tools would then connect to port `5433`.

### If a container exits or stays unhealthy

```powershell
docker compose logs --tail 100 api
docker compose logs --tail 100 web
docker compose logs --tail 100 postgres
docker compose restart api web
docker compose ps
```

Do not delete the database volume to solve an ordinary startup error.

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

- Login: http://localhost:3100/auth
- Role-based workspace: http://localhost:3100/workspace
- Assignments: http://localhost:3100/assignments
- Attendance: http://localhost:3100/attendance
- Parent dashboard: http://localhost:3100/dashboard/parent
- Communications and calendar: http://localhost:3100/communications
- School administration: http://localhost:3100/admin/structure
- Administration dashboard: http://localhost:3100/dashboard/admin
- Progress notes: http://localhost:3100/progress

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

When the local Docker web service is running on port 3100, point Playwright at it:

```powershell
$env:PLAYWRIGHT_BASE_URL = 'http://localhost:3100'
npm.cmd run test:e2e
Remove-Item Env:PLAYWRIGHT_BASE_URL
```

To enable database integration tests:

```powershell
$env:RUN_DB_TESTS = 'true'
npm.cmd test --workspace=@pinkora/api
Remove-Item Env:RUN_DB_TESTS
```

Playwright uses `http://localhost:3000` by default for CI. Set `PLAYWRIGHT_BASE_URL` as above for the local Docker service.

## Pilot restore verification

With the local containers running, execute the isolated restore exercise:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-test.ps1
```

It creates `edukonekta_restore_test`, restores a logical copy of the local database, checks that public tables exist, then drops only that test database. It refuses to overwrite an existing restore-test database.

## Deployment smoke test

After a deployment is healthy, run the privacy-safe smoke test against its public URLs. It verifies web/API health and confirms that an unauthenticated API request is rejected; it does not create or expose school records.

```powershell
powershell -ExecutionPolicy Bypass -File scripts/smoke-test.ps1 `
  -WebBaseUrl 'https://school.example.edu' `
  -ApiBaseUrl 'https://api.school.example.edu/api/v1'
```

For local Docker, omit both URL arguments.

## Docker logs and cleanup

Use `docker compose logs -f api`, `docker compose logs -f web`, or `docker compose logs -f postgres` to inspect logs. Stop services without deleting data with:

```powershell
docker compose down
```

To discard local PostgreSQL data and reseed from scratch, run `docker compose down -v` followed by `docker compose up -d --build`. This permanently removes local Docker volumes; use it only when the local data can be discarded.
