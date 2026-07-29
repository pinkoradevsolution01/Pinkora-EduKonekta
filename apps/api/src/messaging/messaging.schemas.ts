import { z } from 'zod';
const id = z.string().uuid();
const attachment = z.object({
  name: z.string().min(1).max(255),
  mime: z.string().max(100),
  size: z.number().int().positive(),
  storageKey: z.string().min(1).max(500),
});
export const createConversationSchema = z.object({
  studentId: id,
  teacherUserId: id,
  initialMessage: z.string().trim().min(1).max(5000),
  attachment: attachment.optional(),
});
export const sendMessageSchema = z.object({
  content: z.string().trim().min(1).max(5000),
  attachment: attachment.optional(),
});
export const escalationSchema = z.object({ reason: z.string().trim().min(3).max(1000) });
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
