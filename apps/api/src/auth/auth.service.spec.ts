import { UnauthorizedException } from '@nestjs/common';
import { RoleCode, UserStatus } from '@prisma/client';
import { hashPassword } from './auth.crypto';
import { AuthRateLimiter } from './rate-limiter';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const password = 'CorrectHorseBatteryStaple!';
  const response = () => ({ cookie: jest.fn(), clearCookie: jest.fn() }) as any;

  function service(prisma: any) {
    return new AuthService(prisma, {} as any, {} as any, new AuthRateLimiter());
  }

  it('creates a hashed, HttpOnly session cookie after a successful login and audits it', async () => {
    const passwordHash = await hashPassword(password);
    const user = {
      id: 'user-a',
      email: 'teacher@example.test',
      status: UserStatus.ACTIVE,
      passwordHash,
      memberships: [{ schoolId: 'school-a', role: { code: RoleCode.TEACHER } }],
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValueOnce(user).mockResolvedValueOnce(user) },
      authSession: { create: jest.fn().mockResolvedValue({ id: 'session-a' }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    const reply = response();

    const result = await service(prisma).login({ email: user.email, password }, reply);

    expect(result).toMatchObject({
      userId: 'user-a',
      schoolId: 'school-a',
      roles: [RoleCode.TEACHER],
    });
    expect(prisma.authSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-a', schoolId: 'school-a' }),
      }),
    );
    expect(reply.cookie).toHaveBeenCalledWith(
      'pk_session',
      expect.any(String),
      expect.objectContaining({ httpOnly: true, sameSite: 'lax', path: '/' }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'LOGIN_SUCCEEDED' }) }),
    );
  });

  it('rejects deactivated accounts, does not create a session, and audits the failed attempt', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-inactive',
          status: UserStatus.INACTIVE,
          passwordHash: await hashPassword(password),
          memberships: [],
        }),
      },
      authSession: { create: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as any;

    await expect(
      service(prisma).login({ email: 'inactive@example.test', password }, response()),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.authSession.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: 'LOGIN_FAILED', actorUserId: 'user-inactive' }),
      }),
    );
  });

  it('revokes every active session and writes an audit event when an administrator deactivates an account', async () => {
    const prisma = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'user-a', memberships: [{ schoolId: 'school-a' }] }),
        update: jest.fn().mockResolvedValue({}),
      },
      authSession: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    } as any;
    await service(prisma).updateStatus(
      {
        sessionId: 'admin-session',
        userId: 'admin-a',
        email: 'admin@example.test',
        schoolId: 'school-a',
        roles: [RoleCode.SCHOOL_ADMIN],
      },
      'user-a',
      UserStatus.INACTIVE,
    );
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-a' },
        data: { revokedAt: expect.any(Date) },
      }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'ACCOUNT_DEACTIVATED' }) }),
    );
  });
});
