-- Assignments and student submissions module
CREATE TYPE "AssignmentState" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TABLE "assignments" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "subject_id" UUID NOT NULL,
    "created_by_user_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "instructions" TEXT NOT NULL,
    "state" "AssignmentState" NOT NULL DEFAULT 'DRAFT',
    "due_at" TIMESTAMPTZ(3) NOT NULL,
    "attachment_name" VARCHAR(255),
    "attachment_mime" VARCHAR(100),
    "attachment_size" INTEGER,
    "attachment_storage_key" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "assignment_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "content" TEXT,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(3),
    "feedback" TEXT,
    "feedback_by_user_id" UUID,
    "feedback_at" TIMESTAMPTZ(3),
    "attachment_name" VARCHAR(255),
    "attachment_mime" VARCHAR(100),
    "attachment_size" INTEGER,
    "attachment_storage_key" VARCHAR(500),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "submissions_school_id_assignment_id_student_id_key" ON "submissions"("school_id", "assignment_id", "student_id");
CREATE INDEX "assignments_school_id_class_id_state_due_at_idx" ON "assignments"("school_id", "class_id", "state", "due_at");
CREATE INDEX "assignments_school_id_subject_id_state_idx" ON "assignments"("school_id", "subject_id", "state");
CREATE INDEX "assignments_school_id_created_by_user_id_idx" ON "assignments"("school_id", "created_by_user_id");
CREATE INDEX "submissions_school_id_assignment_id_submitted_at_idx" ON "submissions"("school_id", "assignment_id", "submitted_at");
CREATE INDEX "submissions_school_id_student_id_submitted_at_idx" ON "submissions"("school_id", "student_id", "submitted_at");

ALTER TABLE "assignments" ADD CONSTRAINT "assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_assignment_id_fkey" FOREIGN KEY ("assignment_id") REFERENCES "assignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_feedback_by_user_id_fkey" FOREIGN KEY ("feedback_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
