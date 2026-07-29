import { evaluationCreateSchema } from './evaluations.schemas';

const studentId = '11111111-1111-4111-8111-111111111111';

describe('evaluation validation', () => {
  it('accepts a neutral academic progress note', () => {
    expect(
      evaluationCreateSchema.parse({
        studentId,
        kind: 'ACADEMIC_PROGRESS',
        visibility: 'PARENT_VISIBLE',
        content:
          'The student completed the reading activity and asked for clarification when needed.',
      }),
    ).toMatchObject({ studentId, kind: 'ACADEMIC_PROGRESS' });
  });

  it('keeps safeguarding notes internal', () => {
    expect(() =>
      evaluationCreateSchema.parse({
        studentId,
        kind: 'INTERNAL_SAFEGUARDING',
        visibility: 'PARENT_VISIBLE',
        content: 'Staff recorded a factual observation for follow-up.',
      }),
    ).toThrow();
  });

  it('rejects diagnostic or punitive language', () => {
    expect(() =>
      evaluationCreateSchema.parse({
        studentId,
        kind: 'BEHAVIOR_OBSERVATION',
        visibility: 'INTERNAL_ONLY',
        content: 'The student should be punished and given a risk score.',
      }),
    ).toThrow();
  });
});
