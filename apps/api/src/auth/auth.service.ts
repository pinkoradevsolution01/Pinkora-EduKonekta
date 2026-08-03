import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthTokenPurpose, Prisma, RoleCode, UserStatus } from '@prisma/client';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogRepository } from '../database/repositories/audit-log.repository';
import { InvitationRepository } from '../database/repositories/invitation.repository';
import { hashInvitationCode } from '../database/tenant/invitation-code';
import { AuthContext } from './auth.types';
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from './auth.crypto';
import { AuthRateLimiter } from './rate-limiter';
import { LoginInput, RedeemInvitationInput } from './auth.schemas';

const SESSION_DAYS = 7;
const TOKEN_HOURS = 24;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invitations: InvitationRepository,
    private readonly audit: AuditLogRepository,
    private readonly limiter: AuthRateLimiter,
  ) {}

  private async writeAudit(
    action: string,
    userId?: string,
    schoolId?: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.auditLog.create({
      data: { action, entityType: 'authentication', actorUserId: userId, schoolId, metadata },
    });
  }

  private setCookie(response: Response, token: string): void {
    response.cookie('pk_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SESSION_DAYS * 86400_000,
    });
  }

  private async createSession(
    userId: string,
    schoolId: string | null,
    response: Response,
  ): Promise<AuthContext> {
    const raw = createOpaqueToken();
    const session = await this.prisma.authSession.create({
      data: {
        userId,
        schoolId,
        managedAuthSessionId: hashToken(raw),
        expiresAt: new Date(Date.now() + SESSION_DAYS * 86400_000),
      },
    });
    this.setCookie(response, raw);
    return (await this.context(session.id, userId, schoolId))!;
  }

  private async context(
    sessionId: string,
    userId: string,
    schoolId: string | null,
  ): Promise<AuthContext | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true, ...(schoolId ? { schoolId } : {}) },
          include: { role: true },
        },
      },
    });
    if (!user || user.status !== UserStatus.ACTIVE) return null;
    return {
      sessionId,
      userId: user.id,
      schoolId,
      email: user.email,
      roles: user.memberships.map((membership) => membership.role.code),
    };
  }

  async authenticate(cookieHeader?: string): Promise<AuthContext | null> {
    const raw = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('pk_session='))
      ?.slice('pk_session='.length);
    if (!raw) return null;
    const session = await this.prisma.authSession.findFirst({
      where: {
        managedAuthSessionId: hashToken(raw),
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!session) return null;
    return this.context(session.id, session.userId, session.schoolId);
  }

  async login(input: LoginInput, response: Response): Promise<AuthContext> {
    this.limiter.check('login', input.email);
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { memberships: { where: { isActive: true }, include: { role: true } } },
    });
    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !(await verifyPassword(input.password, user.passwordHash))
    ) {
      await this.writeAudit('LOGIN_FAILED', user?.id);
      throw new UnauthorizedException('Invalid credentials');
    }
    const membership = input.schoolId
      ? user.memberships.find((item) => item.schoolId === input.schoolId)
      : user.memberships[0];
    if (!membership) throw new ForbiddenException('No active school membership');
    this.limiter.clear('login', input.email);
    const context = await this.createSession(user.id, membership.schoolId, response);
    await this.writeAudit('LOGIN_SUCCEEDED', user.id, membership.schoolId);
    return context;
  }

  async redeemInvitation(input: RedeemInvitationInput, response: Response) {
    const invitation = await this.prisma.invitation.findFirst({
      where: {
        codeHash: hashInvitationCode(input.code),
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { role: true },
    });
    if (!invitation) throw new UnauthorizedException('Invitation is invalid or expired');
    const email = invitation.email.toLowerCase();
    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.invitation.updateMany({
        where: { id: invitation.id, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) throw new UnauthorizedException('Invitation is invalid or expired');
      const user = await tx.user.upsert({
        where: { email },
        update: {
          displayName: input.displayName,
          passwordHash: await hashPassword(input.password),
          status: UserStatus.ACTIVE,
        },
        create: {
          email,
          displayName: input.displayName,
          passwordHash: await hashPassword(input.password),
          status: UserStatus.ACTIVE,
        },
      });
      await tx.schoolMembership.create({
        data: { schoolId: invitation.schoolId, userId: user.id, roleId: invitation.roleId },
      });
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
      return user;
    });
    await this.writeAudit('INVITATION_REDEEMED', result.id, invitation.schoolId, {
      role: invitation.role.code,
    });
    return {
      user: { id: result.id, email: result.email, displayName: result.displayName },
      session: await this.createSession(result.id, invitation.schoolId, response),
    };
  }

  async logout(cookieHeader: string | undefined, response: Response): Promise<void> {
    const session = await this.authenticate(cookieHeader);
    if (session) {
      await this.prisma.authSession.update({
        where: { id: session.sessionId },
        data: { revokedAt: new Date() },
      });
      await this.writeAudit('LOGOUT', session.userId, session.schoolId ?? undefined);
    }
    response.clearCookie('pk_session', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
    });
  }

  async requestRecovery(email: string): Promise<{ accepted: true }> {
    this.limiter.check('recovery', email);
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      const raw = createOpaqueToken();
      await this.prisma.authToken.create({
        data: {
          userId: user.id,
          tokenHash: hashToken(raw),
          purpose: AuthTokenPurpose.PASSWORD_RESET,
          expiresAt: new Date(Date.now() + TOKEN_HOURS * 3600_000),
        },
      });
      await this.writeAudit('PASSWORD_RESET_REQUESTED', user.id);
    }
    return { accepted: true };
  }

  async requestEmailVerification(
    userId: string,
    schoolId: string | null,
  ): Promise<{ accepted: true }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.emailVerifiedAt) {
      const raw = createOpaqueToken();
      await this.prisma.authToken.create({
        data: {
          userId,
          schoolId,
          tokenHash: hashToken(raw),
          purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
          expiresAt: new Date(Date.now() + TOKEN_HOURS * 3600_000),
        },
      });
      await this.writeAudit('EMAIL_VERIFICATION_REQUESTED', userId, schoolId ?? undefined);
    }
    return { accepted: true };
  }

  async verifyEmail(token: string): Promise<void> {
    const record = await this.prisma.authToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        purpose: AuthTokenPurpose.EMAIL_VERIFICATION,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw new UnauthorizedException('Verification token is invalid or expired');
    const claimed = await this.prisma.authToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (claimed.count !== 1)
      throw new UnauthorizedException('Verification token is invalid or expired');
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
    await this.writeAudit('EMAIL_VERIFIED', record.userId, record.schoolId ?? undefined);
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const record = await this.prisma.authToken.findFirst({
      where: {
        tokenHash: hashToken(token),
        purpose: AuthTokenPurpose.PASSWORD_RESET,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });
    if (!record) throw new UnauthorizedException('Reset token is invalid or expired');
    const changed = await this.prisma.authToken.updateMany({
      where: { id: record.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    });
    if (changed.count !== 1) throw new UnauthorizedException('Reset token is invalid or expired');
    await this.prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(password), status: UserStatus.ACTIVE },
    });
    await this.prisma.authSession.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.writeAudit('PASSWORD_RESET_COMPLETED', record.userId);
  }

  async updateStatus(actor: AuthContext, userId: string, status: UserStatus): Promise<void> {
    const target = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: true },
    });
    if (!target) throw new UnauthorizedException('User not found');
    if (
      !actor.roles.includes(RoleCode.PLATFORM_ADMIN) &&
      (!actor.schoolId ||
        !target.memberships.some((m) => m.schoolId === actor.schoolId) ||
        !actor.roles.includes(RoleCode.SCHOOL_ADMIN))
    )
      throw new ForbiddenException('Not allowed to manage this account');
    await this.prisma.user.update({ where: { id: userId }, data: { status } });
    if (status === UserStatus.INACTIVE)
      await this.prisma.authSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
    await this.writeAudit(
      status === UserStatus.ACTIVE ? 'ACCOUNT_ACTIVATED' : 'ACCOUNT_DEACTIVATED',
      userId,
      actor.schoolId ?? undefined,
    );
  }

  async users(actor: AuthContext) {
    if (
      !actor.schoolId ||
      !actor.roles.some(
        (role) => role === RoleCode.SCHOOL_ADMIN || role === RoleCode.PLATFORM_ADMIN,
      )
    )
      throw new ForbiddenException('School administration access required');
    return this.prisma.schoolMembership.findMany({
      where: { schoolId: actor.schoolId },
      select: {
        userId: true,
        isActive: true,
        joinedAt: true,
        user: { select: { displayName: true, email: true, status: true, emailVerifiedAt: true } },
        role: { select: { code: true, name: true } },
      },
      orderBy: { joinedAt: 'desc' },
      take: 500,
    });
  }
}
