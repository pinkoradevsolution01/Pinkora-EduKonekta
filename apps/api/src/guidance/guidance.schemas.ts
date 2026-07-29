import { z } from 'zod';
const id=z.string().uuid(); const text=z.string().trim().min(3).max(8000);
export const createCaseSchema=z.object({reportId:id,priority:z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM'),followUpAt:z.coerce.date().optional()});
export const assignCaseSchema=z.object({userId:id,elevated:z.boolean().default(false)});
export const caseUpdateSchema=z.object({status:z.enum(['OPEN','IN_PROGRESS','CLOSED']).optional(),priority:z.enum(['LOW','MEDIUM','HIGH','URGENT']).optional(),actionPlan:text.optional(),referral:text.optional(),followUpAt:z.coerce.date().nullable().optional()});
export const noteSchema=z.object({content:text});
