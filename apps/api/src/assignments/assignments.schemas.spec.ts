import { assignmentSchema, attachmentUploadSchema, submissionSchema } from './assignments.schemas';

const id = '00000000-0000-0000-0000-000000000001';

describe('assignment validation schemas', () => {
  it('requires bounded assignment fields and upload bytes', () => {
    expect(() =>
      assignmentSchema.parse({
        classId: id,
        subjectId: id,
        title: 'Task',
        instructions: 'Do it',
        dueAt: new Date(),
      }),
    ).not.toThrow();
    expect(() =>
      attachmentUploadSchema.parse({
        name: 'work.pdf',
        mime: 'application/pdf',
        size: 4,
        data: 'dGVzdA==',
      }),
    ).not.toThrow();
    expect(() =>
      assignmentSchema.parse({
        classId: 'bad',
        subjectId: id,
        title: 'Task',
        instructions: 'Do it',
        dueAt: new Date(),
      }),
    ).toThrow();
  });

  it('does not accept a student id in a submission payload', () => {
    const parsed = submissionSchema.parse({ content: 'answer', completed: true });
    expect(parsed).not.toHaveProperty('studentId');
  });
});
