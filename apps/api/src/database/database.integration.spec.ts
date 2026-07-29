import { RoleCode, PrismaClient } from '@prisma/client';
import { InvitationRepository } from './repositories/invitation.repository';
import { SchoolMembershipRepository } from './repositories/school-membership.repository';
import { hashInvitationCode } from './tenant/invitation-code';

const describeDatabase = process.env.RUN_DB_TESTS === 'true' ? describe : describe.skip;

describeDatabase('database multi-tenant integration', () => {
  const prisma = new PrismaClient();
  let schoolA: { id: string };
  let schoolB: { id: string };
  let user: { id: string };
  let role: { id: string };

  beforeAll(async () => {
    await prisma.$connect();
    role = await prisma.role.upsert({
      where: { code: RoleCode.TEACHER },
      update: {},
      create: { code: RoleCode.TEACHER, name: 'Teacher' },
    });
    user = await prisma.user.create({
      data: {
        email: `integration-${Date.now()}@test.invalid`,
        displayName: 'Integration User',
        managedAuthSubject: `integration:${Date.now()}`,
      },
    });
    schoolA = await prisma.school.create({
      data: { name: 'Integration School A', slug: `integration-a-${Date.now()}` },
    });
    schoolB = await prisma.school.create({
      data: { name: 'Integration School B', slug: `integration-b-${Date.now()}` },
    });
  });

  afterAll(async () => {
    await prisma.school.deleteMany({ where: { id: { in: [schoolA.id, schoolB.id] } } });
    await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('does not return School B memberships when querying School A', async () => {
    await prisma.schoolMembership.create({
      data: { schoolId: schoolA.id, userId: user.id, roleId: role.id },
    });
    const userB = await prisma.user.create({
      data: { email: `integration-b-${Date.now()}@test.invalid`, displayName: 'School B User' },
    });
    await prisma.schoolMembership.create({
      data: { schoolId: schoolB.id, userId: userB.id, roleId: role.id },
    });

    const repository = new SchoolMembershipRepository(prisma as never);
    const memberships = await repository.findForSchool(schoolA.id);

    expect(memberships).toHaveLength(1);
    expect(memberships[0]?.schoolId).toBe(schoolA.id);
    await prisma.user.delete({ where: { id: userB.id } });
  });

  it('rejects duplicate memberships', async () => {
    await expect(
      prisma.schoolMembership.create({
        data: { schoolId: schoolA.id, userId: user.id, roleId: role.id },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('rejects expired invitations and consumes a valid invitation once', async () => {
    const expiredCode = `expired-${Date.now()}`;
    await prisma.invitation.create({
      data: {
        schoolId: schoolA.id,
        email: 'expired@test.invalid',
        roleId: role.id,
        codeHash: hashInvitationCode(expiredCode),
        expiresAt: new Date(Date.now() - 1_000),
      },
    });
    const validCode = `valid-${Date.now()}`;
    await prisma.invitation.create({
      data: {
        schoolId: schoolA.id,
        email: 'valid@test.invalid',
        roleId: role.id,
        codeHash: hashInvitationCode(validCode),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    const repository = new InvitationRepository(prisma as never);
    await expect(repository.consumeCode(schoolA.id, expiredCode)).resolves.toBeNull();
    await expect(repository.consumeCode(schoolA.id, validCode)).resolves.toMatchObject({
      schoolId: schoolA.id,
    });
    await expect(repository.consumeCode(schoolA.id, validCode)).resolves.toBeNull();
  });
});
