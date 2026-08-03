# Backup and restoration test

Run this test at least quarterly and after a database migration. It must use a non-production restore environment.

1. Record the PostgreSQL backup identifier, source timestamp, schema migration version, and operator in the audit runbook.
2. Restore the backup to an isolated database with a new hostname and credentials. Never point a restore test at the production database.
3. Run `prisma migrate status`, then start the API with the restored database and call `/api/v1/health`.
4. Verify counts for schools, active memberships, enrollments, attendance records, and audit logs against the backup manifest.
5. Sign in using a test account and confirm tenant isolation: requests with another school ID must return `403`.
6. Verify encrypted safety and guidance records are not decrypted without the original `SAFETY_ENCRYPTION_KEY`; do not copy protected content into the test record.
7. Record recovery time, recovery point, result, exceptions, and corrective actions. Destroy the isolated restore database after the review.

The production readiness review is blocked if the last restore test is older than 90 days or has an unresolved failure.
