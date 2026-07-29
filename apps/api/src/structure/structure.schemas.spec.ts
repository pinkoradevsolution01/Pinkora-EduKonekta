import { bulkEnrollmentSchema, enrollmentSchema } from './structure.schemas';

const id = '00000000-0000-0000-0000-000000000001';

describe('school structure validation schemas', () => {
  it('accepts a bounded enrollment validation batch', () => {
    expect(
      bulkEnrollmentSchema.parse({
        rows: [{ schoolYearId: id, classId: id, studentProfileId: id }],
      }).rows,
    ).toHaveLength(1);
  });

  it('rejects malformed or incomplete relationship identifiers', () => {
    expect(() => enrollmentSchema.parse({ schoolYearId: id, classId: 'not-an-id' })).toThrow();
  });
});
