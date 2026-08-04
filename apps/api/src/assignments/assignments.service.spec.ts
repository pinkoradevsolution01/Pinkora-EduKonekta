import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { AuthContext } from '../auth/auth.types';
import { AssignmentsService } from './assignments.service';

const schoolId = '00000000-0000-0000-0000-000000000001';
const classId = '00000000-0000-0000-0000-000000000002';
const subjectId = '00000000-0000-0000-0000-000000000003';
const context = (userId: string, roles: RoleCode[]): AuthContext => ({
  userId,
  email: `${userId}@example.test`,
  sessionId: 'session-1',
  schoolId,
  roles,
});
const actor = context('teacher-user', [RoleCode.TEACHER]);
const input = {
  classId,
  subjectId,
  title: 'Task',
  instructions: 'Do it',
  dueAt: new Date('2030-01-02'),
};

function service(
  prisma: any,
  publisher = { publish: jest.fn() },
  files = { save: jest.fn(), read: jest.fn(), remove: jest.fn() },
) {
  return new AssignmentsService(prisma, {} as any, publisher, files);
}

describe('AssignmentsService authorization and submission behavior', () => {
  it('rejects an unassigned teacher before an assignment is created', async () => {
    const create = jest.fn();
    const prisma = {
      class: { findFirst: jest.fn().mockResolvedValue({ id: classId, schoolId }) },
      subject: { findFirst: jest.fn().mockResolvedValue({ id: subjectId, schoolId }) },
      teacherAssignment: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({ id: 'any-teacher' })
          .mockResolvedValueOnce(null),
      },
      assignment: { create },
      auditLog: { create: jest.fn() },
    };
    await expect(service(prisma).create(actor, input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it('never allows a parent to submit a student assignment', async () => {
    const parent = context('parent-user', [RoleCode.PARENT]);
    await expect(
      service({}).submit(parent, 'assignment-1', { completed: true }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('marks a submission late from persisted timestamps and emits a safe event', async () => {
    const dueAt = new Date('2030-01-01T00:00:00.000Z');
    const submittedAt = new Date('2030-01-02T00:00:00.000Z');
    const publish = jest.fn();
    const student = context('student-user', [RoleCode.STUDENT]);
    const prisma = {
      studentProfile: { findFirst: jest.fn().mockResolvedValue({ id: 'student-1' }) },
      assignment: {
        findFirst: jest.fn().mockResolvedValue({ id: 'assignment-1', schoolId, dueAt }),
      },
      submission: { upsert: jest.fn().mockResolvedValue({ id: 'submission-1', submittedAt }) },
      auditLog: { create: jest.fn() },
    };
    const result = await service(prisma, { publish }).submit(student, 'assignment-1', {
      completed: true,
      content: 'Done',
    });
    expect(result.isLate).toBe(true);
    expect(publish).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'assignment.submitted',
        payload: expect.objectContaining({ late: true }),
      }),
    );
  });

  it('hides drafts when listing work for a student', async () => {
    const student = context('student-user', [RoleCode.STUDENT]);
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = {
      enrollment: { findMany: jest.fn().mockResolvedValue([{ classId }]) },
      assignment: { findMany },
    };
    await service(prisma).list(student);
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      schoolId,
      classId: { in: [classId] },
      state: 'PUBLISHED',
    });
  });

  it('audits an authorized assignment update', async () => {
    const auditCreate = jest.fn();
    const assignment = {
      id: 'assignment-1',
      schoolId,
      classId,
      subjectId,
      createdByUserId: actor.userId,
    };
    const prisma = {
      assignment: {
        findFirst: jest.fn().mockResolvedValue(assignment),
        update: jest.fn().mockResolvedValue(assignment),
      },
      class: { findFirst: jest.fn().mockResolvedValue({ id: classId, schoolId }) },
      subject: { findFirst: jest.fn().mockResolvedValue({ id: subjectId, schoolId }) },
      teacherAssignment: { findFirst: jest.fn().mockResolvedValue({ id: 'teacher-assignment' }) },
      auditLog: { create: auditCreate },
    };
    await service(prisma).update(actor, assignment.id, input);
    expect(auditCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: 'ASSIGNMENT_UPDATED' }) }),
    );
  });
});
