CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE "ParentLinkStatus" AS ENUM ('PENDING', 'APPROVED', 'REVOKED');

CREATE TABLE "school_years" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "name" VARCHAR(100) NOT NULL,
  "starts_on" DATE NOT NULL, "ends_on" DATE NOT NULL, "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "school_years_pkey" PRIMARY KEY ("id"), CONSTRAINT "school_years_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "school_years_school_id_name_key" ON "school_years"("school_id", "name");
CREATE INDEX "school_years_school_id_is_active_idx" ON "school_years"("school_id", "is_active");

CREATE TABLE "classes" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "school_year_id" UUID NOT NULL, "name" VARCHAR(150) NOT NULL,
  "grade_level" VARCHAR(50), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "classes_pkey" PRIMARY KEY ("id"), CONSTRAINT "classes_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "classes_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "classes_school_id_school_year_id_name_key" ON "classes"("school_id", "school_year_id", "name");
CREATE INDEX "classes_school_id_idx" ON "classes"("school_id"); CREATE INDEX "classes_school_id_school_year_id_idx" ON "classes"("school_id", "school_year_id");

CREATE TABLE "subjects" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "code" VARCHAR(50) NOT NULL, "name" VARCHAR(150) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "subjects_pkey" PRIMARY KEY ("id"), CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "subjects_school_id_code_key" ON "subjects"("school_id", "code"); CREATE INDEX "subjects_school_id_name_idx" ON "subjects"("school_id", "name");

CREATE TABLE "student_profiles" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "user_id" UUID NOT NULL, "student_number" VARCHAR(100),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id"), CONSTRAINT "student_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "student_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "student_profiles_school_id_student_number_key" ON "student_profiles"("school_id", "student_number"); CREATE INDEX "student_profiles_school_id_idx" ON "student_profiles"("school_id");

CREATE TABLE "teacher_profiles" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "user_id" UUID NOT NULL, "employee_number" VARCHAR(100),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "teacher_profiles_pkey" PRIMARY KEY ("id"), CONSTRAINT "teacher_profiles_user_id_key" UNIQUE ("user_id"),
  CONSTRAINT "teacher_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "teacher_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "teacher_profiles_school_id_employee_number_key" ON "teacher_profiles"("school_id", "employee_number"); CREATE INDEX "teacher_profiles_school_id_idx" ON "teacher_profiles"("school_id");

CREATE TABLE "parent_profiles" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "user_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "parent_profiles_pkey" PRIMARY KEY ("id"), CONSTRAINT "parent_profiles_school_id_user_id_key" UNIQUE ("school_id", "user_id"),
  CONSTRAINT "parent_profiles_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "parent_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "parent_profiles_school_id_idx" ON "parent_profiles"("school_id");

CREATE TABLE "enrollments" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "school_year_id" UUID NOT NULL, "class_id" UUID NOT NULL, "student_id" UUID NOT NULL,
  "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE', "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id"), CONSTRAINT "enrollments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "enrollments_school_year_id_fkey" FOREIGN KEY ("school_year_id") REFERENCES "school_years"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "enrollments_school_id_school_year_id_student_id_key" ON "enrollments"("school_id", "school_year_id", "student_id"); CREATE INDEX "enrollments_school_id_class_id_idx" ON "enrollments"("school_id", "class_id"); CREATE INDEX "enrollments_school_id_student_id_idx" ON "enrollments"("school_id", "student_id");

CREATE TABLE "teacher_assignments" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "class_id" UUID NOT NULL, "subject_id" UUID NOT NULL, "teacher_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "teacher_assignments_pkey" PRIMARY KEY ("id"), CONSTRAINT "teacher_assignments_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "teacher_assignments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "teacher_assignments_subject_id_fkey" FOREIGN KEY ("subject_id") REFERENCES "subjects"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "teacher_assignments_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teacher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "teacher_assignments_school_id_class_id_subject_id_teacher_id_key" ON "teacher_assignments"("school_id", "class_id", "subject_id", "teacher_id"); CREATE INDEX "teacher_assignments_school_id_teacher_id_idx" ON "teacher_assignments"("school_id", "teacher_id"); CREATE INDEX "teacher_assignments_school_id_class_id_idx" ON "teacher_assignments"("school_id", "class_id");

CREATE TABLE "parent_student_links" (
  "id" UUID NOT NULL, "school_id" UUID NOT NULL, "parent_id" UUID NOT NULL, "student_id" UUID NOT NULL, "status" "ParentLinkStatus" NOT NULL DEFAULT 'PENDING',
  "approved_by_user_id" UUID, "approved_at" TIMESTAMPTZ(3), "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "parent_student_links_pkey" PRIMARY KEY ("id"), CONSTRAINT "parent_student_links_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "parent_student_links_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "parent_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "parent_student_links_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT "parent_student_links_approved_by_user_id_fkey" FOREIGN KEY ("approved_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "parent_student_links_school_id_parent_id_student_id_key" ON "parent_student_links"("school_id", "parent_id", "student_id"); CREATE INDEX "parent_student_links_school_id_parent_id_status_idx" ON "parent_student_links"("school_id", "parent_id", "status"); CREATE INDEX "parent_student_links_school_id_student_id_status_idx" ON "parent_student_links"("school_id", "student_id", "status");
