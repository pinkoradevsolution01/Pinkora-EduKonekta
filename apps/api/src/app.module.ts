import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './common/config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { StructureModule } from './structure/structure.module';
import { CommunicationsModule } from './communications/communications.module';
import { AssignmentsModule } from './assignments/assignments.module';
import { AttendanceModule } from './attendance/attendance.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { EvaluationsModule } from './evaluations/evaluations.module';
import { MessagingModule } from './messaging/messaging.module';
import { SafetyModule } from './safety/safety.module';
import { GuidanceModule } from './guidance/guidance.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    DatabaseModule,
    AuthModule,
    StructureModule,
    CommunicationsModule,
    AssignmentsModule,
    AttendanceModule,
    DashboardModule,
    EvaluationsModule,
    MessagingModule,
    SafetyModule,
    GuidanceModule,
    NotificationsModule,
    HealthModule,
  ],
})
export class AppModule {}
