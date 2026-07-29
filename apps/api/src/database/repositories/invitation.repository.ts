import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hashInvitationCode } from '../tenant/invitation-code';
import { tenantWhere } from '../tenant/tenant-query';

@Injectable()
export class InvitationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findPendingForSchool(schoolId: string, email?: string) {
    return this.prisma.invitation.findMany({
      where: tenantWhere(schoolId, {
        ...(email ? { email } : {}),
        usedAt: null,
        expiresAt: { gt: new Date() },
      }),
      include: { role: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async consumeCode(schoolId: string, code: string) {
    const now = new Date();
    const invitation = await this.prisma.invitation.findFirst({
      where: tenantWhere(schoolId, {
        codeHash: hashInvitationCode(code),
        usedAt: null,
        expiresAt: { gt: now },
      }),
    });

    if (!invitation) return null;

    const consumed = await this.prisma.invitation.updateMany({
      where: tenantWhere(schoolId, {
        id: invitation.id,
        usedAt: null,
        expiresAt: { gt: now },
      }),
      data: { usedAt: now },
    });

    return consumed.count === 1 ? { ...invitation, usedAt: now } : null;
  }
}

export type InvitationCreateData = Prisma.InvitationCreateInput;
