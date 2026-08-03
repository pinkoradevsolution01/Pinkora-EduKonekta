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
});
