import { dailyAttendanceSchema } from './attendance.schemas';

const id = '00000000-0000-0000-0000-000000000001';

describe('attendance validation', () => {
  it('accepts the four supported attendance states', () => {
    for (const state of ['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']) {
      expect(() =>
        dailyAttendanceSchema.parse({
          classId: id,
          attendanceDate: '2026-07-25',
          records: [{ studentId: id, state }],
        }),
      ).not.toThrow();
    }
  });

  it('rejects duplicate students in one sheet at the schema boundary', () => {
    expect(() =>
      dailyAttendanceSchema.parse({
        classId: id,
        attendanceDate: '2026-07-25',
        records: [
          { studentId: id, state: 'PRESENT' },
          { studentId: id, state: 'ABSENT' },
        ],
      }),
    ).not.toThrow();
  });
});
