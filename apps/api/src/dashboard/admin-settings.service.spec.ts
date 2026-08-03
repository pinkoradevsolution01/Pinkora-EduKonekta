import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AdminSettingsService } from './admin-settings.service';

const schoolAdmin = {
  userId: 'admin-a',
  schoolId: 'school-a',
  roles: [RoleCode.SCHOOL_ADMIN],
} as any;
const platformAdmin = { ...schoolAdmin, roles: [RoleCode.PLATFORM_ADMIN] } as any;

describe('AdminSettingsService', () => {
  function prisma() {
    return {
      school: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'school-a',
          name: 'School A',
          slug: 'school-a',
          isActive: true,
          subscriptionPlan: 'TRIAL',
          subscriptionStatus: 'ACTIVE',
        }),
        update: jest.fn().mockResolvedValue({
          id: 'school-a',
          subscriptionPlan: 'BASIC',
          subscriptionStatus: 'ACTIVE',
        }),
      },
      featureFlag: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn().mockResolvedValue({ key: 'messaging', enabled: true }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as any;
  }

  it('reads and writes settings only for the actor school and records changes', async () => {
    const db = prisma();
    const service = new AdminSettingsService(db);
    await service.get(schoolAdmin);
    await service.setFeatureFlag(schoolAdmin, 'messaging', true);
    expect(db.school.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'school-a' } }),
    );
    expect(db.featureFlag.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId_key: { schoolId: 'school-a', key: 'messaging' } },
      }),
    );
    expect(db.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ schoolId: 'school-a', action: 'FEATURE_FLAG_UPDATED' }),
      }),
    );
  });

  it('does not allow a school administrator to change a subscription', async () => {
    const db = prisma();
    const service = new AdminSettingsService(db);
    await expect(service.updateSubscription(schoolAdmin, { plan: 'BASIC' })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(db.school.update).not.toHaveBeenCalled();
  });

  it('allows a platform administrator to change the subscription in the current tenant', async () => {
    const db = prisma();
    const service = new AdminSettingsService(db);
    await service.updateSubscription(platformAdmin, { plan: 'BASIC', status: 'ACTIVE' });
    expect(db.school.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'school-a' },
        data: { subscriptionPlan: 'BASIC', subscriptionStatus: 'ACTIVE' },
      }),
    );
  });
});
