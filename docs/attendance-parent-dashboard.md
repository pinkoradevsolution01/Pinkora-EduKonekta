# Attendance and parent dashboard

Attendance is tenant scoped by `school_id` and uniquely identifies one `(school, class, student, date)` record. Supported states are `PRESENT`, `ABSENT`, `LATE`, and `EXCUSED`.

## Access rules

- Teachers can record and correct attendance only for classes assigned to them.
- School and platform administrators can review and correct attendance in their authorized tenant.
- Students can read only their own attendance records.
- Parents can read only attendance for approved `ParentStudentLink` children.
- Every correction creates an `AttendanceCorrection` history row and an audit-log entry.
- Absence events contain only approved linked parent user IDs as recipients.

## API routes

- `POST /api/v1/attendance/daily`
- `GET /api/v1/attendance?classId=...&attendanceDate=...`
- `PATCH /api/v1/attendance/:id`
- `GET /api/v1/attendance/:id/history`
- `GET /api/v1/attendance/me`
- `GET /api/v1/attendance/children`
- `GET /api/v1/dashboard/parent`

The parent dashboard aggregates linked children, recent parent-visible announcements, published assignment status, attendance totals, feedback summaries, and upcoming class or school events. Database aggregation remains tenant and relationship scoped; the frontend is not a security boundary.
