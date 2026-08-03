import { Global, Module } from '@nestjs/common';
import { EVENT_PUBLISHER } from '../communications/notification-events';
import { AuthModule } from '../auth/auth.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationWorkerService } from './notification-worker.service';
import { QueueNotificationPublisher } from './notification.publisher';
import {
  EMAIL_ADAPTER,
  InMemoryNotificationMetrics,
  NoopEmailAdapter,
  NOTIFICATION_METRICS,
} from './notification.types';
@Global()
@Module({
  imports: [AuthModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationWorkerService,
    QueueNotificationPublisher,
    { provide: EVENT_PUBLISHER, useExisting: QueueNotificationPublisher },
    { provide: EMAIL_ADAPTER, useClass: NoopEmailAdapter },
    { provide: NOTIFICATION_METRICS, useClass: InMemoryNotificationMetrics },
  ],
  exports: [NotificationsService, NotificationWorkerService, EVENT_PUBLISHER],
})
export class NotificationsModule {}
