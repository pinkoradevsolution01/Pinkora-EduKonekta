import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParentDashboardController } from './parent-dashboard.controller';
import { ParentDashboardService } from './parent-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { SchoolReportsController } from './school-reports.controller';
import { SchoolReportsService } from './school-reports.service';

@Module({
  imports: [AuthModule],
  controllers: [ParentDashboardController, AdminDashboardController, SchoolReportsController],
  providers: [ParentDashboardService, AdminDashboardService, SchoolReportsService],
})
export class DashboardModule {}
