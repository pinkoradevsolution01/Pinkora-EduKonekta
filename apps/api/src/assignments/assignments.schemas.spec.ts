import { assignmentSchema, submissionSchema } from './assignments.schemas';

const id = '00000000-0000-0000-0000-000000000001';

describe('assignment validation schemas', () => {
  it('requires bounded assignment and attachment metadata', () => {
    expect(() =>
      assignmentSchema.parse({
        classId: id,
        subjectId: id,
        title: 'Task',
        instructions: 'Do it',
        dueAt: new Date(),
        attachment: {
          name: 'bad.exe',
          mime: 'application/x-msdownload',
          size: 1,
          storageKey: 'private/task',
        },
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
