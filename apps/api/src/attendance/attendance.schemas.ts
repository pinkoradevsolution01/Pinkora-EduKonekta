import { z } from 'zod';

const id = z.string().uuid();
const date = z.coerce.date();
const state = z.enum(['PRESENT', 'ABSENT', 'LATE', 'EXCUSED']);

export const attendanceRecordSchema = z.object({
  studentId: id,
  state,
  notes: z.string().max(5_000).optional(),
});

export const dailyAttendanceSchema = z.object({
  classId: id,
  attendanceDate: date,
  records: z.array(attendanceRecordSchema).min(1).max(500),
});

export const attendanceQuerySchema = z.object({
  classId: id.optional(),
  attendanceDate: date.optional(),
});

export const attendanceCorrectionSchema = z.object({
  state,
  notes: z.string().max(5_000).optional(),
  reason: z.string().trim().min(1).max(5_000),
});

export type DailyAttendanceInput = z.infer<typeof dailyAttendanceSchema>;
export type AttendanceQuery = z.infer<typeof attendanceQuerySchema>;
export type AttendanceCorrectionInput = z.infer<typeof attendanceCorrectionSchema>;
