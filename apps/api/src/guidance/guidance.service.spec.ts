import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { GuidanceService } from './guidance.service';
const teacher = { userId: 'teacher-1', schoolId: 'school-a', roles: [RoleCode.TEACHER] } as any;
const guidance = { userId: 'guidance-1', schoolId: 'school-a', roles: [RoleCode.GUIDANCE] } as any;
describe('GuidanceService restricted workflow', () => {
  it('rejects ordinary teaching staff before any case list is queried', async () => {
    const db = { safeguardingAccess: { findFirst: jest.fn() } };
    const service = new GuidanceService(db as any);
    await expect(service.list(teacher)).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.safeguardingAccess.findFirst).not.toHaveBeenCalled();
  });
  it('prevents a non-elevated assignee from exporting a case', async () => {
    const db = {
      safeguardingAccess: { findFirst: jest.fn().mockResolvedValue({ id: 'access-a' }) },
      guidanceCase: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'case-a', status: 'OPEN' })
          .mockResolvedValueOnce(null),
        findUnique: jest.fn().mockResolvedValue({
          id: 'case-a',
          notes: [],
          actionPlanEncrypted: null,
          referralEncrypted: null,
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new GuidanceService(db as any);
    await expect(service.export(guidance, 'case-a')).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('does not permit silent notes on a closed case', async () => {
    const db = {
      safeguardingAccess: { findFirst: jest.fn().mockResolvedValue({ id: 'access-a' }) },
      guidanceCase: { findFirst: jest.fn().mockResolvedValue({ id: 'case-a', status: 'CLOSED' }) },
    };
    const service = new GuidanceService(db as any);
    await expect(
      service.note(guidance, 'case-a', 'A later unapproved change.'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
