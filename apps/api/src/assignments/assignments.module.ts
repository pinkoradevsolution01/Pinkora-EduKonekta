import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ASSIGNMENT_FILE_STORE, LocalAssignmentFileStore } from './assignment-file-store';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    LocalAssignmentFileStore,
    { provide: ASSIGNMENT_FILE_STORE, useExisting: LocalAssignmentFileStore },
  ],
  exports: [ASSIGNMENT_FILE_STORE],
})
export class AssignmentsModule {}
