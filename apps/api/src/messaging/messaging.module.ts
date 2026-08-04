import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AssignmentsModule } from '../assignments/assignments.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
@Module({
  imports: [AuthModule, NotificationsModule, AssignmentsModule],
  controllers: [MessagingController],
  providers: [MessagingService],
})
export class MessagingModule {}
