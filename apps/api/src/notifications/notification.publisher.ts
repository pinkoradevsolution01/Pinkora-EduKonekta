import { Injectable } from '@nestjs/common';
import { DomainEvent, EventPublisher } from '../communications/notification-events';
import { NotificationWorkerService } from './notification-worker.service';

/** Queue-backed domain-event adapter. Publishing is quick; delivery happens in the worker. */
@Injectable()
export class QueueNotificationPublisher implements EventPublisher {
  constructor(private readonly notifications: NotificationWorkerService) {}
  publish<T>(event: DomainEvent<T>) { return this.notifications.enqueueEvent(event); }
}
