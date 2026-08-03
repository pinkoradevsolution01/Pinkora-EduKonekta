import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { TenantGuard } from './auth.guards';

describe('tenant authorization matrix', () => {
  const guard = new TenantGuard();
  function context(auth: any, school = 'school-a') { const request: any = { auth, params: {}, header: jest.fn((key) => key === 'x-school-id' ? school : undefined) }; return new ExecutionContextHost([request]); }
  it.each([[RoleCode.STUDENT], [RoleCode.TEACHER], [RoleCode.PARENT], [RoleCode.GUIDANCE], [RoleCode.SCHOOL_ADMIN]])('rejects %s cross-tenant access', (role) => expect(() => guard.canActivate(context({ schoolId: 'school-b', roles: [role] }))).toThrow(ForbiddenException));
  it('allows a platform administrator to operate across tenants', () => expect(guard.canActivate(context({ schoolId: 'school-b', roles: [RoleCode.PLATFORM_ADMIN] }))).toBe(true));
});
