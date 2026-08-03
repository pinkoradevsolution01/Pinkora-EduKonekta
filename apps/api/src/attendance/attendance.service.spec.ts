import { ConflictException, ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AttendanceService } from './attendance.service';
const teacher = { userId: 'teacher-1', schoolId: 'school-a', roles: [RoleCode.TEACHER] } as any;
const parent = { userId: 'parent-1', schoolId: 'school-a', roles: [RoleCode.PARENT] } as any;
const input = {
  classId: 'class-a',
  attendanceDate: new Date('2026-08-01'),
  records: [{ studentId: 'student-a', state: 'PRESENT' as const }],
};
describe('AttendanceService authorization and totals', () => {
  it('rejects an unassigned teacher before attendance is recorded', async () => {
    const db = {
      class: { findFirst: jest.fn().mockResolvedValue({ id: 'class-a' }) },
      teacherAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new AttendanceService(db as any, {} as any, {} as any);
    await expect(service.recordDaily(teacher, input)).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('prevents duplicate attendance records for a class and date', async () => {
    const db = {
      class: { findFirst: jest.fn().mockResolvedValue({ id: 'class-a' }) },
      teacherAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'assignment-a' }) },
      enrollment: { findMany: jest.fn().mockResolvedValue([{ studentId: 'student-a' }]) },
      attendanceRecord: { findMany: jest.fn().mockResolvedValue([{ studentId: 'student-a' }]) },
    };
    const service = new AttendanceService(db as any, {} as any, {} as any);
    await expect(service.recordDaily(teacher, input)).rejects.toBeInstanceOf(ConflictException);
  });
  it('queries parent attendance only for approved linked children', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = {
      parentProfile: { findFirst: jest.fn().mockResolvedValue({ id: 'parent-profile-a' }) },
      parentStudentLink: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ studentId: 'student-a', student: { id: 'student-a' } }]),
      },
      attendanceRecord: { findMany },
    };
    const service = new AttendanceService(db as any, {} as any, {} as any);
    await service.childrenView(parent, {});
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ schoolId: 'school-a', studentId: { in: ['student-a'] } }),
      }),
    );
  });
  it('calculates all attendance totals correctly', () => {
    const service = new AttendanceService({} as any, {} as any, {} as any);
    expect(
      (service as any).summarize([
        { state: 'PRESENT' },
        { state: 'ABSENT' },
        { state: 'LATE' },
        { state: 'EXCUSED' },
        { state: 'ABSENT' },
      ]),
    ).toEqual({ present: 1, absent: 2, late: 1, excused: 1 });
  });
});
