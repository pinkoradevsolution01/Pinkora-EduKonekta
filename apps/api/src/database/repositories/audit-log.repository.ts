import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantWhere } from '../tenant/tenant-query';

@Injectable()
export class AuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  listForSchool(schoolId: string, limit = 100) {
    return this.prisma.auditLog.findMany({
      where: tenantWhere(schoolId),
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 500),
    });
  }
}
