import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  EVENT_PUBLISHER,
  InMemoryNotificationPublisher,
} from '../communications/notification-events';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
@Module({
  imports: [AuthModule],
  controllers: [MessagingController],
  providers: [
    MessagingService,
    InMemoryNotificationPublisher,
    { provide: EVENT_PUBLISHER, useExisting: InMemoryNotificationPublisher },
  ],
})
export class MessagingModule {}
