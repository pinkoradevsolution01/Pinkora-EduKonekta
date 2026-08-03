import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { EvaluationsService } from './evaluations.service';
const parent = { userId: 'parent-1', schoolId: 'school-a', roles: [RoleCode.PARENT] } as any;
describe('EvaluationsService visibility and authorization', () => {
  it('queries parent-visible evaluations only for approved linked children', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const db = {
      parentStudentLink: { findMany: jest.fn().mockResolvedValue([{ studentId: 'student-a' }]) },
      evaluationNote: { findMany },
    };
    const service = new EvaluationsService(db as any, { publish: jest.fn() } as any);
    await service.list(parent, {});
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schoolId: 'school-a',
          studentId: { in: ['student-a'] },
          visibility: 'PARENT_VISIBLE',
        }),
      }),
    );
  });
  it('rejects modification by a user without educational authorization', async () => {
    const db = {
      evaluationNote: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'evaluation-a',
          schoolId: 'school-a',
          studentId: 'student-a',
          authorUserId: 'teacher-a',
        }),
      },
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ id: 'student-a' }) },
    };
    const service = new EvaluationsService(db as any, { publish: jest.fn() } as any);
    await expect(
      service.update(parent, 'evaluation-a', {
        kind: 'ACADEMIC_PROGRESS',
        visibility: 'PARENT_VISIBLE',
        content: 'Neutral progress observation.',
      } as any),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
