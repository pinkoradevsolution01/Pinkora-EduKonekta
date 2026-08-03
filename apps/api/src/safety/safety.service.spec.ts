import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { SafetyService } from './safety.service';
const student = { userId: 'student-1', schoolId: 'school-a', roles: [RoleCode.STUDENT] } as any;
const teacher = { userId: 'teacher-1', schoolId: 'school-a', roles: [RoleCode.TEACHER] } as any;
const report = {
  category: 'BULLYING' as const,
  incidentDate: new Date('2026-08-01'),
  description: 'A factual report of repeated unwanted messages.',
};
describe('SafetyService confidential access', () => {
  it('rejects an unverified account before a report is created', async () => {
    const db = { user: { findFirst: jest.fn().mockResolvedValue(null) } };
    const service = new SafetyService(db as any, { publish: jest.fn() } as any);
    await expect(service.submit(student, report)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('does not allow ordinary teachers to access confidential intake', async () => {
    const service = new SafetyService({} as any, { publish: jest.fn() } as any);
    await expect(service.intake(teacher)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('returns a reporter-safe confirmation without protected details', async () => {
    const db = {
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ email: 'student@example.test', displayName: 'Student' }),
      },
      safetyReport: {
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockResolvedValue({ id: 'report-a', status: 'SUBMITTED' }),
      },
      safetyReportUpdate: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new SafetyService(db as any, { publish: jest.fn() } as any);
    const result = await service.submit(student, report);
    expect(result).toMatchObject({ id: 'report-a', status: 'SUBMITTED' });
    expect(JSON.stringify(result)).not.toContain(report.description);
  });
});
