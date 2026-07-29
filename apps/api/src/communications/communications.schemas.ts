import { z } from 'zod';

const id = z.string().uuid();
const audience = z.enum(['SCHOOL', 'CLASS', 'TEACHERS', 'PARENTS', 'STUDENTS', 'GUIDANCE']);
const attachment = z.object({
  name: z.string().min(1).max(255),
  mime: z.string().max(100),
  size: z.number().int().positive(),
  url: z.string().url().optional(),
});

export const announcementSchema = z.object({
  title: z.string().trim().min(1).max(200),
  bodyHtml: z.string().min(1).max(100_000),
  audiences: z.array(audience).min(1),
  classIds: z.array(id).default([]),
  publishAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
  attachment: attachment.optional(),
});
export const calendarEventSchema = z.object({
  classId: id.optional(),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20_000).optional(),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
});
export const idSchema = z.object({ id });

export type AnnouncementInput = z.infer<typeof announcementSchema>;
export type CalendarEventInput = z.infer<typeof calendarEventSchema>;
