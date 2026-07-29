import { z } from 'zod';

const id = z.string().uuid();
const name = z.string().trim().min(1).max(150);

export const schoolYearSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startsOn: z.coerce.date(),
  endsOn: z.coerce.date(),
});
export const classSchema = z.object({
  schoolYearId: id,
  name,
  gradeLevel: z.string().trim().max(50).optional(),
});
export const subjectSchema = z.object({ code: z.string().trim().min(1).max(50), name });
export const profileSchema = z.object({
  userId: id,
  studentNumber: z.string().trim().max(100).optional(),
  employeeNumber: z.string().trim().max(100).optional(),
});
export const enrollmentSchema = z.object({ schoolYearId: id, classId: id, studentProfileId: id });
export const assignmentSchema = z.object({ classId: id, subjectId: id, teacherProfileId: id });
export const parentLinkSchema = z.object({ parentProfileId: id, studentProfileId: id });
export const bulkEnrollmentSchema = z.object({ rows: z.array(enrollmentSchema).max(1000) });

export type SchoolYearInput = z.infer<typeof schoolYearSchema>;
export type ClassInput = z.infer<typeof classSchema>;
export type SubjectInput = z.infer<typeof subjectSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type EnrollmentInput = z.infer<typeof enrollmentSchema>;
export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type ParentLinkInput = z.infer<typeof parentLinkSchema>;
