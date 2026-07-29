import { Injectable, LoggerService } from '@nestjs/common';
import pino, { Logger } from 'pino';

@Injectable()
export class StructuredLogger implements LoggerService {
  private readonly logger: Logger = pino({
    level: process.env.LOG_LEVEL ?? 'info',
    base: { service: 'pinkora-edukonekta-api' },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  private message(value: unknown): string {
    return typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value));
  }

  log(message: unknown, context?: string): void {
    this.logger.info({ context }, this.message(message));
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, this.message(message));
  }

  warn(message: unknown, context?: string): void {
    this.logger.warn({ context }, this.message(message));
  }

  debug(message: unknown, context?: string): void {
    this.logger.debug({ context }, this.message(message));
  }

  verbose(message: unknown, context?: string): void {
    this.logger.trace({ context }, this.message(message));
  }
}
