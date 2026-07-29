import { HttpException } from '@nestjs/common';
import { AuthRateLimiter } from './rate-limiter';

describe('AuthRateLimiter', () => {
  it('blocks the sixth attempt in a window', () => {
    const limiter = new AuthRateLimiter();
    for (let attempt = 0; attempt < 5; attempt += 1) limiter.check('login', 'user@example.test');
    expect(() => limiter.check('login', 'user@example.test')).toThrow(HttpException);
  });

  it('clears successful login attempts', () => {
    const limiter = new AuthRateLimiter();
    for (let attempt = 0; attempt < 5; attempt += 1) limiter.check('login', 'user@example.test');
    limiter.clear('login', 'user@example.test');
    expect(() => limiter.check('login', 'user@example.test')).not.toThrow();
  });
});
