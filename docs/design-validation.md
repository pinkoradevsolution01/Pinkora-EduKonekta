# Design validation and traceability

## Screen user stories

| Screen                  | User story                                                                                                            | Primary control                                                  |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Home                    | As a visitor, I can understand the service and proceed to sign in.                                                    | No school data is displayed.                                     |
| Sign in                 | As an invited user, I can securely start or recover an account session.                                               | Invitation-only accounts, rate limiting, HttpOnly sessions.      |
| Workspace               | As a signed-in user, I can reach tasks for my role.                                                                   | Server-side role and tenant checks remain authoritative.         |
| School structure        | As a school administrator, I can maintain years, classes, subjects, profiles, enrollments, and approved family links. | Administrator role and tenant-scoped writes.                     |
| Assignments             | As a teacher, student, or parent, I can manage or view only relevant assignment work.                                 | Teacher assignment, enrollment, and approved parent-link checks. |
| Attendance              | As authorized staff, a student, or a parent, I can record or view the relevant attendance records.                    | Assigned-class, own-student, or linked-child rules.              |
| Communications          | As an authorized school user, I can publish or view announcements and calendars for my audience.                      | Audience, publication-state, class, and tenant filters.          |
| Parent dashboard        | As a parent, I can see a summary only for approved linked children.                                                   | Approved `ParentStudentLink` predicate.                          |
| Administrator dashboard | As a school administrator, I can view de-identified operational totals and reports.                                   | Administrator role, school scope, export permission.             |
| Progress                | As a teacher, parent, or student, I can create or view appropriately visible evaluations.                             | Assigned-class and `PARENT_VISIBLE` rules.                       |
| Messages                | As a linked parent or assigned teacher, I can communicate within an authorized conversation.                          | Parent-link and teacher-assignment checks.                       |
| Safety report           | As a verified school user, I can submit and track my own confidential report.                                         | Reporter ownership, encrypted protected content.                 |
| Safety intake           | As explicitly authorized guidance staff, I can review confidential reports.                                           | Active `SafeguardingAccess` requirement.                         |
| Guidance cases          | As an assigned guidance user, I can manage only cases assigned to me.                                                 | Case assignment plus safeguarding authorization.                 |

All application screens use responsive utility classes, mobile navigation, fluid layout widths, and semantic form/table controls. The web production build validates these routes for mobile-browser delivery; manual device testing remains part of each release test run.

## Data-entity purposes

| Entity group                                                                                   | Purpose                                                                                       |
| ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| School, Role, SchoolMembership, FeatureFlag, AuditLog                                          | Tenant boundary, role assignment, feature control, and accountability.                        |
| User, AuthSession, AuthToken, Invitation                                                       | Identity, secure sessions, verification/recovery, and invitation-only activation.             |
| SchoolYear, Class, Subject, StudentProfile, TeacherProfile, ParentProfile                      | School structure and role-specific profile data.                                              |
| Enrollment, TeacherAssignment, ParentStudentLink                                               | Authoritative student/class/teacher/family relationships used for record-level authorization. |
| Announcement, AnnouncementTarget, AnnouncementRead, AnnouncementAcknowledgement, CalendarEvent | Targeted school communication, reach, acknowledgement, and schedule data.                     |
| Assignment, Submission                                                                         | Learning work, due dates, completion, feedback, and permitted attachments.                    |
| AttendanceRecord, AttendanceCorrection                                                         | Daily attendance and immutable correction history.                                            |
| EvaluationNote, EvaluationAcknowledgement, EvaluationHistory                                   | Student evaluation entries, permitted family acknowledgement, and edit accountability.        |
| Conversation, Message                                                                          | Authorized parent-teacher communication and read state.                                       |
| SafetyReport, SafetyReportUpdate, SafeguardingAccess                                           | Encrypted confidential reporting, safe reporter updates, and explicit privileged access.      |
| GuidanceCase, GuidanceCaseAssignment, GuidanceCaseNote                                         | Restricted guidance workflow, case assignment, and encrypted notes.                           |
| NotificationPreference, Notification, NotificationJob                                          | User channel choices, in-app delivery, queued/retryable notification processing.              |

## Acceptance evidence

| Criterion                                                  | Result | Evidence                                                                                                       |
| ---------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Parent access is limited to linked children                | Pass   | Parent dashboard, attendance, assignment, and evaluation queries require an approved parent-student link.      |
| Teachers access only assigned classes/students             | Pass   | Attendance, assignment, and evaluation services verify teacher assignments and active enrollment.              |
| Guidance personnel access only authorized cases            | Pass   | Guidance cases require active safeguarding access and explicit case assignment; elevated status gates exports. |
| Tenant boundaries prevent cross-school access              | Pass   | Tenant guard, school-scoped Prisma predicates, authorization-matrix tests, and report isolation tests.         |
| Sensitive reports are excluded from ordinary notifications | Pass   | Confidential templates are generic; notification tests assert sensitive details are excluded.                  |
| Mobile browsers are supported                              | Pass   | Responsive layouts, mobile navigation, PWA configuration, and successful production web build.                 |
