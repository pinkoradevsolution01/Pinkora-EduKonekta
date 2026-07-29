import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ParentDashboardController } from './parent-dashboard.controller';
import { ParentDashboardService } from './parent-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [ParentDashboardController],
  providers: [ParentDashboardService],
})
export class DashboardModule {}
