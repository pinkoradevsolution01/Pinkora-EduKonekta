import { StructureService } from './structure.service';
describe('structure bulk import template', () => {
  it('publishes the supported enrollment columns and row limit', () => {
    const service = new StructureService({} as any, {} as any);
    expect(service.bulkEnrollmentTemplate()).toEqual(
      expect.objectContaining({
        columns: ['schoolYearId', 'classId', 'studentProfileId'],
        maximumRows: 1000,
      }),
    );
  });

  it('scopes every administration overview query to the active school', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      schoolYear: { findMany },
      subject: { findMany },
      class: { findMany },
      studentProfile: { findMany },
      teacherProfile: { findMany },
      parentProfile: { findMany },
      enrollment: { findMany },
      teacherAssignment: { findMany },
      parentStudentLink: { findMany },
    };
    const service = new StructureService(prisma as any, {} as any);
    await service.administrationOverview({
      sessionId: 'session',
      userId: 'user',
      email: 'admin@example.test',
      schoolId: 'school-a',
      roles: [],
    });
    expect(findMany).toHaveBeenCalledTimes(9);
    for (const [input] of findMany.mock.calls) expect(input.where.schoolId).toBe('school-a');
  });
});
