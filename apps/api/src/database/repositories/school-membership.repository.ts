import { Injectable } from '@nestjs/common';
import { Prisma, SchoolMembership } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantWhere } from '../tenant/tenant-query';

@Injectable()
export class SchoolMembershipRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForSchool(schoolId: string, userId?: string) {
    return this.prisma.schoolMembership.findMany({
      where: tenantWhere(schoolId, userId ? { userId } : {}),
      include: { user: true, role: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(input: Pick<SchoolMembership, 'schoolId' | 'userId' | 'roleId'>) {
    return this.prisma.schoolMembership.create({
      data: {
        schoolId: input.schoolId,
        userId: input.userId,
        roleId: input.roleId,
      },
      include: { user: true, role: true },
    });
  }

  async exists(schoolId: string, userId: string): Promise<boolean> {
    const membership = await this.prisma.schoolMembership.findFirst({
      where: tenantWhere(schoolId, { userId }),
      select: { id: true },
    });
    return membership !== null;
  }
}

export type SchoolMembershipCreateData = Prisma.SchoolMembershipCreateInput;
