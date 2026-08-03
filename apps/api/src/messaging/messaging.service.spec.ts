import { ForbiddenException } from '@nestjs/common';
import { RoleCode } from '@prisma/client';
import { MessagingService } from './messaging.service';
const parent = { userId: 'parent-1', schoolId: 'school-a', roles: [RoleCode.PARENT] } as any;
describe('MessagingService controls', () => {
  it('rejects a conversation when the parent and teacher are not authorized through a student', async () => {
    const db = {
      parentStudentLink: { findFirst: jest.fn().mockResolvedValue(null) },
      teacherAssignment: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new MessagingService(db as any, { publish: jest.fn() } as any);
    await expect(
      service.create(parent, {
        studentId: 'student-a',
        teacherUserId: 'teacher-a',
        initialMessage: 'May we discuss progress?',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('uses a generic secure notification preview rather than message content', async () => {
    const db = {
      conversation: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'conversation-a',
          schoolId: 'school-a',
          parentUserId: 'parent-1',
          teacherUserId: 'teacher-a',
          state: 'ACTIVE',
          messages: [],
        }),
      },
      message: {
        updateMany: jest.fn().mockResolvedValue({}),
        create: jest.fn().mockResolvedValue({ id: 'message-a', content: 'private detail' }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const service = new MessagingService(db as any, { publish: jest.fn() } as any);
    const output = await service.send(parent, 'conversation-a', { content: 'private detail' });
    expect(output.notificationPreview).toBe('New secure message');
    expect(output.notificationPreview).not.toContain('private detail');
  });
});
