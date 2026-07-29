export type DomainEvent<TPayload = unknown> = {
  id: string;
  type: string;
  version: number;
  occurredAt: string;
  aggregateId: string;
  schoolId: string;
  payload: TPayload;
};

export type NotificationJob<TPayload = unknown> = {
  id: string;
  eventId: string;
  type: string;
  schoolId: string;
  payload: TPayload;
  attempts: number;
  availableAt: string;
};

export interface EventPublisher {
  publish<TPayload>(event: DomainEvent<TPayload>): Promise<void>;
}

export interface JobDispatcher {
  enqueue<TPayload>(job: NotificationJob<TPayload>): Promise<void>;
}

export const NotificationEventType = {
  ANNOUNCEMENT_PUBLISHED: 'announcement.published',
  CALENDAR_EVENT_CREATED: 'calendar.event.created',
} as const;
