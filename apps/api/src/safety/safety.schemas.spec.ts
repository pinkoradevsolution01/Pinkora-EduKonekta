import { createSafetyReportSchema } from './safety.schemas';

describe('safety report validation', () => {
  it('accepts a factual confidential report', () => {
    expect(
      createSafetyReportSchema.parse({
        category: 'BULLYING',
        incidentDate: '2026-07-29',
        description: 'I observed repeated unkind messages in the class group.',
      }),
    ).toMatchObject({ category: 'BULLYING' });
  });
  it('only permits safe evidence metadata', () => {
    expect(() =>
      createSafetyReportSchema.parse({
        category: 'OTHER',
        incidentDate: '2026-07-29',
        description: 'A sufficiently detailed factual description.',
        evidence: {
          name: 'unsafe.exe',
          mime: 'application/x-msdownload',
          size: 2,
          storageKey: 'x',
        },
      }),
    ).toThrow();
  });
});
