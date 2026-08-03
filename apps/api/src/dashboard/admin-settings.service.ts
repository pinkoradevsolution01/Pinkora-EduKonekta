import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSchoolSettingsInput, UpdateSubscriptionInput } from './admin-settings.schemas';

@Injectable()
export class AdminSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private schoolAdmin(actor: AuthContext) {
    if (
      !actor.schoolId ||
      !actor.roles.some(
        (role) => role === RoleCode.SCHOOL_ADMIN || role === RoleCode.PLATFORM_ADMIN,
      )
    ) {
      throw new ForbiddenException('School administration access required');
    }
    return actor.schoolId;
  }

  private platform(actor: AuthContext) {
    if (!actor.roles.includes(RoleCode.PLATFORM_ADMIN))
      throw new ForbiddenException('Platform administration access required');
  }

  async get(actor: AuthContext) {
    const schoolId = this.schoolAdmin(actor);
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        updatedAt: true,
      },
    });
    if (!school) throw new NotFoundException('School not found');
    const featureFlags = await this.prisma.featureFlag.findMany({
      where: { schoolId },
      select: { key: true, enabled: true, updatedAt: true },
      orderBy: { key: 'asc' },
    });
    return { school, featureFlags };
  }

  async updateSchool(actor: AuthContext, input: UpdateSchoolSettingsInput) {
    const schoolId = this.schoolAdmin(actor);
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: { name: input.name },
      select: { id: true, name: true, slug: true, updatedAt: true },
    });
    await this.audit(actor, schoolId, 'SCHOOL_SETTINGS_UPDATED', 'school', schoolId, {
      fields: ['name'],
    });
    return school;
  }

  async setFeatureFlag(actor: AuthContext, key: string, enabled: boolean) {
    const schoolId = this.schoolAdmin(actor);
    const flag = await this.prisma.featureFlag.upsert({
      where: { schoolId_key: { schoolId, key } },
      update: { enabled },
      create: { schoolId, key, enabled },
      select: { key: true, enabled: true, updatedAt: true },
    });
    await this.audit(actor, schoolId, 'FEATURE_FLAG_UPDATED', 'feature_flag', undefined, {
      key,
      enabled,
    });
    return flag;
  }

  async updateSubscription(actor: AuthContext, input: UpdateSubscriptionInput) {
    this.platform(actor);
    const schoolId = this.schoolAdmin(actor);
    const school = await this.prisma.school.update({
      where: { id: schoolId },
      data: {
        ...(input.plan ? { subscriptionPlan: input.plan } : {}),
        ...(input.status ? { subscriptionStatus: input.status } : {}),
      },
      select: { id: true, subscriptionPlan: true, subscriptionStatus: true, updatedAt: true },
    });
    await this.audit(actor, schoolId, 'SUBSCRIPTION_UPDATED', 'school', schoolId, {
      plan: input.plan,
      status: input.status,
    });
    return school;
  }

  private audit(
    actor: AuthContext,
    schoolId: string,
    action: string,
    entityType: string,
    entityId: string | undefined,
    metadata: Record<string, unknown>,
  ) {
    return this.prisma.auditLog.create({
      data: {
        schoolId,
        actorUserId: actor.userId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue,
      },
    });
  }
}
