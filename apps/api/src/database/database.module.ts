import { Global, Module } from '@nestjs/common';
import { AuditLogRepository } from './repositories/audit-log.repository';
import { FeatureFlagRepository } from './repositories/feature-flag.repository';
import { InvitationRepository } from './repositories/invitation.repository';
import { SchoolMembershipRepository } from './repositories/school-membership.repository';

@Global()
@Module({
  providers: [
    AuditLogRepository,
    FeatureFlagRepository,
    InvitationRepository,
    SchoolMembershipRepository,
  ],
  exports: [
    AuditLogRepository,
    FeatureFlagRepository,
    InvitationRepository,
    SchoolMembershipRepository,
  ],
})
export class DatabaseModule {}
