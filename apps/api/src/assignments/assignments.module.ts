import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import {
  EVENT_PUBLISHER,
  InMemoryNotificationPublisher,
} from '../communications/notification-events';

@Module({
  imports: [AuthModule],
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    InMemoryNotificationPublisher,
    { provide: EVENT_PUBLISHER, useExisting: InMemoryNotificationPublisher },
  ],
})
export class AssignmentsModule {}
