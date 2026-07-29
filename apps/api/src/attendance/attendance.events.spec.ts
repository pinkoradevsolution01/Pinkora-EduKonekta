import { AttendanceEventType, attendanceEvent } from './attendance.events';

describe('attendance notification events', () => {
  it('includes only the explicitly authorized parent recipients', () => {
    const event = attendanceEvent(AttendanceEventType.ABSENCE_RECORDED, 'record-1', 'school-a', {
      studentId: 'student-1',
      attendanceDate: '2026-07-25',
      recipientUserIds: ['parent-1'],
    });
    expect(event.type).toBe('attendance.absence.recorded');
    expect(event.payload.recipientUserIds).toEqual(['parent-1']);
    expect(event.schoolId).toBe('school-a');
  });
});
