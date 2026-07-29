import { z } from 'zod';

const id = z.string().uuid();
const attachment = z.object({
  name: z.string().trim().min(1).max(255),
  mime: z.string().max(100),
  size: z.number().int().positive(),
  storageKey: z.string().trim().min(1).max(500),
});

export const assignmentSchema = z.object({
  classId: id,
  subjectId: id,
  title: z.string().trim().min(1).max(200),
  instructions: z.string().trim().min(1).max(100_000),
  dueAt: z.coerce.date(),
  attachment: attachment.optional(),
});

export const submissionSchema = z.object({
  content: z.string().max(100_000).optional(),
  completed: z.boolean().default(true),
  attachment: attachment.optional(),
});

export const feedbackSchema = z.object({
  feedback: z.string().max(20_000),
});

export type AssignmentInput = z.infer<typeof assignmentSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type FeedbackInput = z.infer<typeof feedbackSchema>;
