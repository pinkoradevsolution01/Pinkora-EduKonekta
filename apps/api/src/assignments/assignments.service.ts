import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AssignmentState, Prisma, RoleCode } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthContext } from '../auth/auth.types';
import { AuditLogRepository } from '../database/repositories/audit-log.repository';
import { validateAttachment } from '../communications/content-security';
import { EVENT_PUBLISHER, EventPublisher } from '../communications/notification-events';
import {
  AssignmentEventType,
  publishAssignmentEvent,
  signAttachment,
  verifyAttachment,
} from './assignments.events';
import {
  AssignmentInput,
  AttachmentUploadInput,
  FeedbackInput,
  SubmissionInput,
} from './assignments.schemas';
import { ASSIGNMENT_FILE_STORE, AssignmentFileStore } from './assignment-file-store';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
    @Inject(ASSIGNMENT_FILE_STORE) private readonly files: AssignmentFileStore,
  ) {}

  private school(actor: AuthContext) {
    if (!actor.schoolId) throw new ForbiddenException('A school tenant is required');
    return actor.schoolId;
  }

  private async auditChange(
    action: string,
    actor: AuthContext,
    entityId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: {
        schoolId: this.school(actor),
        actorUserId: actor.userId,
        action,
        entityType: 'assignments',
        entityId,
        metadata,
      },
    });
  }

  private async assigned(actor: AuthContext, schoolId: string, classId: string, subjectId: string) {
    return this.prisma.teacherAssignment.findFirst({
      where: { schoolId, classId, subjectId, teacher: { userId: actor.userId } },
    });
  }

  private async canManage(
    actor: AuthContext,
    item: { schoolId: string; classId: string; subjectId: string; createdByUserId: string },
  ) {
    if (item.schoolId !== this.school(actor))
      throw new ForbiddenException('Cross-school access is forbidden');
    if (
      actor.roles.includes(RoleCode.SCHOOL_ADMIN) ||
      actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    )
      return;
    if (
      !actor.roles.includes(RoleCode.TEACHER) ||
      item.createdByUserId !== actor.userId ||
      !(await this.assigned(actor, item.schoolId, item.classId, item.subjectId))
    )
      throw new ForbiddenException('Assignment is not managed by this teacher');
  }

  private async assertAssignmentReferences(actor: AuthContext, input: AssignmentInput) {
    const schoolId = this.school(actor);
    const [classroom, subject] = await Promise.all([
      this.prisma.class.findFirst({ where: { id: input.classId, schoolId } }),
      this.prisma.subject.findFirst({ where: { id: input.subjectId, schoolId } }),
    ]);
    if (!classroom || !subject) throw new ForbiddenException('Cross-school identifier rejected');
    const teacherAssignment = await this.prisma.teacherAssignment.findFirst({
      where: { schoolId, classId: input.classId, subjectId: input.subjectId },
    });
    if (!teacherAssignment)
      throw new BadRequestException('Class and subject are not assigned to a teacher');
    if (
      actor.roles.includes(RoleCode.TEACHER) &&
      !(await this.assigned(actor, schoolId, input.classId, input.subjectId))
    )
      throw new ForbiddenException('Class and subject are not assigned to this teacher');
    return schoolId;
  }

  async create(actor: AuthContext, input: AssignmentInput) {
    const schoolId = await this.assertAssignmentReferences(actor, input);
    const item = await this.prisma.assignment.create({
      data: {
        schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        createdByUserId: actor.userId,
        title: input.title,
        instructions: input.instructions,
        dueAt: input.dueAt,
      },
    });
    await this.auditChange('ASSIGNMENT_CREATED', actor, item.id);
    await publishAssignmentEvent(this.publisher, AssignmentEventType.CREATED, item.id, schoolId, {
      dueAt: item.dueAt.toISOString(),
    });
    return item;
  }

  async update(actor: AuthContext, id: string, input: AssignmentInput) {
    const item = await this.prisma.assignment.findFirst({
      where: { id, schoolId: this.school(actor) },
    });
    if (!item) throw new NotFoundException('Assignment not found');
    await this.canManage(actor, item);
    const schoolId = await this.assertAssignmentReferences(actor, input);
    const updated = await this.prisma.assignment.update({
      where: { id },
      data: {
        schoolId,
        classId: input.classId,
        subjectId: input.subjectId,
        title: input.title,
        instructions: input.instructions,
        dueAt: input.dueAt,
      },
    });
    await this.auditChange('ASSIGNMENT_UPDATED', actor, id);
    return updated;
  }

  async changeState(actor: AuthContext, id: string, state: AssignmentState) {
    const item = await this.prisma.assignment.findFirst({
      where: { id, schoolId: this.school(actor) },
    });
    if (!item) throw new NotFoundException('Assignment not found');
    await this.canManage(actor, item);
    const updated = await this.prisma.assignment.update({ where: { id }, data: { state } });
    await this.auditChange(`ASSIGNMENT_${state}`, actor, id);
    if (state === AssignmentState.PUBLISHED)
      await publishAssignmentEvent(
        this.publisher,
        AssignmentEventType.PUBLISHED,
        id,
        item.schoolId,
        { dueAt: item.dueAt.toISOString() },
      );
    return updated;
  }

  private async classIdsFor(actor: AuthContext, schoolId: string) {
    if (
      actor.roles.includes(RoleCode.SCHOOL_ADMIN) ||
      actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    )
      return (await this.prisma.class.findMany({ where: { schoolId }, select: { id: true } })).map(
        (x) => x.id,
      );
    if (actor.roles.includes(RoleCode.TEACHER))
      return (
        await this.prisma.class.findMany({
          where: { schoolId, assignments: { some: { teacher: { userId: actor.userId } } } },
          select: { id: true },
        })
      ).map((x) => x.id);
    if (actor.roles.includes(RoleCode.STUDENT))
      return (
        await this.prisma.enrollment.findMany({
          where: { schoolId, status: 'ACTIVE', student: { userId: actor.userId } },
          select: { classId: true },
        })
      ).map((x) => x.classId);
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
      ).map((x) => x.classId);
    return [];
  }

  async list(actor: AuthContext) {
    const schoolId = this.school(actor);
    const classIds = await this.classIdsFor(actor, schoolId);
    const canSeeDrafts =
      actor.roles.includes(RoleCode.TEACHER) ||
      actor.roles.includes(RoleCode.SCHOOL_ADMIN) ||
      actor.roles.includes(RoleCode.PLATFORM_ADMIN);
    const submissionArgs = actor.roles.includes(RoleCode.STUDENT)
      ? { where: { student: { userId: actor.userId } } }
      : actor.roles.includes(RoleCode.PARENT)
        ? {
            where: {
              student: {
                parentLinks: {
                  some: { parent: { userId: actor.userId }, status: 'APPROVED' as const },
                },
              },
            },
          }
        : undefined;
    const items = await this.prisma.assignment.findMany({
      where: {
        schoolId,
        classId: { in: classIds },
        ...(canSeeDrafts ? {} : { state: AssignmentState.PUBLISHED }),
      },
      include: { class: true, subject: true, submissions: submissionArgs },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });
    return items.map((item) => {
      const submissions = item.submissions ?? [];
      return {
        ...item,
        isLate: submissions.some((submission) => submission.submittedAt > item.dueAt),
        submissionCount: submissions.length,
      };
    });
  }

  async submit(actor: AuthContext, assignmentId: string, input: SubmissionInput) {
    if (!actor.roles.includes(RoleCode.STUDENT))
      throw new ForbiddenException('Only students can submit work');
    const schoolId = this.school(actor);
    const student = await this.prisma.studentProfile.findFirst({
      where: { schoolId, userId: actor.userId },
    });
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        schoolId,
        state: AssignmentState.PUBLISHED,
        class: { enrollments: { some: { schoolId, status: 'ACTIVE', studentId: student?.id } } },
      },
    });
    if (!student || !assignment)
      throw new ForbiddenException('Assignment is not available to this student');
    try {
      const item = await this.prisma.submission.upsert({
        where: {
          schoolId_assignmentId_studentId: { schoolId, assignmentId, studentId: student.id },
        },
        update: {
          content: input.content,
          completedAt: input.completed ? new Date() : null,
          submittedAt: new Date(),
        },
        create: {
          schoolId,
          assignmentId,
          studentId: student.id,
          content: input.content,
          completedAt: input.completed ? new Date() : null,
        },
      });
      await this.auditChange('ASSIGNMENT_SUBMITTED', actor, item.id, { assignmentId });
      await publishAssignmentEvent(
        this.publisher,
        AssignmentEventType.SUBMITTED,
        assignmentId,
        schoolId,
        { submissionId: item.id, studentId: student.id, late: item.submittedAt > assignment.dueAt },
      );
      return { ...item, isLate: item.submittedAt > assignment.dueAt };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new ConflictException('Submission already exists');
      throw error;
    }
  }

  async submissions(actor: AuthContext, assignmentId: string) {
    const schoolId = this.school(actor);
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, schoolId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    if (actor.roles.includes(RoleCode.TEACHER)) await this.canManage(actor, assignment);
    else if (actor.roles.includes(RoleCode.PARENT)) {
      const allowed = await this.classIdsFor(actor, schoolId);
      if (!allowed.includes(assignment.classId))
        throw new ForbiddenException('Assignment is not visible to this parent');
    } else if (actor.roles.includes(RoleCode.STUDENT)) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { schoolId, userId: actor.userId },
      });
      return this.prisma.submission.findMany({
        where: { schoolId, assignmentId, studentId: student?.id },
      });
    } else if (
      !actor.roles.includes(RoleCode.SCHOOL_ADMIN) &&
      !actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    )
      throw new ForbiddenException('Submission access denied');
    const items = await this.prisma.submission.findMany({
      where: {
        schoolId,
        assignmentId,
        ...(actor.roles.includes(RoleCode.PARENT)
          ? {
              student: {
                parentLinks: { some: { parent: { userId: actor.userId }, status: 'APPROVED' } },
              },
            }
          : {}),
      },
      include: { student: { include: { user: true } } },
      orderBy: { submittedAt: 'desc' },
    });
    return items.map((item) => ({ ...item, isLate: item.submittedAt > assignment.dueAt }));
  }

  async feedback(actor: AuthContext, submissionId: string, input: FeedbackInput) {
    const item = await this.prisma.submission.findFirst({
      where: { id: submissionId, schoolId: this.school(actor) },
      include: { assignment: true },
    });
    if (!item) throw new NotFoundException('Submission not found');
    await this.canManage(actor, item.assignment);
    const updated = await this.prisma.submission.update({
      where: { id: submissionId },
      data: { feedback: input.feedback, feedbackByUserId: actor.userId, feedbackAt: new Date() },
    });
    await this.auditChange('ASSIGNMENT_FEEDBACK_ADDED', actor, submissionId);
    await publishAssignmentEvent(
      this.publisher,
      AssignmentEventType.FEEDBACK_ADDED,
      item.assignmentId,
      item.schoolId,
      { submissionId },
    );
    return updated;
  }

  private decodeAttachment(input: AttachmentUploadInput) {
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(input.data))
      throw new BadRequestException('Attachment data must be valid base64');
    const data = Buffer.from(input.data, 'base64');
    if (!data.length || data.length !== input.size)
      throw new BadRequestException('Attachment size does not match uploaded data');
    validateAttachment({ name: input.name, mime: input.mime, size: input.size });
    return data;
  }

  private async replaceFile(
    schoolId: string,
    previousKey: string | null,
    input: AttachmentUploadInput,
    update: (storageKey: string) => Promise<void>,
  ) {
    const storageKey = await this.files.save(schoolId, this.decodeAttachment(input));
    try {
      await update(storageKey);
    } catch (error) {
      await this.files.remove(storageKey);
      throw error;
    }
    if (previousKey) await this.files.remove(previousKey);
    return storageKey;
  }

  async uploadAssignmentAttachment(actor: AuthContext, id: string, input: AttachmentUploadInput) {
    const item = await this.prisma.assignment.findFirst({
      where: { id, schoolId: this.school(actor) },
    });
    if (!item) throw new NotFoundException('Assignment not found');
    await this.canManage(actor, item);
    await this.replaceFile(item.schoolId, item.attachmentStorageKey, input, async (storageKey) => {
      await this.prisma.assignment.update({
        where: { id },
        data: {
          attachmentName: input.name,
          attachmentMime: input.mime,
          attachmentSize: input.size,
          attachmentStorageKey: storageKey,
        },
      });
    });
    await this.auditChange('ASSIGNMENT_ATTACHMENT_UPLOADED', actor, id);
    return { name: input.name, mime: input.mime, size: input.size };
  }

  async removeAssignmentAttachment(actor: AuthContext, id: string) {
    const item = await this.prisma.assignment.findFirst({
      where: { id, schoolId: this.school(actor) },
    });
    if (!item?.attachmentStorageKey) throw new NotFoundException('Attachment not found');
    await this.canManage(actor, item);
    await this.prisma.assignment.update({
      where: { id },
      data: {
        attachmentName: null,
        attachmentMime: null,
        attachmentSize: null,
        attachmentStorageKey: null,
      },
    });
    await this.files.remove(item.attachmentStorageKey);
    await this.auditChange('ASSIGNMENT_ATTACHMENT_DELETED', actor, id);
  }

  async uploadSubmissionAttachment(
    actor: AuthContext,
    submissionId: string,
    input: AttachmentUploadInput,
  ) {
    if (!actor.roles.includes(RoleCode.STUDENT))
      throw new ForbiddenException('Only students can upload submission files');
    const item = await this.prisma.submission.findFirst({
      where: { id: submissionId, schoolId: this.school(actor), student: { userId: actor.userId } },
    });
    if (!item) throw new ForbiddenException('Submission attachment access denied');
    await this.replaceFile(item.schoolId, item.attachmentStorageKey, input, async (storageKey) => {
      await this.prisma.submission.update({
        where: { id: submissionId },
        data: {
          attachmentName: input.name,
          attachmentMime: input.mime,
          attachmentSize: input.size,
          attachmentStorageKey: storageKey,
        },
      });
    });
    await this.auditChange('SUBMISSION_ATTACHMENT_UPLOADED', actor, submissionId);
    return { name: input.name, mime: input.mime, size: input.size };
  }

  async removeSubmissionAttachment(actor: AuthContext, submissionId: string) {
    if (!actor.roles.includes(RoleCode.STUDENT))
      throw new ForbiddenException('Only students can delete submission files');
    const item = await this.prisma.submission.findFirst({
      where: { id: submissionId, schoolId: this.school(actor), student: { userId: actor.userId } },
    });
    if (!item?.attachmentStorageKey) throw new NotFoundException('Attachment not found');
    await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        attachmentName: null,
        attachmentMime: null,
        attachmentSize: null,
        attachmentStorageKey: null,
      },
    });
    await this.files.remove(item.attachmentStorageKey);
    await this.auditChange('SUBMISSION_ATTACHMENT_DELETED', actor, submissionId);
  }

  async attachment(
    actor: AuthContext,
    kind: 'assignment' | 'submission',
    id: string,
    token?: string,
  ) {
    const schoolId = this.school(actor);
    if (!token || !verifyAttachment(token, kind, id, schoolId))
      throw new UnauthorizedException('Attachment link is invalid or expired');
    if (kind === 'assignment') {
      const item = await this.prisma.assignment.findFirst({ where: { id, schoolId } });
      if (!item?.attachmentStorageKey) throw new NotFoundException('Attachment not found');
      await this.assertAttachmentVisible(actor, item.classId, item.state);
      return {
        name: item.attachmentName,
        mime: item.attachmentMime,
        size: item.attachmentSize,
        data: await this.files.read(item.attachmentStorageKey),
      };
    }
    const item = await this.prisma.submission.findFirst({
      where: { id, schoolId },
      include: { assignment: true, student: true },
    });
    if (!item?.attachmentStorageKey) throw new NotFoundException('Attachment not found');
    if (actor.roles.includes(RoleCode.STUDENT) && item.student.userId !== actor.userId)
      throw new ForbiddenException('Submission attachment access denied');
    await this.canReadSubmission(actor, item.assignment, item.studentId);
    return {
      name: item.attachmentName,
      mime: item.attachmentMime,
      size: item.attachmentSize,
      data: await this.files.read(item.attachmentStorageKey),
    };
  }

  async signedAttachment(actor: AuthContext, kind: 'assignment' | 'submission', id: string) {
    const schoolId = this.school(actor);
    if (kind === 'assignment') {
      const item = await this.prisma.assignment.findFirst({ where: { id, schoolId } });
      if (!item?.attachmentStorageKey) throw new NotFoundException('Attachment not found');
      await this.assertAttachmentVisible(actor, item.classId, item.state);
    } else {
      const item = await this.prisma.submission.findFirst({
        where: { id, schoolId },
        include: { assignment: true },
      });
      if (!item?.attachmentStorageKey) throw new NotFoundException('Attachment not found');
      await this.canReadSubmission(actor, item.assignment, item.studentId);
    }
    const expiresAt = new Date(Date.now() + 60_000);
    return {
      url: `/api/v1/assignments/attachments/${kind}/${id}?token=${signAttachment(kind, id, schoolId, expiresAt)}`,
      expiresAt: expiresAt.toISOString(),
    };
  }

  private async assertAttachmentVisible(
    actor: AuthContext,
    classId: string,
    state: AssignmentState,
  ) {
    if (
      state !== AssignmentState.PUBLISHED &&
      !actor.roles.includes(RoleCode.TEACHER) &&
      !actor.roles.includes(RoleCode.SCHOOL_ADMIN) &&
      !actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    )
      throw new ForbiddenException('Attachment is not available');
    const allowed = await this.classIdsFor(actor, this.school(actor));
    if (!allowed.includes(classId)) throw new ForbiddenException('Attachment access denied');
  }
  private async canReadSubmission(
    actor: AuthContext,
    assignment: { schoolId: string; classId: string; subjectId: string; createdByUserId: string },
    studentId: string,
  ) {
    if (
      actor.roles.includes(RoleCode.SCHOOL_ADMIN) ||
      actor.roles.includes(RoleCode.PLATFORM_ADMIN)
    )
      return;
    if (actor.roles.includes(RoleCode.TEACHER)) return this.canManage(actor, assignment);
    if (actor.roles.includes(RoleCode.STUDENT)) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { id: studentId, schoolId: this.school(actor), userId: actor.userId },
      });
      if (!student) throw new ForbiddenException('Submission access denied');
      return;
    }
    if (actor.roles.includes(RoleCode.PARENT)) {
      const link = await this.prisma.parentStudentLink.findFirst({
        where: {
          schoolId: this.school(actor),
          studentId,
          status: 'APPROVED',
          parent: { userId: actor.userId },
        },
      });
      if (!link) throw new ForbiddenException('Submission access denied');
      return;
    }
    throw new ForbiddenException('Submission access denied');
  }
}
