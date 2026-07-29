import { RoleCode } from '@prisma/client';
import { Request } from 'express';

export interface AuthContext {
  sessionId: string;
  userId: string;
  schoolId: string | null;
  roles: RoleCode[];
  email: string;
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

export const AUTH_CONTEXT = 'authContext';
