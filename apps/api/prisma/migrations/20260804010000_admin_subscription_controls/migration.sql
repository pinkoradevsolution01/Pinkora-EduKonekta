CREATE TYPE "SubscriptionPlan" AS ENUM ('TRIAL', 'BASIC', 'STANDARD', 'PREMIUM');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CANCELLED');

ALTER TABLE "schools"
  ADD COLUMN "subscription_plan" "SubscriptionPlan" NOT NULL DEFAULT 'TRIAL',
  ADD COLUMN "subscription_status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE';

CREATE INDEX "schools_subscription_status_idx" ON "schools"("subscription_status");
