import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';

@Injectable()
export class AuthRateLimiter {
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  check(scope: 'login' | 'recovery', identity: string, limit = 5, windowMs = 15 * 60_000): void {
    const key = `${scope}:${createHash('sha256').update(identity.toLowerCase()).digest('hex')}`;
    const now = Date.now();
    const current = this.attempts.get(key);
    if (!current || current.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    if (current.count >= limit)
      throw new HttpException('Too many attempts. Try again later.', HttpStatus.TOO_MANY_REQUESTS);
    current.count += 1;
  }

  clear(scope: 'login' | 'recovery', identity: string): void {
    const key = `${scope}:${createHash('sha256').update(identity.toLowerCase()).digest('hex')}`;
    this.attempts.delete(key);
  }
}
