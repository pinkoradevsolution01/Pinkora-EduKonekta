import { z } from 'zod';

export const updateSchoolSettingsSchema = z.object({
  name: z.string().trim().min(2).max(200),
});

export const featureFlagKeySchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9._-]{0,99}$/);
export const updateFeatureFlagSchema = z.object({ enabled: z.boolean() });

export const updateSubscriptionSchema = z
  .object({
    plan: z.enum(['TRIAL', 'BASIC', 'STANDARD', 'PREMIUM']).optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
  })
  .refine(
    (value) => value.plan !== undefined || value.status !== undefined,
    'Provide a subscription value',
  );

export type UpdateSchoolSettingsInput = z.infer<typeof updateSchoolSettingsSchema>;
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;
