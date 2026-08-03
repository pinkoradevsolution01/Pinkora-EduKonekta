import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { SchoolReportsService } from './school-reports.service';

const admin = { userId: 'admin-1', schoolId: 'school-a', roles: [RoleCode.SCHOOL_ADMIN] } as any;

describe('SchoolReportsService', () => {
  function prisma() {
    return {
      schoolMembership: {
        count: jest.fn().mockResolvedValue(7),
        findMany: jest.fn().mockResolvedValue([]),
      },
      class: { count: jest.fn().mockResolvedValue(2) },
      enrollment: { count: jest.fn().mockResolvedValue(20) },
      attendanceRecord: {
        groupBy: jest.fn().mockResolvedValue([{ state: 'ABSENT', _count: { _all: 3 } }]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      assignment: {
        count: jest.fn().mockResolvedValue(4),
        findMany: jest.fn().mockResolvedValue([]),
      },
      submission: { count: jest.fn().mockResolvedValue(2) },
      announcement: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([]),
      },
      announcementRead: { count: jest.fn().mockResolvedValue(8) },
      announcementAcknowledgement: { count: jest.fn().mockResolvedValue(5) },
      safetyReport: {
        groupBy: jest.fn().mockResolvedValue([{ status: 'UNDER_REVIEW', _count: { _all: 2 } }]),
      },
      guidanceCase: { count: jest.fn().mockResolvedValue(1) },
      message: { groupBy: jest.fn().mockResolvedValue([]) },
      auditLog: { findMany: jest.fn().mockResolvedValue([]) },
    } as any;
  }
  it('uses tenant-scoped source records and returns de-identified safety totals', async () => {
    const db = prisma();
    const service = new SchoolReportsService(db);
    const result = await service.overview(admin, {
      from: new Date('2026-01-01'),
      to: new Date('2026-01-31'),
    });
    expect(db.safetyReport.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-a' }) }),
    );
    expect(result).toMatchObject({
      activeUsers: 7,
      safetyTotals: [{ status: 'UNDER_REVIEW', total: 2 }],
      openGuidanceCases: 1,
    });
    expect(JSON.stringify(result)).not.toContain('reporter');
  });
  it('rejects non-administrators before querying or exporting', async () => {
    const db = prisma();
    const service = new SchoolReportsService(db);
    await expect(
      service.export({ ...admin, roles: [RoleCode.TEACHER] }, 'audit'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.auditLog.findMany).not.toHaveBeenCalled();
  });
  it('caps large report queries and always includes the actor school filter', async () => {
    const db = prisma();
    const service = new SchoolReportsService(db);
    await service.report(admin, 'attendance', {}, 50_000);
    expect(db.attendanceRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a' }),
        take: 1000,
      }),
    );
  });
  it('creates a formula-safe CSV from the same tenant-scoped rows', async () => {
    const db = prisma();
    db.assignment.findMany.mockResolvedValue([
      {
        id: 'assignment-a',
        title: '=unsafe',
        state: 'PUBLISHED',
        dueAt: null,
        class: { name: 'Class A' },
        _count: { submissions: 2 },
      },
    ]);
    const service = new SchoolReportsService(db);
    const result = await service.export(admin, 'assignments');
    expect(result).toMatchObject({
      fileName: 'assignments-report.csv',
      contentType: 'text/csv; charset=utf-8',
    });
    expect(result.content).toContain("'=unsafe");
    expect(db.assignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ schoolId: 'school-a' }) }),
    );
  });
});
