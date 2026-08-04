import { z } from 'zod';

const id = z.string().uuid();
const attachmentUpload = z.object({
  name: z.string().trim().min(1).max(255),
  mime: z.string().max(100),
  size: z.number().int().positive(),
  /** Base64-encoded file bytes. A 10 MB file is below this encoded upper bound. */
  data: z
    .string()
    .trim()
    .min(4)
    .max(14 * 1024 * 1024),
});

export const assignmentSchema = z.object({
  classId: id,
  subjectId: id,
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(100_000),
  dueAt: z.coerce.date(),
});

export const submissionSchema = z.object({
  content: z.string().max(100_000).optional(),
  completed: z.boolean().default(true),
});

export const feedbackSchema = z.object({
  feedback: z.string().max(20_000),
});
export const attachmentUploadSchema = attachmentUpload;

export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
export type AttachmentUploadInput = z.infer<typeof attachmentUploadSchema>;
