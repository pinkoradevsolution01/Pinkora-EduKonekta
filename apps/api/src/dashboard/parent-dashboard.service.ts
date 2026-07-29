import { ForbiddenException, Injectable } from '@nestjs/common';
import { AnnouncementState, AssignmentState, RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async parent(actor: AuthContext) {
    if (!actor.schoolId || !actor.roles.includes(RoleCode.PARENT))
      throw new ForbiddenException('Parent dashboard access is required');
    const schoolId = actor.schoolId;
    const parent = await this.prisma.parentProfile.findFirst({
      where: { schoolId, userId: actor.userId },
    });
    if (!parent) throw new ForbiddenException('Parent profile not found');
    const links = await this.prisma.parentStudentLink.findMany({
      where: { schoolId, parentId: parent.id, status: 'APPROVED' },
      include: {
        student: {
          select: {
            id: true,
            studentNumber: true,
            user: { select: { id: true, displayName: true } },
          },
        },
      },
    });
    const studentIds = links.map((link) => link.studentId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { schoolId, studentId: { in: studentIds }, status: 'ACTIVE' },
      select: { studentId: true, classId: true },
    });
    const classIds = [...new Set(enrollments.map((item) => item.classId))];
    const now = new Date();
    const [announcements, assignments, attendance, feedback, events] = await Promise.all([
      this.prisma.announcement.findMany({
        where: {
          schoolId,
          state: { in: [AnnouncementState.PUBLISHED, AnnouncementState.SCHEDULED] },
          OR: [{ publishAt: null }, { publishAt: { lte: now } }],
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            {
              audiences: {
                some: {
                  OR: [
                    { audience: 'SCHOOL' },
                    { audience: 'PARENTS' },
                    ...(classIds.length
                      ? [{ audience: 'CLASS' as const, classId: { in: classIds } }]
                      : []),
                  ],
                },
              },
            },
          ],
        },
        orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
        take: 5,
      }),
      this.prisma.assignment.findMany({
        where: { schoolId, classId: { in: classIds }, state: AssignmentState.PUBLISHED },
        include: {
          class: true,
          subject: true,
          submissions: { where: { studentId: { in: studentIds } } },
        },
        orderBy: { dueAt: 'asc' },
        take: 50,
      }),
      this.prisma.attendanceRecord.findMany({
        where: { schoolId, studentId: { in: studentIds } },
        orderBy: { attendanceDate: 'desc' },
        take: 500,
      }),
      this.prisma.submission.findMany({
        where: { schoolId, studentId: { in: studentIds }, feedback: { not: null } },
        include: { assignment: { select: { id: true, title: true } } },
        orderBy: { feedbackAt: 'desc' },
        take: 10,
      }),
      this.prisma.calendarEvent.findMany({
        where: {
          schoolId,
          startsAt: { gte: now },
          OR: [{ classId: null }, ...(classIds.length ? [{ classId: { in: classIds } }] : [])],
        },
        orderBy: { startsAt: 'asc' },
        take: 5,
      }),
    ]);
    const children = links.map((link) => {
      const childAttendance = attendance.filter((record) => record.studentId === link.studentId);
      const childAssignments = assignments.filter(
        (assignment) =>
          assignment.submissions.some((submission) => submission.studentId === link.studentId) ||
          enrollments.some(
            (enrollment) =>
              enrollment.studentId === link.studentId && enrollment.classId === assignment.classId,
          ),
      );
      const submitted = childAssignments.filter((assignment) =>
        assignment.submissions.some((submission) => submission.studentId === link.studentId),
      );
      const late = submitted.filter((assignment) => {
        const submission = assignment.submissions.find((item) => item.studentId === link.studentId);
        return submission ? submission.submittedAt > assignment.dueAt : false;
      });
      const childFeedback = feedback.filter((item) => item.studentId === link.studentId);
      return {
        student: link.student,
        attendanceSummary: this.summarize(childAttendance),
        assignmentStatus: {
          total: childAssignments.length,
          submitted: submitted.length,
          pending: childAssignments.length - submitted.length,
          late: late.length,
        },
        feedbackSummary: { count: childFeedback.length, recent: childFeedback.slice(0, 3) },
      };
    });
    return {
      children,
      recentAnnouncements: announcements,
      upcomingEvents: events,
      assignmentStatus: this.assignmentSummary(assignments),
      attendanceSummary: this.summarize(attendance),
      feedbackSummary: { count: feedback.length, recent: feedback.slice(0, 5) },
    };
  }

  private summarize(records: Array<{ state: string }>) {
    return records.reduce(
      (summary, record) => {
        const key = record.state.toLowerCase() as keyof typeof summary;
        summary[key] += 1;
        return summary;
      },
      { present: 0, absent: 0, late: 0, excused: 0 },
    );
  }
  private assignmentSummary(
    assignments: Array<{ dueAt: Date; submissions: Array<{ submittedAt: Date }> }>,
  ) {
    const submitted = assignments.filter((item) => item.submissions.length);
    return {
      total: assignments.length,
      submitted: submitted.length,
      pending: assignments.length - submitted.length,
      late: submitted.filter((item) => {
        const submission = item.submissions[0];
        return submission ? submission.submittedAt > item.dueAt : false;
      }).length,
    };
  }
}
