import { z } from 'zod';

const safeText = z.string().trim().min(10).max(8_000);
const safeStatusText = z.string().trim().min(3).max(1_000);
const evidence = z
  .object({
    name: z.string().trim().min(1).max(255),
    mime: z.enum(['application/pdf', 'image/jpeg', 'image/png']),
    size: z
      .number()
      .int()
      .positive()
      .max(5 * 1024 * 1024),
    storageKey: z.string().trim().min(1).max(500),
    contentBase64: z
      .string()
      .min(1)
      .max(7 * 1024 * 1024)
      .optional(),
  })
  .optional();

export const createSafetyReportSchema = z.object({
  category: z.enum(['BULLYING', 'HARASSMENT', 'THREAT', 'WELLBEING', 'OTHER']),
  incidentDate: z.coerce.date(),
  location: z.string().trim().max(300).optional(),
  description: safeText,
  evidence,
});
export const updateSafetyReportSchema = z.object({
  status: z.enum(['SUBMITTED', 'UNDER_REVIEW', 'FOLLOW_UP', 'CLOSED']),
  reporterNote: safeStatusText.optional(),
});

export type CreateSafetyReportInput = z.infer<typeof createSafetyReportSchema>;
export type UpdateSafetyReportInput = z.infer<typeof updateSafetyReportSchema>;
