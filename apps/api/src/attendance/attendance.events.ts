import { randomUUID } from 'node:crypto';
import { DomainEvent, EventPublisher } from '../communications/notification-events';

export const AttendanceEventType = {
  ABSENCE_RECORDED: 'attendance.absence.recorded',
} as const;

export function attendanceEvent<T>(
  type: string,
  aggregateId: string,
  schoolId: string,
  payload: T,
): DomainEvent<T> {
  return {
    id: randomUUID(),
    type,
    version: 1,
    occurredAt: new Date().toISOString(),
    aggregateId,
    schoolId,
    payload,
  };
}

export function publishAbsenceEvent(
  publisher: EventPublisher,
  recordId: string,
  schoolId: string,
  payload: { studentId: string; attendanceDate: string; recipientUserIds: string[] },
) {
  return publisher.publish(
    attendanceEvent(AttendanceEventType.ABSENCE_RECORDED, recordId, schoolId, payload),
  );
}
