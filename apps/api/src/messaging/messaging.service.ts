import {
  Inject,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationState, RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { sanitizeRichText, validateAttachment } from '../communications/content-security';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationInput, SendMessageInput } from './messaging.schemas';
import {
  createEvent,
  EVENT_PUBLISHER,
  EventPublisher,
} from '../communications/notification-events';
import { signAttachment, verifyAttachment } from '../assignments/assignments.events';
@Injectable()
export class MessagingService {
  private attempts = new Map<string, number[]>();
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}
  private school(a: AuthContext) {
    if (!a.schoolId) throw new ForbiddenException('A school tenant is required');
    return a.schoolId;
  }
  private rate(a: AuthContext) {
    const now = Date.now(),
      k = a.userId,
      v = (this.attempts.get(k) || []).filter((x) => x > now - 60000);
    if (v.length >= 20)
      throw new HttpException(
        'Too many messages. Try again shortly.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    v.push(now);
    this.attempts.set(k, v);
  }
  private async access(a: AuthContext, id: string, admin = false) {
    const c = await this.prisma.conversation.findFirst({
      where: { id, schoolId: this.school(a) },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { displayName: true } } },
        },
      },
    });
    if (!c) throw new NotFoundException('Conversation not found');
    const participant = c.parentUserId === a.userId || c.teacherUserId === a.userId;
    if (!participant) {
      if (
        !admin ||
        !a.roles.includes(RoleCode.SCHOOL_ADMIN) ||
        c.state !== ConversationState.ESCALATED
      )
        throw new ForbiddenException('Conversation access is restricted');
      await this.prisma.conversation.update({
        where: { id },
        data: { adminAccessedByUserId: a.userId, adminAccessedAt: new Date() },
      });
      await this.audit('CONVERSATION_ADMIN_ACCESSED', a, id);
    }
    if (participant)
      await this.prisma.message.updateMany({
        where: {
          conversationId: id,
          schoolId: this.school(a),
          authorUserId: { not: a.userId },
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    return c;
  }
  private async audit(action: string, a: AuthContext, id: string) {
    await this.prisma.auditLog.create({
      data: {
        schoolId: this.school(a),
        actorUserId: a.userId,
        action,
        entityType: 'messaging',
        entityId: id,
      },
    });
  }
  async list(a: AuthContext) {
    const schoolId = this.school(a);
    return this.prisma.conversation.findMany({
      where: { schoolId, OR: [{ parentUserId: a.userId }, { teacherUserId: a.userId }] },
      include: {
        student: { include: { user: { select: { displayName: true } } } },
        parent: { select: { displayName: true } },
        teacher: { select: { displayName: true } },
        messages: {
          take: 100,
          orderBy: { createdAt: 'asc' },
          include: { author: { select: { displayName: true } } },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
  async create(a: AuthContext, i: CreateConversationInput) {
    this.rate(a);
    const schoolId = this.school(a);
    const link = await this.prisma.parentStudentLink.findFirst({
      where: { schoolId, studentId: i.studentId, status: 'APPROVED', parent: { userId: a.userId } },
    });
    const assignment = await this.prisma.teacherAssignment.findFirst({
      where: {
        schoolId,
        teacher: { userId: i.teacherUserId },
        class: { enrollments: { some: { studentId: i.studentId, status: 'ACTIVE' } } },
      },
    });
    if (!link || !assignment)
      throw new ForbiddenException(
        'Parent and teacher are not connected through an authorized student context',
      );
    const attachment = i.attachment && validateAttachment(i.attachment);
    const c = await this.prisma.conversation.create({
      data: {
        schoolId,
        studentId: i.studentId,
        parentUserId: a.userId,
        teacherUserId: i.teacherUserId,
        messages: {
          create: {
            schoolId,
            authorUserId: a.userId,
            content: sanitizeRichText(i.initialMessage),
            attachmentName: attachment?.name,
            attachmentMime: attachment?.mime,
            attachmentSize: attachment?.size,
            attachmentStorageKey: attachment?.storageKey,
          },
        },
      },
    });
    await this.audit('CONVERSATION_CREATED', a, c.id);
    return c;
  }
  async detail(a: AuthContext, id: string) {
    return this.access(a, id, true);
  }
  async send(a: AuthContext, id: string, i: SendMessageInput) {
    this.rate(a);
    const c = await this.access(a, id);
    if (c.state === ConversationState.ARCHIVED)
      throw new ForbiddenException('Conversation is archived');
    const attachment = i.attachment && validateAttachment(i.attachment);
    const m = await this.prisma.message.create({
      data: {
        schoolId: this.school(a),
        conversationId: id,
        authorUserId: a.userId,
        content: sanitizeRichText(i.content),
        attachmentName: attachment?.name,
        attachmentMime: attachment?.mime,
        attachmentSize: attachment?.size,
        attachmentStorageKey: attachment?.storageKey,
      },
    });
    await this.audit('MESSAGE_SENT', a, m.id);
    await this.publisher.publish(
      createEvent('messaging.message.sent', m.id, this.school(a), {
        conversationId: id,
        preview: 'New secure message',
      }),
    );
    return {
      ...m,
      notificationPreview:
        process.env.MESSAGE_NOTIFICATION_PREVIEW === 'metadata'
          ? 'New message from your school contact'
          : 'New secure message',
    };
  }
  async archive(a: AuthContext, id: string) {
    await this.access(a, id);
    const c = await this.prisma.conversation.update({
      where: { id },
      data: { state: ConversationState.ARCHIVED },
    });
    await this.audit('CONVERSATION_ARCHIVED', a, id);
    return c;
  }
  async escalate(a: AuthContext, id: string, reason: string) {
    await this.access(a, id);
    const c = await this.prisma.conversation.update({
      where: { id },
      data: {
        state: ConversationState.ESCALATED,
        escalationReason: reason,
        escalatedByUserId: a.userId,
      },
    });
    await this.audit('CONVERSATION_ESCALATED', a, id);
    return c;
  }
  async read(a: AuthContext, id: string) {
    await this.access(a, id);
    const updated = await this.prisma.message.updateMany({
      where: {
        schoolId: this.school(a),
        conversationId: id,
        authorUserId: { not: a.userId },
        readAt: null,
      },
      data: { readAt: new Date() },
    });
    await this.audit('CONVERSATION_READ', a, id);
    return { read: updated.count };
  }
  async report(a: AuthContext, id: string, reason: string) {
    const item = await this.escalate(a, id, reason);
    await this.audit('MESSAGE_REPORTED', a, id);
    return item;
  }
  async signedAttachment(a: AuthContext, messageId: string) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, schoolId: this.school(a) },
    });
    if (!message?.attachmentStorageKey) throw new NotFoundException('Attachment not found');
    await this.access(a, message.conversationId, true);
    const expiresAt = new Date(Date.now() + 60_000);
    return {
      url: `/api/v1/messaging/messages/${messageId}/attachment?token=${signAttachment('message', messageId, this.school(a), expiresAt)}`,
      expiresAt: expiresAt.toISOString(),
    };
  }
  async attachment(a: AuthContext, messageId: string, token?: string) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, schoolId: this.school(a) },
    });
    if (
      !message?.attachmentStorageKey ||
      !token ||
      !verifyAttachment(token, 'message', messageId, this.school(a))
    )
      throw new ForbiddenException('Attachment link is invalid or expired');
    await this.access(a, message.conversationId, true);
    return {
      name: message.attachmentName,
      mime: message.attachmentMime,
      size: message.attachmentSize,
      storageKey: message.attachmentStorageKey,
    };
  }
}
