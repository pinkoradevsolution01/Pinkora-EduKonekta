import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { decryptProtected, encryptProtected } from '../safety/safety.crypto';
@Injectable()
export class GuidanceService {
  constructor(private prisma: PrismaService) {}
  private school(a: AuthContext) {
    if (!a.schoolId) throw new ForbiddenException('School required');
    return a.schoolId;
  }
  private async auth(a: AuthContext) {
    const s = this.school(a);
    if (
      !a.roles.includes(RoleCode.GUIDANCE) ||
      !(await this.prisma.safeguardingAccess.findFirst({
        where: { schoolId: s, userId: a.userId, isActive: true },
      }))
    )
      throw new ForbiddenException('Restricted safeguarding access required');
    return s;
  }
  private async audit(a: AuthContext, id: string, action: string) {
    await this.prisma.auditLog.create({
      data: {
        schoolId: this.school(a),
        actorUserId: a.userId,
        entityType: 'guidance_case',
        entityId: id,
        action,
      },
    });
  }
  private async access(a: AuthContext, id: string, elevated = false) {
    const s = await this.auth(a);
    const c = await this.prisma.guidanceCase.findFirst({
      where: {
        id,
        schoolId: s,
        assignments: { some: { userId: a.userId, ...(elevated ? { elevated: true } : {}) } },
      },
    });
    if (!c) throw new ForbiddenException('You are not assigned to this case');
    return c;
  }
  async create(a: AuthContext, input: any) {
    const s = await this.auth(a);
    const report = await this.prisma.safetyReport.findFirst({
      where: { id: input.reportId, schoolId: s },
    });
    if (!report) throw new NotFoundException('Approved report not found');
    const c = await this.prisma.$transaction(async (tx) => {
      const item = await tx.guidanceCase.create({
        data: {
          schoolId: s,
          reportId: report.id,
          priority: input.priority,
          followUpAt: input.followUpAt,
        },
      });
      await tx.guidanceCaseAssignment.create({
        data: { schoolId: s, caseId: item.id, userId: a.userId, elevated: true },
      });
      return item;
    });
    await this.audit(a, c.id, 'GUIDANCE_CASE_CREATED');
    return c;
  }
  async list(a: AuthContext) {
    const s = await this.auth(a);
    return this.prisma.guidanceCase.findMany({
      where: { schoolId: s, assignments: { some: { userId: a.userId } } },
      include: { assignments: { include: { user: { select: { displayName: true } } } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  async detail(a: AuthContext, id: string) {
    const c = await this.access(a, id);
    const data = await this.prisma.guidanceCase.findUnique({
      where: { id: c.id },
      include: {
        report: true,
        assignments: { include: { user: { select: { displayName: true } } } },
        notes: {
          include: { author: { select: { displayName: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    await this.audit(a, id, 'GUIDANCE_CASE_VIEWED');
    return {
      ...data,
      actionPlan: data?.actionPlanEncrypted ? decryptProtected(data.actionPlanEncrypted) : null,
      referral: data?.referralEncrypted ? decryptProtected(data.referralEncrypted) : null,
      notes: data?.notes.map((n) => ({ ...n, content: decryptProtected(n.contentEncrypted) })),
    };
  }
  async assign(a: AuthContext, id: string, input: any) {
    await this.access(a, id, true);
    const s = await this.auth(a);
    const member = await this.prisma.safeguardingAccess.findFirst({
      where: { schoolId: s, userId: input.userId, isActive: true },
    });
    if (!member) throw new ForbiddenException('Assignee lacks safeguarding authorization');
    const x = await this.prisma.guidanceCaseAssignment.upsert({
      where: { caseId_userId: { caseId: id, userId: input.userId } },
      update: { elevated: input.elevated },
      create: { schoolId: s, caseId: id, userId: input.userId, elevated: input.elevated },
    });
    await this.audit(a, id, 'GUIDANCE_CASE_ASSIGNED');
    return x;
  }
  async update(a: AuthContext, id: string, input: any) {
    const c = await this.access(a, id, input.status === 'OPEN');
    if (c.status === 'CLOSED' && input.status !== 'OPEN')
      throw new ForbiddenException('Closed cases may only be reopened by elevated staff');
    const { actionPlan, referral, ...fields } = input;
    const x = await this.prisma.guidanceCase.update({
      where: { id },
      data: {
        ...fields,
        actionPlanEncrypted: actionPlan ? encryptProtected(actionPlan) : undefined,
        referralEncrypted: referral ? encryptProtected(referral) : undefined,
        closedAt:
          input.status === 'CLOSED' ? new Date() : input.status === 'OPEN' ? null : undefined,
      },
    });
    await this.audit(a, id, 'GUIDANCE_CASE_UPDATED');
    return x;
  }
  async note(a: AuthContext, id: string, content: string) {
    const c = await this.access(a, id);
    if (c.status === 'CLOSED') throw new ForbiddenException('Closed cases preserve history');
    const x = await this.prisma.guidanceCaseNote.create({
      data: {
        schoolId: this.school(a),
        caseId: id,
        authorUserId: a.userId,
        contentEncrypted: encryptProtected(content),
      },
    });
    await this.audit(a, id, 'GUIDANCE_CASE_NOTE_ADDED');
    return { id: x.id };
  }
  async export(a: AuthContext, id: string) {
    const item = await this.detail(a, id);
    await this.access(a, id, true);
    await this.audit(a, id, 'GUIDANCE_CASE_EXPORTED');
    return item;
  }
}
