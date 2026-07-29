import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { tenantWhere } from '../tenant/tenant-query';

@Injectable()
export class FeatureFlagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isEnabled(schoolId: string, key: string): Promise<boolean> {
    const flag = await this.prisma.featureFlag.findFirst({
      where: tenantWhere(schoolId, { key }),
      select: { enabled: true },
    });
    return flag?.enabled ?? false;
  }
}
