import { loginSchema } from './auth.schemas';

describe('authentication request validation', () => {
  it('does not accept a client-provided role as part of the login authority', () => {
    const input = loginSchema.parse({
      email: 'teacher@example.test',
      password: 'CorrectHorseBatteryStaple!',
      roles: ['PLATFORM_ADMIN'],
      role: 'PLATFORM_ADMIN',
    });
    expect(input).toEqual({
      email: 'teacher@example.test',
      password: 'CorrectHorseBatteryStaple!',
    });
  });

  it('requires a valid identity and a strong password', () => {
    expect(() => loginSchema.parse({ email: 'not-an-email', password: 'short' })).toThrow();
  });
});
