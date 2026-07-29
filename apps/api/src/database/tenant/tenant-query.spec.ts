import { hashInvitationCode, invitationCodeMatches } from './invitation-code';
import { tenantWhere } from './tenant-query';

describe('tenant query helpers', () => {
  it('always applies the requested school boundary last', () => {
    expect(tenantWhere('school-a', { schoolId: 'school-b', status: 'ACTIVE' })).toEqual({
      schoolId: 'school-a',
      status: 'ACTIVE',
    });
  });

  it('rejects missing tenant context', () => {
    expect(() => tenantWhere('   ')).toThrow('schoolId is required');
  });
});

describe('invitation code hashing', () => {
  it('matches codes without storing or comparing plaintext values', () => {
    const hash = hashInvitationCode('one-time-code');
    expect(hash).not.toContain('one-time-code');
    expect(invitationCodeMatches('one-time-code', hash)).toBe(true);
    expect(invitationCodeMatches('wrong-code', hash)).toBe(false);
  });
});
