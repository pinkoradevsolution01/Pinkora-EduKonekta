import { z } from 'zod';

const id = z.string().uuid();
const kind = z.enum([
  'ACADEMIC_PROGRESS',
  'BEHAVIOR_OBSERVATION',
  'POSITIVE_ACHIEVEMENT',
  'TEACHER_FEEDBACK',
  'INTERNAL_SAFEGUARDING',
]);
const visibility = z.enum(['PARENT_VISIBLE', 'INTERNAL_ONLY']);
const respectfulLanguage = z
  .string()
  .trim()
  .min(3)
  .max(5_000)
  .refine(
    (value) =>
      !/\b(diagnos(?:e|ed|is)|risk score|punish(?:ment|ed)?|label(?:led)?|criminal)\b/i.test(value),
    'Use neutral observations; do not include diagnoses, risk scores, punishment, or labels',
  );

const evaluationFields = z.object({
  kind,
  visibility,
  content: respectfulLanguage,
  observedAt: z.coerce.date().optional(),
});

export const evaluationCreateSchema = evaluationFields
  .extend({ studentId: id })
  .superRefine((value, ctx) => {
    if (value.kind === 'INTERNAL_SAFEGUARDING' && value.visibility !== 'INTERNAL_ONLY')
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Safeguarding notes must remain internal',
      });
  });

export const evaluationUpdateSchema = evaluationFields
  .extend({ reason: z.string().trim().min(3).max(1_000).optional() })
  .superRefine((value, ctx) => {
    if (value.kind === 'INTERNAL_SAFEGUARDING' && value.visibility !== 'INTERNAL_ONLY')
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Safeguarding notes must remain internal',
      });
  });

export const evaluationQuerySchema = z.object({ studentId: id.optional() });

export type EvaluationCreateInput = z.infer<typeof evaluationCreateSchema>;
export type EvaluationUpdateInput = z.infer<typeof evaluationUpdateSchema>;
export type EvaluationQuery = z.infer<typeof evaluationQuerySchema>;
