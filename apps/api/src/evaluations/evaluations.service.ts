import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EvaluationVisibility, Prisma, RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import {
  createEvent,
  EVENT_PUBLISHER,
  EventPublisher,
} from '../communications/notification-events';
import {
  EvaluationCreateInput,
  EvaluationQuery,
  EvaluationUpdateInput,
} from './evaluations.schemas';

@Injectable()
export class EvaluationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  private school(actor: AuthContext) {
    if (!actor.schoolId) throw new ForbiddenException('A school tenant is required');
    return actor.schoolId;
  }

  private isAdministrator(actor: AuthContext) {
    return actor.roles.some(
      (role) => role === RoleCode.SCHOOL_ADMIN || role === RoleCode.PLATFORM_ADMIN,
    );
  }

  private async canTeachStudent(actor: AuthContext, studentId: string) {
    const schoolId = this.school(actor);
    if (this.isAdministrator(actor)) return true;
    if (!actor.roles.includes(RoleCode.TEACHER)) return false;
    return Boolean(
      await this.prisma.enrollment.findFirst({
        where: {
          schoolId,
          studentId,
          status: 'ACTIVE',
          class: { assignments: { some: { schoolId, teacher: { userId: actor.userId } } } },
        },
        select: { id: true },
      }),
    );
  }

  private async assertStudentInSchool(actor: AuthContext, studentId: string) {
    const student = await this.prisma.studentProfile.findFirst({
      where: { id: studentId, schoolId: this.school(actor) },
      select: { id: true },
    });
    if (!student) throw new ForbiddenException('Cross-school student identifier rejected');
  }

  private async assertCanManageStudent(actor: AuthContext, studentId: string) {
    await this.assertStudentInSchool(actor, studentId);
    if (!(await this.canTeachStudent(actor, studentId)))
      throw new ForbiddenException('Teachers can evaluate only students in assigned classes');
  }

  private async audit(
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
        entityType: 'evaluations',
        entityId,
        metadata,
      },
    });
  }

  private display(item: any, actor: AuthContext) {
    return {
      ...item,
      acknowledged:
        Array.isArray(item.acknowledgements) &&
        item.acknowledgements.some((entry: { userId: string }) => entry.userId === actor.userId),
    };
  }

  async create(actor: AuthContext, input: EvaluationCreateInput) {
    await this.assertCanManageStudent(actor, input.studentId);
    const item = await this.prisma.evaluationNote.create({
      data: {
        ...input,
        schoolId: this.school(actor),
        authorUserId: actor.userId,
        observedAt: input.observedAt ?? new Date(),
      },
      include: {
        student: { select: { id: true, user: { select: { displayName: true } } } },
        author: { select: { displayName: true } },
      },
    });
    await this.audit('EVALUATION_CREATED', actor, item.id, {
      kind: item.kind,
      visibility: item.visibility,
    });
    return item;
  }

  async update(actor: AuthContext, id: string, input: EvaluationUpdateInput) {
    const item = await this.prisma.evaluationNote.findFirst({
      where: { id, schoolId: this.school(actor) },
    });
    if (!item) throw new NotFoundException('Evaluation not found');
    await this.assertCanManageStudent(actor, item.studentId);
    if (!this.isAdministrator(actor) && item.authorUserId !== actor.userId)
      throw new ForbiddenException('Only the author can edit this evaluation');
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.evaluationHistory.create({
        data: {
          schoolId: item.schoolId,
          evaluationId: item.id,
          editedByUserId: actor.userId,
          previousKind: item.kind,
          previousVisibility: item.visibility,
          previousContent: item.content,
          reason: input.reason,
        },
      });
      return tx.evaluationNote.update({
        where: { id },
        data: {
          kind: input.kind,
          visibility: input.visibility,
          content: input.content,
          observedAt: input.observedAt ?? item.observedAt,
        },
        include: {
          student: { select: { id: true, user: { select: { displayName: true } } } },
          author: { select: { displayName: true } },
        },
      });
    });
    await this.audit('EVALUATION_UPDATED', actor, id, {
      visibility: updated.visibility,
      reason: input.reason ?? null,
    });
    await this.publisher.publish(createEvent('evaluation.updated', id, updated.schoolId, {}));
    return updated;
  }

  private async parentStudentIds(actor: AuthContext) {
    return (
      await this.prisma.parentStudentLink.findMany({
        where: {
          schoolId: this.school(actor),
          status: 'APPROVED',
          parent: { userId: actor.userId },
        },
        select: { studentId: true },
      })
    ).map((link) => link.studentId);
  }

  async list(actor: AuthContext, query: EvaluationQuery) {
    const schoolId = this.school(actor);
    let studentIds: string[] | undefined;
    let visibility: EvaluationVisibility | undefined;
    if (actor.roles.includes(RoleCode.STUDENT)) {
      const student = await this.prisma.studentProfile.findFirst({
        where: { schoolId, userId: actor.userId },
        select: { id: true },
      });
      studentIds = student ? [student.id] : [];
      visibility = EvaluationVisibility.PARENT_VISIBLE;
    } else if (actor.roles.includes(RoleCode.PARENT)) {
      studentIds = await this.parentStudentIds(actor);
      visibility = EvaluationVisibility.PARENT_VISIBLE;
    } else if (actor.roles.includes(RoleCode.TEACHER)) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          schoolId,
          status: 'ACTIVE',
          class: { assignments: { some: { teacher: { userId: actor.userId } } } },
        },
        select: { studentId: true },
      });
      studentIds = [...new Set(enrollments.map((entry) => entry.studentId))];
    } else if (!this.isAdministrator(actor))
      throw new ForbiddenException('Evaluation access denied');
    if (query.studentId) {
      if (studentIds && !studentIds.includes(query.studentId))
        throw new ForbiddenException('Student access denied');
      await this.assertStudentInSchool(actor, query.studentId);
      studentIds = [query.studentId];
    }
    const items = await this.prisma.evaluationNote.findMany({
      where: {
        schoolId,
        ...(studentIds ? { studentId: { in: studentIds } } : {}),
        ...(visibility ? { visibility } : {}),
      },
      include: {
        student: { include: { user: { select: { displayName: true } } } },
        author: { select: { displayName: true } },
        acknowledgements: actor.roles.includes(RoleCode.PARENT)
          ? { where: { userId: actor.userId } }
          : false,
      },
      orderBy: [{ observedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return items.map((item) => this.display(item, actor));
  }

  /** Students the current educator is explicitly permitted to evaluate. */
  async manageableStudents(actor: AuthContext) {
    const schoolId = this.school(actor);
    if (
      !actor.roles.some(
        (role) =>
          role === RoleCode.TEACHER ||
          role === RoleCode.SCHOOL_ADMIN ||
          role === RoleCode.PLATFORM_ADMIN,
      )
    )
      throw new ForbiddenException('Student selection is available only to authorized staff');

    const students = await this.prisma.studentProfile.findMany({
      where: {
        schoolId,
        ...(this.isAdministrator(actor)
          ? {}
          : {
              enrollments: {
                some: {
                  schoolId,
                  status: 'ACTIVE',
                  class: { assignments: { some: { schoolId, teacher: { userId: actor.userId } } } },
                },
              },
            }),
      },
      select: {
        id: true,
        studentNumber: true,
        user: { select: { displayName: true } },
        enrollments: {
          where: { schoolId, status: 'ACTIVE' },
          select: { class: { select: { name: true } } },
          take: 1,
        },
      },
      orderBy: { user: { displayName: 'asc' } },
    });
    return students.map((student) => ({
      id: student.id,
      displayName: student.user.displayName,
      studentNumber: student.studentNumber,
      className: student.enrollments[0]?.class.name ?? null,
    }));
  }

  async acknowledge(actor: AuthContext, id: string) {
    const item = await this.prisma.evaluationNote.findFirst({
      where: { id, schoolId: this.school(actor), visibility: EvaluationVisibility.PARENT_VISIBLE },
    });
    if (!item || !(await this.parentStudentIds(actor)).includes(item.studentId))
      throw new ForbiddenException('Evaluation is not visible to this parent');
    const acknowledgement = await this.prisma.evaluationAcknowledgement.upsert({
      where: { evaluationId_userId: { evaluationId: id, userId: actor.userId } },
      update: {},
      create: { evaluationId: id, userId: actor.userId },
    });
    await this.audit('EVALUATION_ACKNOWLEDGED', actor, id);
    return acknowledgement;
  }

  async history(actor: AuthContext, id: string) {
    const item = await this.prisma.evaluationNote.findFirst({
      where: { id, schoolId: this.school(actor) },
    });
    if (!item) throw new NotFoundException('Evaluation not found');
    await this.assertCanManageStudent(actor, item.studentId);
    return this.prisma.evaluationHistory.findMany({
      where: { schoolId: this.school(actor), evaluationId: id },
      include: { editedBy: { select: { displayName: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async summary(actor: AuthContext, query: EvaluationQuery) {
    const items = await this.list(actor, query);
    return {
      total: items.length,
      parentVisible: items.filter((item) => item.visibility === EvaluationVisibility.PARENT_VISIBLE)
        .length,
      internal: items.filter((item) => item.visibility === EvaluationVisibility.INTERNAL_ONLY)
        .length,
      acknowledged: items.filter((item) => item.acknowledged).length,
      items,
    };
  }
}
