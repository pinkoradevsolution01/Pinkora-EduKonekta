CREATE TYPE "AnnouncementState" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED', 'EXPIRED');
CREATE TYPE "AnnouncementAudience" AS ENUM ('SCHOOL', 'CLASS', 'TEACHERS', 'PARENTS', 'STUDENTS', 'GUIDANCE');

CREATE TABLE "announcements" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "author_user_id" UUID NOT NULL, "title" VARCHAR(200) NOT NULL, "body_html" TEXT NOT NULL,
  "state" "AnnouncementState" NOT NULL DEFAULT 'DRAFT', "publish_at" TIMESTAMPTZ(3), "expires_at" TIMESTAMPTZ(3),
  "attachment_name" VARCHAR(255), "attachment_mime" VARCHAR(100), "attachment_size" INTEGER, "attachment_url" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "announcements_pkey" PRIMARY KEY ("id"), CONSTRAINT "announcements_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "announcements_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "announcements_school_id_state_publish_at_expires_at_idx" ON "announcements"("school_id", "state", "publish_at", "expires_at"); CREATE INDEX "announcements_school_id_author_user_id_idx" ON "announcements"("school_id", "author_user_id");

CREATE TABLE "announcement_targets" (
  "id" UUID NOT NULL, "announcement_id" UUID NOT NULL, "audience" "AnnouncementAudience" NOT NULL, "class_id" UUID,
  CONSTRAINT "announcement_targets_pkey" PRIMARY KEY ("id"), CONSTRAINT "announcement_targets_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "announcement_targets_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "announcement_targets_announcement_id_audience_idx" ON "announcement_targets"("announcement_id", "audience"); CREATE INDEX "announcement_targets_class_id_idx" ON "announcement_targets"("class_id");

CREATE TABLE "announcement_reads" (
  "id" UUID NOT NULL, "announcement_id" UUID NOT NULL, "user_id" UUID NOT NULL, "read_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcement_reads_pkey" PRIMARY KEY ("id"), CONSTRAINT "announcement_reads_announcement_id_user_id_key" UNIQUE ("announcement_id", "user_id"), CONSTRAINT "announcement_reads_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "announcement_reads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "announcement_reads_user_id_read_at_idx" ON "announcement_reads"("user_id", "read_at");

CREATE TABLE "announcement_acknowledgements" (
  "id" UUID NOT NULL, "announcement_id" UUID NOT NULL, "user_id" UUID NOT NULL, "acknowledged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "announcement_acknowledgements_pkey" PRIMARY KEY ("id"), CONSTRAINT "announcement_acknowledgements_announcement_id_user_id_key" UNIQUE ("announcement_id", "user_id"), CONSTRAINT "announcement_acknowledgements_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "announcement_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "announcement_acknowledgements_user_id_acknowledged_at_idx" ON "announcement_acknowledgements"("user_id", "acknowledged_at");

CREATE TABLE "calendar_events" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "class_id" UUID, "created_by_user_id" UUID NOT NULL, "title" VARCHAR(200) NOT NULL, "description" TEXT, "starts_at" TIMESTAMPTZ(3) NOT NULL, "ends_at" TIMESTAMPTZ(3) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id"), CONSTRAINT "calendar_events_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "calendar_events_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "calendar_events_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "calendar_events_school_id_starts_at_ends_at_idx" ON "calendar_events"("school_id", "starts_at", "ends_at"); CREATE INDEX "calendar_events_school_id_class_id_starts_at_idx" ON "calendar_events"("school_id", "class_id", "starts_at");
