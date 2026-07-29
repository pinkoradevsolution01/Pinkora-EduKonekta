CREATE TYPE "SafetyReportStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'FOLLOW_UP', 'CLOSED');

CREATE TABLE "safeguarding_accesses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "safeguarding_accesses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safeguarding_accesses_school_id_user_id_key" UNIQUE ("school_id", "user_id"),
  CONSTRAINT "safeguarding_accesses_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  CONSTRAINT "safeguarding_accesses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "safeguarding_accesses_school_id_is_active_idx" ON "safeguarding_accesses"("school_id", "is_active");

CREATE TABLE "safety_reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "reporter_user_id" UUID NOT NULL,
  "category" VARCHAR(100) NOT NULL,
  "incident_date" DATE NOT NULL,
  "location" VARCHAR(300),
  "description_encrypted" TEXT NOT NULL,
  "protected_identity_encrypted" TEXT NOT NULL,
  "evidence_encrypted" TEXT,
  "duplicate_fingerprint" VARCHAR(128) NOT NULL,
  "duplicate_candidate_count" INTEGER NOT NULL DEFAULT 0,
  "abuse_indicator" BOOLEAN NOT NULL DEFAULT false,
  "status" "SafetyReportStatus" NOT NULL DEFAULT 'SUBMITTED',
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "safety_reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_reports_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  CONSTRAINT "safety_reports_reporter_user_id_fkey" FOREIGN KEY ("reporter_user_id") REFERENCES "users"("id") ON DELETE RESTRICT
);
CREATE INDEX "safety_reports_school_id_status_created_at_idx" ON "safety_reports"("school_id", "status", "created_at");
CREATE INDEX "safety_reports_school_id_reporter_user_id_created_at_idx" ON "safety_reports"("school_id", "reporter_user_id", "created_at");
CREATE INDEX "safety_reports_school_id_duplicate_fingerprint_idx" ON "safety_reports"("school_id", "duplicate_fingerprint");

CREATE TABLE "safety_report_updates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "school_id" UUID NOT NULL,
  "report_id" UUID NOT NULL,
  "status" "SafetyReportStatus" NOT NULL,
  "reporter_note" VARCHAR(1000),
  "created_by_user_id" UUID,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "safety_report_updates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "safety_report_updates_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE,
  CONSTRAINT "safety_report_updates_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "safety_reports"("id") ON DELETE CASCADE,
  CONSTRAINT "safety_report_updates_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX "safety_report_updates_school_id_report_id_created_at_idx" ON "safety_report_updates"("school_id", "report_id", "created_at");
