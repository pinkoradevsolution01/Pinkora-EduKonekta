import { Inject, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { NotificationStatus } from '@prisma/client';
import { DomainEvent } from '../communications/notification-events';
import { PrismaService } from '../prisma/prisma.service';
import {
  EMAIL_ADAPTER,
  EmailAdapter,
  NOTIFICATION_METRICS,
  NotificationMetrics,
} from './notification.types';
import { safeTemplate } from './notification.templates';

const MAX_ATTEMPTS = 3;

/** Queue worker. It resolves recipients from current authorizations, never event text. */
@Injectable()
export class NotificationWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationWorkerService.name);
  private timer?: NodeJS.Timeout;
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_ADAPTER) private readonly email: EmailAdapter,
    @Inject(NOTIFICATION_METRICS) private readonly metrics: NotificationMetrics,
  ) {}
  onModuleInit() {
    if (process.env.NOTIFICATION_QUEUE_ENABLED === 'false') return;
    void this.runScheduled();
    this.timer = setInterval(() => void this.runScheduled(), 60_000);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  private async runScheduled() {
    try {
      const now = new Date();
      await this.publishScheduledAnnouncements(now);
      await this.enqueueAssignmentDueReminders(now);
      await this.enqueueDueGuidanceFollowUps(now);
      await this.enqueueCalendarReminders(now);
      await this.process();
    } catch (error) {
      this.logger.error(
        `Notification queue cycle failed: ${error instanceof Error ? error.name : 'UnknownError'}`,
      );
    }
  }
  async enqueueEvent(event: DomainEvent) {
    const recipients = await this.recipients(event);
    await Promise.all(
      [...new Set(recipients)].map((recipientUserId) =>
        this.prisma.notificationJob.upsert({
          where: { idempotencyKey: `${event.id}:${recipientUserId}` },
          update: {},
          create: {
            schoolId: event.schoolId,
            recipientUserId,
            eventType: event.type,
            payload: { eventId: event.id },
            idempotencyKey: `${event.id}:${recipientUserId}`,
          },
        }),
      ),
    );
    this.metrics.increment('notifications.events_enqueued', { eventType: event.type });
  }
  private async recipients(event: DomainEvent): Promise<string[]> {
    const payload = (event.payload ?? {}) as Record<string, unknown>;
    // Event producers must supply recipients unless this method can verify the relationship below.
    if (Array.isArray(payload.recipientUserIds))
      return payload.recipientUserIds.filter((id): id is string => typeof id === 'string');
    if (event.type === 'messaging.message.sent') {
      const item = await this.prisma.conversation.findFirst({
        where: { id: event.aggregateId, schoolId: event.schoolId },
        select: { parentUserId: true, teacherUserId: true },
      });
      return item ? [item.parentUserId, item.teacherUserId] : [];
    }
    if (event.type === 'safety.report.status.updated') {
      const item = await this.prisma.safetyReport.findFirst({
        where: { id: event.aggregateId, schoolId: event.schoolId },
        select: { reporterUserId: true },
      });
      return item ? [item.reporterUserId] : [];
    }
    if (event.type === 'guidance.follow_up.due')
      return (
        await this.prisma.guidanceCaseAssignment.findMany({
          where: { schoolId: event.schoolId, caseId: event.aggregateId },
          select: { userId: true },
        })
      ).map((x) => x.userId);
    if (event.type === 'evaluation.updated') {
      const evaluation = await this.prisma.evaluationNote.findFirst({
        where: { id: event.aggregateId, schoolId: event.schoolId },
        select: { studentId: true, visibility: true },
      });
      if (!evaluation || evaluation.visibility !== 'PARENT_VISIBLE') return [];
      const links = await this.prisma.parentStudentLink.findMany({
        where: { schoolId: event.schoolId, studentId: evaluation.studentId, status: 'APPROVED' },
        include: { parent: { select: { userId: true } } },
      });
      return links.map((x) => x.parent.userId);
    }
    if (event.type.startsWith('assignment.')) {
      const item = await this.prisma.assignment.findFirst({
        where: { id: event.aggregateId, schoolId: event.schoolId },
        include: {
          class: {
            include: {
              enrollments: {
                where: { status: 'ACTIVE' },
                include: {
                  student: {
                    include: {
                      parentLinks: {
                        where: { status: 'APPROVED' },
                        include: { parent: { select: { userId: true } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      return item
        ? item.class.enrollments.flatMap((entry) => [
            entry.student.userId,
            ...entry.student.parentLinks.map((link) => link.parent.userId),
          ])
        : [];
    }
    if (event.type === 'announcement.published') {
      const item = await this.prisma.announcement.findFirst({
        where: { id: event.aggregateId, schoolId: event.schoolId },
        include: { audiences: true },
      });
      if (!item) return [];
      const members = await this.prisma.schoolMembership.findMany({
        where: { schoolId: event.schoolId, isActive: true },
        include: { role: { select: { code: true } } },
      });
      const roles: Record<string, string> = {
        TEACHERS: 'TEACHER',
        PARENTS: 'PARENT',
        STUDENTS: 'STUDENT',
        GUIDANCE: 'GUIDANCE',
      };
      const selected = new Set<string>();
      for (const audience of item.audiences) {
        if (audience.audience === 'SCHOOL')
          members.forEach((member) => selected.add(member.userId));
        else if (roles[audience.audience])
          members
            .filter((member) => member.role.code === roles[audience.audience])
            .forEach((member) => selected.add(member.userId));
        else if (audience.audience === 'CLASS' && audience.classId) {
          const enrollments = await this.prisma.enrollment.findMany({
            where: { schoolId: event.schoolId, classId: audience.classId, status: 'ACTIVE' },
            include: {
              student: {
                include: {
                  parentLinks: {
                    where: { status: 'APPROVED' },
                    include: { parent: { select: { userId: true } } },
                  },
                },
              },
            },
          });
          enrollments.forEach((entry) => {
            selected.add(entry.student.userId);
            entry.student.parentLinks.forEach((link) => selected.add(link.parent.userId));
          });
        }
      }
      return [...selected];
    }
    if (event.type === 'calendar.event.created' || event.type === 'calendar.event.reminder.due')
      return this.calendarRecipients(event.schoolId, event.aggregateId);
    return [];
  }
  private async calendarRecipients(schoolId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findFirst({
      where: { id: eventId, schoolId },
      select: { classId: true },
    });
    if (!event) return [];
    if (!event.classId)
      return (
        await this.prisma.schoolMembership.findMany({
          where: { schoolId, isActive: true },
          select: { userId: true },
        })
      ).map((x) => x.userId);
    const [enrollments, teachers] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { schoolId, classId: event.classId, status: 'ACTIVE' },
        include: {
          student: {
            include: {
              parentLinks: {
                where: { status: 'APPROVED' },
                include: { parent: { select: { userId: true } } },
              },
            },
          },
        },
      }),
      this.prisma.teacherAssignment.findMany({
        where: { schoolId, classId: event.classId },
        select: { teacher: { select: { userId: true } } },
      }),
    ]);
    return [
      ...new Set([
        ...enrollments.flatMap((entry) => [
          entry.student.userId,
          ...entry.student.parentLinks.map((link) => link.parent.userId),
        ]),
        ...teachers.map((entry) => entry.teacher.userId),
      ]),
    ];
  }
  async process(limit = 50) {
    const jobs = await this.prisma.notificationJob.findMany({
      where: { status: NotificationStatus.PENDING, availableAt: { lte: new Date() } },
      take: limit,
      orderBy: { createdAt: 'asc' },
    });
    let delivered = 0,
      retried = 0;
    for (const job of jobs)
      try {
        const authorized = await this.prisma.schoolMembership.findFirst({
          where: { schoolId: job.schoolId, userId: job.recipientUserId, isActive: true },
          select: { id: true },
        });
        if (!authorized) {
          await this.done(job.id, job.attempts + 1);
          continue;
        }
        const preference = await this.prisma.notificationPreference.findUnique({
          where: {
            schoolId_userId_eventType: {
              schoolId: job.schoolId,
              userId: job.recipientUserId,
              eventType: job.eventType,
            },
          },
        });
        const message = safeTemplate(job.eventType);
        if (preference?.inAppEnabled !== false)
          await this.prisma.notification.upsert({
            where: { idempotencyKey: `${job.idempotencyKey}:IN_APP` },
            update: {},
            create: {
              schoolId: job.schoolId,
              userId: job.recipientUserId,
              eventType: job.eventType,
              title: message.title,
              body: message.body,
              link: message.link,
              idempotencyKey: `${job.idempotencyKey}:IN_APP`,
            },
          });
        if (preference?.emailEnabled !== false) {
          const user = await this.prisma.user.findUnique({
            where: { id: job.recipientUserId },
            select: { email: true, emailVerifiedAt: true, status: true },
          });
          if (user?.emailVerifiedAt && user.status === 'ACTIVE')
            await this.email.send({
              to: user.email,
              subject: message.title,
              text: message.body,
              idempotencyKey: `${job.idempotencyKey}:EMAIL`,
            });
        }
        await this.done(job.id, job.attempts + 1);
        delivered++;
        this.metrics.increment('notifications.delivered', { eventType: job.eventType });
      } catch (error) {
        const attempts = job.attempts + 1;
        await this.prisma.notificationJob.update({
          where: { id: job.id },
          data: {
            attempts,
            lastError: error instanceof Error ? error.message : 'Delivery failed',
            status:
              attempts >= MAX_ATTEMPTS ? NotificationStatus.FAILED : NotificationStatus.PENDING,
            availableAt: new Date(Date.now() + Math.min(3600_000, 60_000 * 2 ** (attempts - 1))),
          },
        });
        retried++;
        this.metrics.increment('notifications.delivery_failed', { eventType: job.eventType });
      }
    const failed = await this.prisma.notificationJob.count({
      where: { status: NotificationStatus.FAILED },
    });
    this.metrics.gauge('notifications.failed_jobs', failed);
    return { processed: jobs.length, delivered, retried, failed };
  }
  /** Scheduled daily by the queue runner; a day-scoped key prevents reminder spam. */
  async enqueueDueGuidanceFollowUps(now = new Date()) {
    const cases = await this.prisma.guidanceCase.findMany({
      where: { followUpAt: { lte: now }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      include: { assignments: { select: { userId: true } } },
    });
    const day = now.toISOString().slice(0, 10);
    await Promise.all(
      cases.flatMap((item) =>
        item.assignments.map((assignment) =>
          this.prisma.notificationJob.upsert({
            where: { idempotencyKey: `guidance-follow-up:${item.id}:${assignment.userId}:${day}` },
            update: {},
            create: {
              schoolId: item.schoolId,
              recipientUserId: assignment.userId,
              eventType: 'guidance.follow_up.due',
              payload: { caseId: item.id },
              idempotencyKey: `guidance-follow-up:${item.id}:${assignment.userId}:${day}`,
            },
          }),
        ),
      ),
    );
    return { queuedCases: cases.length };
  }
  /** Queue-runner entrypoint for the 24-hour calendar reminder window. */
  async enqueueCalendarReminders(now = new Date(), leadHours = 24) {
    const events = await this.prisma.calendarEvent.findMany({
      where: { startsAt: { gt: now, lte: new Date(now.getTime() + leadHours * 3600_000) } },
      select: { id: true, schoolId: true },
    });
    const day = now.toISOString().slice(0, 10);
    let queued = 0;
    for (const event of events)
      for (const userId of await this.calendarRecipients(event.schoolId, event.id)) {
        await this.prisma.notificationJob.upsert({
          where: { idempotencyKey: `calendar-reminder:${event.id}:${userId}:${day}` },
          update: {},
          create: {
            schoolId: event.schoolId,
            recipientUserId: userId,
            eventType: 'calendar.event.reminder.due',
            payload: { eventId: event.id },
            idempotencyKey: `calendar-reminder:${event.id}:${userId}:${day}`,
          },
        });
        queued++;
      }
    return { queued };
  }
  /** Publishes due scheduled announcements once, then uses the ordinary recipient resolver. */
  async publishScheduledAnnouncements(now = new Date()) {
    const scheduled = await this.prisma.announcement.findMany({
      where: { state: 'SCHEDULED', publishAt: { lte: now } },
      select: { id: true, schoolId: true },
      take: 100,
    });
    let published = 0;
    for (const item of scheduled) {
      const result = await this.prisma.announcement.updateMany({
        where: { id: item.id, schoolId: item.schoolId, state: 'SCHEDULED' },
        data: { state: 'PUBLISHED' },
      });
      if (!result.count) continue;
      await this.prisma.auditLog.create({
        data: {
          schoolId: item.schoolId,
          action: 'ANNOUNCEMENT_SCHEDULED_PUBLISHED',
          entityType: 'communications',
          entityId: item.id,
        },
      });
      await this.enqueueEvent({
        id: `scheduled-announcement:${item.id}`,
        type: 'announcement.published',
        version: 1,
        occurredAt: now.toISOString(),
        aggregateId: item.id,
        schoolId: item.schoolId,
        payload: {},
      });
      published++;
    }
    return { published };
  }
  /** Queue-runner entrypoint for the 24-hour assignment reminder window. */
  async enqueueAssignmentDueReminders(now = new Date(), leadHours = 24) {
    const assignments = await this.prisma.assignment.findMany({
      where: {
        state: 'PUBLISHED',
        dueAt: { gt: now, lte: new Date(now.getTime() + leadHours * 3600_000) },
      },
      select: { id: true, schoolId: true },
    });
    const day = now.toISOString().slice(0, 10);
    let queued = 0;
    for (const assignment of assignments) {
      const recipients = await this.recipients({
        id: `assignment-due:${assignment.id}:${day}`,
        type: 'assignment.due_soon',
        version: 1,
        occurredAt: now.toISOString(),
        aggregateId: assignment.id,
        schoolId: assignment.schoolId,
        payload: {},
      });
      for (const recipientUserId of new Set(recipients)) {
        await this.prisma.notificationJob.upsert({
          where: {
            idempotencyKey: `assignment-due:${assignment.id}:${recipientUserId}:${day}`,
          },
          update: {},
          create: {
            schoolId: assignment.schoolId,
            recipientUserId,
            eventType: 'assignment.due_soon',
            payload: { assignmentId: assignment.id },
            idempotencyKey: `assignment-due:${assignment.id}:${recipientUserId}:${day}`,
          },
        });
        queued++;
      }
    }
    return { queued };
  }
  private done(id: string, attempts: number) {
    return this.prisma.notificationJob.update({
      where: { id },
      data: { status: NotificationStatus.DELIVERED, attempts, lastError: null },
    });
  }
  async monitoring() {
    const [pending, delivered, failed] = await Promise.all([
      this.prisma.notificationJob.count({ where: { status: NotificationStatus.PENDING } }),
      this.prisma.notificationJob.count({ where: { status: NotificationStatus.DELIVERED } }),
      this.prisma.notificationJob.count({ where: { status: NotificationStatus.FAILED } }),
    ]);
    return { pending, delivered, failed, maxAttempts: MAX_ATTEMPTS };
  }
}
