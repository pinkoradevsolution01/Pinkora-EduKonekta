import { signAttachment, verifyAttachment } from './assignments.events';

describe('assignment signed attachments', () => {
  const expiresAt = new Date(Date.now() + 60_000);

  it('verifies a token only for its tenant and resource', () => {
    const token = signAttachment('submission', 'submission-1', 'school-a', expiresAt);
    expect(verifyAttachment(token, 'submission', 'submission-1', 'school-a')).toBe(true);
    expect(verifyAttachment(token, 'submission', 'submission-1', 'school-b')).toBe(false);
    expect(verifyAttachment(token, 'assignment', 'submission-1', 'school-a')).toBe(false);
  });

  it('rejects expired tokens', () => {
    const token = signAttachment(
      'assignment',
      'assignment-1',
      'school-a',
      new Date(Date.now() - 1),
    );
    expect(verifyAttachment(token, 'assignment', 'assignment-1', 'school-a')).toBe(false);
  });
});
