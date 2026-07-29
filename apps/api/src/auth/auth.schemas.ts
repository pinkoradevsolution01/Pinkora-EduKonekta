import { z } from 'zod';

const password = z.string().min(12).max(128);

export const loginSchema = z.object({
  email: z.string().email().max(320),
  password,
  schoolId: z.string().uuid().optional(),
});

export const redeemInvitationSchema = z.object({
  code: z.string().min(16).max(256),
  displayName: z.string().trim().min(2).max(200),
  password,
});

export const tokenSchema = z.object({ token: z.string().min(20).max(256) });
export const recoveryRequestSchema = z.object({ email: z.string().email().max(320) });
export const statusSchema = z.object({ status: z.enum(['ACTIVE', 'INACTIVE']) });

export type LoginInput = z.infer<typeof loginSchema>;
export type RedeemInvitationInput = z.infer<typeof redeemInvitationSchema>;
