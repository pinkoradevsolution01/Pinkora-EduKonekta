import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { EVENT_PUBLISHER, InMemoryNotificationPublisher } from '../communications/notification-events';
import { SafetyController } from './safety.controller';
import { SafetyService } from './safety.service';
@Module({
  imports: [AuthModule],
  controllers: [SafetyController],
  providers: [SafetyService, InMemoryNotificationPublisher, { provide: EVENT_PUBLISHER, useExisting: InMemoryNotificationPublisher }],
})
export class SafetyModule {}
