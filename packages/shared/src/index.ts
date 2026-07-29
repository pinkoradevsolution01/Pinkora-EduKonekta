export type HealthResponse = {
  status: 'ok' | 'degraded';
  service: 'api';
  version: string;
  database: 'up' | 'down';
  timestamp: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
    requestId: string;
    timestamp: string;
    path: string;
  };
};

export { NotificationEventType } from './events';
export type { DomainEvent, EventPublisher, JobDispatcher, NotificationJob } from './events';
