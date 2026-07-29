import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AnnouncementAudience, AnnouncementState, Prisma, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContext } from '../auth/auth.types';
import { AuditLogRepository } from '../database/repositories/audit-log.repository';
import {
  createEvent,
  EVENT_PUBLISHER,
  EventPublisher,
  NotificationEventType,
} from './notification-events';
import { sanitizeRichText, validateAttachment } from './content-security';
import { AnnouncementInput, CalendarEventInput } from './communications.schemas';

@Injectable()
export class CommunicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}
  private school(actor: AuthContext) {
    if (!actor.schoolId) throw new ForbiddenException('A school tenant is required');
    return actor.schoolId;
  }
  private async auditChange(
    action: string,
    actor: AuthContext,
    entityId: string,
    entityType = 'communications',
  ) {
    await this.prisma.auditLog.create({
      data: {
        schoolId: this.school(actor),
        actorUserId: actor.userId,
        action,
        entityType,
        entityId,
      },
    });
  }
  private async classIdsFor(actor: AuthContext, schoolId: string): Promise<string[]> {
    if (
      actor.roles.includes(RoleCode.SCHOOL_ADMIN) ||
      actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    )
      return (await this.prisma.class.findMany({ where: { schoolId }, select: { id: true } })).map(
        (item) => item.id,
      );
    if (actor.roles.includes(RoleCode.TEACHER))
      return (
        await this.prisma.class.findMany({
          where: { schoolId, assignments: { some: { teacher: { userId: actor.userId } } } },
          select: { id: true },
        })
      ).map((item) => item.id);
    if (actor.roles.includes(RoleCode.STUDENT))
      return (
        await this.prisma.enrollment.findMany({
          where: { schoolId, status: 'ACTIVE', student: { userId: actor.userId } },
          select: { classId: true },
        })
      ).map((item) => item.classId);
    if (actor.roles.includes(RoleCode.PARENT))
      return (
        await this.prisma.enrollment.findMany({
          where: {
            schoolId,
            status: 'ACTIVE',
            student: {
              parentLinks: { some: { parent: { userId: actor.userId }, status: 'APPROVED' } },
            },
          },
          select: { classId: true },
        })
      ).map((item) => item.classId);
    return [];
  }
  private audienceFor(actor: AuthContext): AnnouncementAudience | null {
    if (actor.roles.includes(RoleCode.TEACHER)) return 'TEACHERS';
    if (actor.roles.includes(RoleCode.PARENT)) return 'PARENTS';
    if (actor.roles.includes(RoleCode.STUDENT)) return 'STUDENTS';
    if (actor.roles.includes(RoleCode.GUIDANCE)) return 'GUIDANCE';
    return null;
  }
  private async visibleWhere(actor: AuthContext): Promise<Prisma.AnnouncementWhereInput> {
    const schoolId = this.school(actor);
    const classIds = await this.classIdsFor(actor, schoolId);
    const roleAudience = this.audienceFor(actor);
    const now = new Date();
    return {
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
                ...(roleAudience ? [{ audience: roleAudience }] : []),
                ...(classIds.length
                  ? [{ audience: 'CLASS' as const, classId: { in: classIds } }]
                  : []),
              ],
            },
          },
        },
      ],
    };
  }
  async createAnnouncement(actor: AuthContext, input: AnnouncementInput) {
    const schoolId = this.school(actor);
    const bodyHtml = sanitizeRichText(input.bodyHtml);
    const attachment = validateAttachment(input.attachment);
    if (input.expiresAt && input.publishAt && input.expiresAt <= input.publishAt)
      throw new BadRequestException('Expiration must follow publication');
    const classIds = [...new Set(input.classIds)];
    if (actor.roles.includes(RoleCode.TEACHER)) {
      if (input.audiences.some((item) => item !== 'CLASS') || !classIds.length)
        throw new ForbiddenException('Teachers may publish only to assigned classes');
      const allowed = await this.classIdsFor(actor, schoolId);
      if (classIds.some((id) => !allowed.includes(id)))
        throw new ForbiddenException('Class is not assigned to this teacher');
    }
    const classes = classIds.length
      ? await this.prisma.class.findMany({
          where: { schoolId, id: { in: classIds } },
          select: { id: true, schoolId: true },
        })
      : [];
    if (classes.length !== classIds.length)
      throw new ForbiddenException('Cross-school class target rejected');
    const state =
      input.publishAt && input.publishAt > new Date()
        ? AnnouncementState.SCHEDULED
        : AnnouncementState.DRAFT;
    const targets: Prisma.AnnouncementTargetCreateWithoutAnnouncementInput[] =
      input.audiences.flatMap((audience) =>
        audience === 'CLASS'
          ? classIds.map((classId) => ({ audience: audience as AnnouncementAudience, classId }))
          : [{ audience: audience as AnnouncementAudience }],
      );
    const item = await this.prisma.announcement.create({
      data: {
        schoolId,
        authorUserId: actor.userId,
        title: input.title,
        bodyHtml,
        state,
        publishAt: input.publishAt,
        expiresAt: input.expiresAt,
        attachmentName: attachment?.name,
        attachmentMime: attachment?.mime,
        attachmentSize: attachment?.size,
        attachmentUrl: attachment?.url,
        audiences: { create: targets },
      },
      include: { audiences: true },
    });
    await this.auditChange('ANNOUNCEMENT_DRAFT_CREATED', actor, item.id);
    return item;
  }
  async publish(actor: AuthContext, id: string) {
    const item = await this.prisma.announcement.findFirst({
      where: { id, schoolId: this.school(actor) },
      include: { audiences: true },
    });
    if (!item) throw new NotFoundException('Announcement not found');
    if (
      item.authorUserId !== actor.userId &&
      !actor.roles.includes(RoleCode.SCHOOL_ADMIN) &&
      !actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    )
      throw new ForbiddenException('Not allowed to publish this announcement');
    if (actor.roles.includes(RoleCode.TEACHER)) {
      const allowed = await this.classIdsFor(actor, item.schoolId);
      if (
        item.audiences.some(
          (target) =>
            target.audience !== 'CLASS' || !target.classId || !allowed.includes(target.classId),
        )
      )
        throw new ForbiddenException('Class target is not assigned to this teacher');
    }
    const now = new Date();
    const state =
      item.publishAt && item.publishAt > now
        ? AnnouncementState.SCHEDULED
        : AnnouncementState.PUBLISHED;
    const updated = await this.prisma.announcement.update({ where: { id }, data: { state } });
    await this.auditChange('ANNOUNCEMENT_PUBLISHED', actor, id);
    await this.publisher.publish(
      createEvent(NotificationEventType.ANNOUNCEMENT_PUBLISHED, id, item.schoolId, {
        audienceCount: item.audiences.length,
        state,
      }),
    );
    return updated;
  }
  async listAnnouncements(actor: AuthContext) {
    const items = await this.prisma.announcement.findMany({
      where: await this.visibleWhere(actor),
      include: {
        audiences: true,
        reads: { where: { userId: actor.userId } },
        acknowledgements: { where: { userId: actor.userId } },
      },
      orderBy: [{ publishAt: 'desc' }, { createdAt: 'desc' }],
    });
    return items.map((item) => ({
      ...item,
      visibilityState: item.expiresAt && item.expiresAt <= new Date() ? 'EXPIRED' : item.state,
      read: item.reads.length > 0,
      acknowledged: item.acknowledgements.length > 0,
    }));
  }
  private async visibleAnnouncement(actor: AuthContext, id: string) {
    const item = await this.prisma.announcement.findFirst({
      where: { id, ...(await this.visibleWhere(actor)) },
    });
    if (!item) throw new ForbiddenException('Announcement is not available to this user');
    return item;
  }
  async markRead(actor: AuthContext, id: string) {
    await this.visibleAnnouncement(actor, id);
    try {
      return await this.prisma.announcementRead.upsert({
        where: { announcementId_userId: { announcementId: id, userId: actor.userId } },
        update: {},
        create: { announcementId: id, userId: actor.userId },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Already read');
      throw error;
    }
  }
  async acknowledge(actor: AuthContext, id: string) {
    await this.visibleAnnouncement(actor, id);
    return this.prisma.announcementAcknowledgement.upsert({
      where: { announcementId_userId: { announcementId: id, userId: actor.userId } },
      update: {},
      create: { announcementId: id, userId: actor.userId },
    });
  }
  async createCalendarEvent(actor: AuthContext, input: CalendarEventInput) {
    const schoolId = this.school(actor);
    if (input.endsAt <= input.startsAt)
      throw new BadRequestException('Event end must follow start');
    if (input.classId) {
      const classroom = await this.prisma.class.findFirst({
        where: { id: input.classId, schoolId },
      });
      if (!classroom) throw new ForbiddenException('Cross-school class target rejected');
      if (
        actor.roles.includes(RoleCode.TEACHER) &&
        !(await this.classIdsFor(actor, schoolId)).includes(input.classId)
      )
        throw new ForbiddenException('Class is not assigned to this teacher');
    }
    const item = await this.prisma.calendarEvent.create({
      data: {
        schoolId,
        classId: input.classId,
        createdByUserId: actor.userId,
        title: input.title,
        description: input.description,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
      },
    });
    await this.auditChange('CALENDAR_EVENT_CREATED', actor, item.id);
    await this.publisher.publish(
      createEvent(NotificationEventType.CALENDAR_EVENT_CREATED, item.id, schoolId, {
        classId: item.classId,
      }),
    );
    return item;
  }
  async listCalendar(actor: AuthContext) {
    const schoolId = this.school(actor);
    const classIds = await this.classIdsFor(actor, schoolId);
    return this.prisma.calendarEvent.findMany({
      where: {
        schoolId,
        OR: [{ classId: null }, ...(classIds.length ? [{ classId: { in: classIds } }] : [])],
      },
      orderBy: { startsAt: 'asc' },
    });
  }
}
