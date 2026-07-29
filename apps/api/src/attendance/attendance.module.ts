import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import {
  EVENT_PUBLISHER,
  InMemoryNotificationPublisher,
} from '../communications/notification-events';

@Module({
  imports: [AuthModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    InMemoryNotificationPublisher,
    { provide: EVENT_PUBLISHER, useExisting: InMemoryNotificationPublisher },
  ],
})
export class AttendanceModule {}
