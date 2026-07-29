CREATE TYPE "AttendanceState" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

CREATE TABLE "attendance_records" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "class_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "attendance_date" DATE NOT NULL,
    "state" "AttendanceState" NOT NULL,
    "notes" TEXT,
    "recorded_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_corrections" (
    "id" UUID NOT NULL,
    "school_id" UUID NOT NULL,
    "attendance_id" UUID NOT NULL,
    "previous_state" "AttendanceState" NOT NULL,
    "previous_notes" TEXT,
    "new_state" "AttendanceState" NOT NULL,
    "new_notes" TEXT,
    "reason" TEXT NOT NULL,
    "corrected_by_user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "attendance_corrections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_records_school_id_class_id_student_id_attendance_date_key" ON "attendance_records"("school_id", "class_id", "student_id", "attendance_date");
CREATE INDEX "attendance_records_school_id_class_id_attendance_date_idx" ON "attendance_records"("school_id", "class_id", "attendance_date");
CREATE INDEX "attendance_records_school_id_student_id_attendance_date_idx" ON "attendance_records"("school_id", "student_id", "attendance_date");
CREATE INDEX "attendance_records_school_id_state_attendance_date_idx" ON "attendance_records"("school_id", "state", "attendance_date");
CREATE INDEX "attendance_corrections_school_id_attendance_id_created_at_idx" ON "attendance_corrections"("school_id", "attendance_id", "created_at");
CREATE INDEX "attendance_corrections_school_id_corrected_by_user_id_created_at_idx" ON "attendance_corrections"("school_id", "corrected_by_user_id", "created_at");

ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_recorded_by_user_id_fkey" FOREIGN KEY ("recorded_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "attendance_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "attendance_corrections" ADD CONSTRAINT "attendance_corrections_corrected_by_user_id_fkey" FOREIGN KEY ("corrected_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
