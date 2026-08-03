import { z } from 'zod';
import { RoleCode } from '@prisma/client';
const id = z.string().uuid();
export const createSchoolSchema = z.object({ name: z.string().trim().min(2).max(200), slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100) });
export const createInvitationSchema = z.object({ schoolId: id.optional(), email: z.string().trim().email().max(320), role: z.nativeEnum(RoleCode).refine((role) => role !== RoleCode.PLATFORM_ADMIN, 'Platform administrator invitations are not school-issued'), expiresAt: z.coerce.date().optional() });
export type CreateSchoolInput = z.infer<typeof createSchoolSchema>; export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
