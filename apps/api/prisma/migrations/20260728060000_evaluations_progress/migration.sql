CREATE TYPE "EvaluationKind" AS ENUM ('ACADEMIC_PROGRESS', 'BEHAVIOR_OBSERVATION', 'POSITIVE_ACHIEVEMENT', 'TEACHER_FEEDBACK', 'INTERNAL_SAFEGUARDING');
CREATE TYPE "EvaluationVisibility" AS ENUM ('PARENT_VISIBLE', 'INTERNAL_ONLY');

CREATE TABLE "evaluation_notes" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "kind" "EvaluationKind" NOT NULL,
    "visibility" "EvaluationVisibility" NOT NULL DEFAULT 'PARENT_VISIBLE',
    "content" TEXT NOT NULL,
    "observed_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluation_notes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_acknowledgements" (
    "id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "acknowledged_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluation_acknowledgements_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evaluation_histories" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "evaluation_id" UUID NOT NULL,
    "edited_by_user_id" UUID NOT NULL,
    "previous_kind" "EvaluationKind" NOT NULL,
    "previous_visibility" "EvaluationVisibility" NOT NULL,
    "previous_content" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evaluation_histories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "evaluation_notes_school_id_student_id_observed_at_idx" ON "evaluation_notes"("school_id", "student_id", "observed_at");
CREATE INDEX "evaluation_notes_school_id_visibility_observed_at_idx" ON "evaluation_notes"("school_id", "visibility", "observed_at");
CREATE INDEX "evaluation_notes_school_id_author_user_id_created_at_idx" ON "evaluation_notes"("school_id", "author_user_id", "created_at");
CREATE UNIQUE INDEX "evaluation_acknowledgements_evaluation_id_user_id_key" ON "evaluation_acknowledgements"("evaluation_id", "user_id");
CREATE INDEX "evaluation_acknowledgements_user_id_acknowledged_at_idx" ON "evaluation_acknowledgements"("user_id", "acknowledged_at");
CREATE INDEX "evaluation_histories_school_id_evaluation_id_created_at_idx" ON "evaluation_histories"("school_id", "evaluation_id", "created_at");
CREATE INDEX "evaluation_histories_school_id_edited_by_user_id_created_at_idx" ON "evaluation_histories"("school_id", "edited_by_user_id", "created_at");

ALTER TABLE "evaluation_notes" ADD CONSTRAINT "evaluation_notes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_notes" ADD CONSTRAINT "evaluation_notes_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_notes" ADD CONSTRAINT "evaluation_notes_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "evaluation_acknowledgements" ADD CONSTRAINT "evaluation_acknowledgements_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluation_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_acknowledgements" ADD CONSTRAINT "evaluation_acknowledgements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_histories" ADD CONSTRAINT "evaluation_histories_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_histories" ADD CONSTRAINT "evaluation_histories_evaluation_id_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "evaluation_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_histories" ADD CONSTRAINT "evaluation_histories_edited_by_user_id_fkey" FOREIGN KEY ("edited_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
