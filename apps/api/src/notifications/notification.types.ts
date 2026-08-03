/** The contract used by the worker. Adapters must never receive protected case content. */
export type NotificationChannelName = 'IN_APP' | 'EMAIL';

export type SafeNotification = {
  eventType: string;
  title: string;
  body: string;
  link?: string;
  confidential?: boolean;
};

export interface EmailAdapter {
  send(input: { to: string; subject: string; text: string; idempotencyKey: string }): Promise<void>;
}

export interface NotificationMetrics {
  increment(name: string, tags?: Record<string, string>): void;
  gauge(name: string, value: number): void;
}

export const EMAIL_ADAPTER = 'NOTIFICATION_EMAIL_ADAPTER';
export const NOTIFICATION_METRICS = 'NOTIFICATION_METRICS';

export class NoopEmailAdapter implements EmailAdapter {
  async send(): Promise<void> {
    // Deliberately does nothing until a transactional email provider is configured.
  }
}

export class InMemoryNotificationMetrics implements NotificationMetrics {
  readonly counters = new Map<string, number>();
  readonly gauges = new Map<string, number>();
  increment(name: string, tags: Record<string, string> = {}) {
    const key = `${name}:${JSON.stringify(tags)}`;
    this.counters.set(key, (this.counters.get(key) ?? 0) + 1);
  }
  gauge(name: string, value: number) { this.gauges.set(name, value); }
}
