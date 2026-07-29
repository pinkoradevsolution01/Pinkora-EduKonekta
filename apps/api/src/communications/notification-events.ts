import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
export type DomainEvent<TPayload = unknown> = {
  id: string;
  type: string;
  version: number;
  occurredAt: string;
  aggregateId: string;
  schoolId: string;
  payload: TPayload;
};
export interface EventPublisher {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}

@Injectable()
export class InMemoryNotificationPublisher implements EventPublisher {
  readonly events: DomainEvent[] = [];
  async publish<TPayload>(event: DomainEvent<TPayload>): Promise<void> {
    this.events.push(event as DomainEvent);
  }
}

export const EVENT_PUBLISHER = 'EVENT_PUBLISHER';
export const NotificationEventType = {
  ANNOUNCEMENT_PUBLISHED: 'announcement.published',
  CALENDAR_EVENT_CREATED: 'calendar.event.created',
} as const;
export function createEvent<TPayload>(
  type: string,
  aggregateId: string,
  schoolId: string,
  payload: TPayload,
): DomainEvent<TPayload> {
  return {
    id: randomUUID(),
    type,
    version: 1,
    occurredAt: new Date().toISOString(),
    aggregateId,
    schoolId,
    payload,
  };
}
