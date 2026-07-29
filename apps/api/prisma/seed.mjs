import { PrismaClient, RoleCode, UserStatus } from '@prisma/client';
import { randomBytes, scryptSync } from 'node:crypto';

const prisma = new PrismaClient();

function demoPasswordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${scryptSync(password, salt, 64).toString('hex')}`;
}

const roleNames = {
  STUDENT: 'Student',
  TEACHER: 'Teacher',
  PARENT: 'Parent',
  GUIDANCE: 'Guidance',
  SCHOOL_ADMIN: 'School Administrator',
  PLATFORM_ADMIN: 'Platform Administrator',
};

async function main() {
  const roles = {};
  for (const code of Object.values(RoleCode)) {
    roles[code] = await prisma.role.upsert({
      where: { code },
      update: { name: roleNames[code] },
      create: { code, name: roleNames[code] },
    });
  }

  const school = await prisma.school.upsert({
    where: { slug: 'pinkora-demo-school' },
    update: { name: 'Pinkora Demonstration School', isActive: true },
    create: { name: 'Pinkora Demonstration School', slug: 'pinkora-demo-school' },
  });

  const users = [
    { email: 'student@demo.edukonekta.test', displayName: 'Demo Student', role: RoleCode.STUDENT },
    { email: 'teacher@demo.edukonekta.test', displayName: 'Demo Teacher', role: RoleCode.TEACHER },
    { email: 'parent@demo.edukonekta.test', displayName: 'Demo Parent', role: RoleCode.PARENT },
    {
      email: 'guidance@demo.edukonekta.test',
      displayName: 'Demo Guidance Counselor',
      role: RoleCode.GUIDANCE,
    },
    {
      email: 'admin@demo.edukonekta.test',
      displayName: 'Demo School Admin',
      role: RoleCode.SCHOOL_ADMIN,
    },
  ];
  const demoUsers = {};

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        displayName: userData.displayName,
        status: UserStatus.ACTIVE,
        passwordHash: demoPasswordHash('PinkoraDemo!2026'),
        emailVerifiedAt: new Date(),
      },
      create: {
        email: userData.email,
        displayName: userData.displayName,
        status: UserStatus.ACTIVE,
        managedAuthSubject: `demo:${userData.email}`,
        passwordHash: demoPasswordHash('PinkoraDemo!2026'),
        emailVerifiedAt: new Date(),
      },
    });
    demoUsers[userData.role] = user;

    await prisma.schoolMembership.upsert({
      where: { schoolId_userId: { schoolId: school.id, userId: user.id } },
      update: { roleId: roles[userData.role].id, isActive: true },
      create: { schoolId: school.id, userId: user.id, roleId: roles[userData.role].id },
    });
  }
  await prisma.safeguardingAccess.upsert({
    where: { schoolId_userId: { schoolId: school.id, userId: demoUsers[RoleCode.GUIDANCE].id } },
    update: { isActive: true },
    create: { schoolId: school.id, userId: demoUsers[RoleCode.GUIDANCE].id, isActive: true },
  });

  const schoolYear = await prisma.schoolYear.upsert({
    where: { schoolId_name: { schoolId: school.id, name: '2026-2027' } },
    update: { isActive: true },
    create: {
      schoolId: school.id,
      name: '2026-2027',
      startsOn: new Date('2026-06-01'),
      endsOn: new Date('2027-03-31'),
    },
  });
  const demoClass = await prisma.class.upsert({
    where: {
      schoolId_schoolYearId_name: {
        schoolId: school.id,
        schoolYearId: schoolYear.id,
        name: 'Grade 7 - Sapphire',
      },
    },
    update: { gradeLevel: 'Grade 7' },
    create: {
      schoolId: school.id,
      schoolYearId: schoolYear.id,
      name: 'Grade 7 - Sapphire',
      gradeLevel: 'Grade 7',
    },
  });
  const subject = await prisma.subject.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'ENG-7' } },
    update: { name: 'English 7' },
    create: { schoolId: school.id, code: 'ENG-7', name: 'English 7' },
  });
  const studentProfile = await prisma.studentProfile.upsert({
    where: { userId: demoUsers[RoleCode.STUDENT].id },
    update: { schoolId: school.id, studentNumber: 'DEMO-0001' },
    create: {
      schoolId: school.id,
      userId: demoUsers[RoleCode.STUDENT].id,
      studentNumber: 'DEMO-0001',
    },
  });
  const teacherProfile = await prisma.teacherProfile.upsert({
    where: { userId: demoUsers[RoleCode.TEACHER].id },
    update: { schoolId: school.id, employeeNumber: 'DEMO-T-001' },
    create: {
      schoolId: school.id,
      userId: demoUsers[RoleCode.TEACHER].id,
      employeeNumber: 'DEMO-T-001',
    },
  });
  const existingParent = await prisma.parentProfile.findFirst({
    where: { schoolId: school.id, userId: demoUsers[RoleCode.PARENT].id },
  });
  const parentProfile = existingParent
    ? await prisma.parentProfile.update({
        where: { id: existingParent.id },
        data: { schoolId: school.id },
      })
    : await prisma.parentProfile.create({
        data: { schoolId: school.id, userId: demoUsers[RoleCode.PARENT].id },
      });
  await prisma.enrollment.upsert({
    where: {
      schoolId_schoolYearId_studentId: {
        schoolId: school.id,
        schoolYearId: schoolYear.id,
        studentId: studentProfile.id,
      },
    },
    update: { classId: demoClass.id, status: 'ACTIVE' },
    create: {
      schoolId: school.id,
      schoolYearId: schoolYear.id,
      classId: demoClass.id,
      studentId: studentProfile.id,
    },
  });
  await prisma.teacherAssignment.upsert({
    where: {
      schoolId_classId_subjectId_teacherId: {
        schoolId: school.id,
        classId: demoClass.id,
        subjectId: subject.id,
        teacherId: teacherProfile.id,
      },
    },
    update: {},
    create: {
      schoolId: school.id,
      classId: demoClass.id,
      subjectId: subject.id,
      teacherId: teacherProfile.id,
    },
  });
  await prisma.parentStudentLink.upsert({
    where: {
      schoolId_parentId_studentId: {
        schoolId: school.id,
        parentId: parentProfile.id,
        studentId: studentProfile.id,
      },
    },
    update: {
      status: 'APPROVED',
      approvedByUserId: demoUsers[RoleCode.SCHOOL_ADMIN].id,
      approvedAt: new Date(),
    },
    create: {
      schoolId: school.id,
      parentId: parentProfile.id,
      studentId: studentProfile.id,
      status: 'APPROVED',
      approvedByUserId: demoUsers[RoleCode.SCHOOL_ADMIN].id,
      approvedAt: new Date(),
    },
  });
  const demoAssignment = await prisma.assignment.findFirst({
    where: { schoolId: school.id, title: 'Welcome to English 7' },
  });
  if (!demoAssignment) {
    await prisma.assignment.create({
      data: {
        schoolId: school.id,
        classId: demoClass.id,
        subjectId: subject.id,
        createdByUserId: demoUsers[RoleCode.TEACHER].id,
        title: 'Welcome to English 7',
        instructions: 'Write a short introduction about yourself.',
        state: 'PUBLISHED',
        dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
  }
  await prisma.attendanceRecord.upsert({
    where: {
      schoolId_classId_studentId_attendanceDate: {
        schoolId: school.id,
        classId: demoClass.id,
        studentId: studentProfile.id,
        attendanceDate: new Date('2026-07-25T00:00:00.000Z'),
      },
    },
    update: {
      state: 'PRESENT',
      notes: 'Demo attendance',
      recordedByUserId: demoUsers[RoleCode.TEACHER].id,
    },
    create: {
      schoolId: school.id,
      classId: demoClass.id,
      studentId: studentProfile.id,
      attendanceDate: new Date('2026-07-25T00:00:00.000Z'),
      state: 'PRESENT',
      notes: 'Demo attendance',
      recordedByUserId: demoUsers[RoleCode.TEACHER].id,
    },
  });

  await prisma.featureFlag.upsert({
    where: { schoolId_key: { schoolId: school.id, key: 'student-support' } },
    update: { enabled: true },
    create: { schoolId: school.id, key: 'student-support', enabled: true },
  });

  await prisma.invitation.upsert({
    where: { codeHash: '191956ec285a021b0438ee38fb5a3dd62bcc73a6787dd604488a95135802b04d' },
    update: { expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
    create: {
      schoolId: school.id,
      email: 'new-user@demo.edukonekta.test',
      roleId: roles[RoleCode.STUDENT].id,
      codeHash: '191956ec285a021b0438ee38fb5a3dd62bcc73a6787dd604488a95135802b04d',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`Seeded ${school.name} (${school.id})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
