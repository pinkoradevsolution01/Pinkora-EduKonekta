import { Module } from '@nestjs/common';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';
import { EVENT_PUBLISHER, InMemoryNotificationPublisher } from './notification-events';
import { AuthModule } from '../auth/auth.module';
@Module({
  imports: [AuthModule],
  controllers: [CommunicationsController],
  providers: [
    CommunicationsService,
    InMemoryNotificationPublisher,
    { provide: EVENT_PUBLISHER, useExisting: InMemoryNotificationPublisher },
  ],
})
export class CommunicationsModule {}
