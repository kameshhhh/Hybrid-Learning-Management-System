-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'faculty', 'student');

-- CreateEnum
CREATE TYPE "SkillStatus" AS ENUM ('draft', 'pending_approval', 'approved', 'rejected', 'active', 'archived');

-- CreateEnum
CREATE TYPE "ChapterStatus" AS ENUM ('draft', 'pending_approval', 'approved');

-- CreateEnum
CREATE TYPE "LessonStatus" AS ENUM ('draft', 'pending_approval', 'approved');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('draft', 'pending_approval', 'approved');

-- CreateEnum
CREATE TYPE "StudentSkillStatus" AS ENUM ('active', 'dropped', 'completed');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('file', 'text', 'both');

-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('team', 'college', 'batch', 'class');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('info', 'success', 'warning', 'error');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "block_reason" TEXT,
    "blocked_at" TIMESTAMP(3),
    "blocked_by" TEXT,
    "is_logged_in" BOOLEAN NOT NULL DEFAULT false,
    "current_session_id" TEXT,
    "last_login_at" TIMESTAMP(3),
    "last_login_ip" TEXT,
    "last_login_device" TEXT,
    "password_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "password_reset_token" TEXT,
    "password_reset_expires" TIMESTAMP(3),
    "failed_login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "skill_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_weeks" INTEGER NOT NULL,
    "total_tasks" INTEGER NOT NULL DEFAULT 0,
    "total_chapters" INTEGER NOT NULL DEFAULT 0,
    "total_lessons" INTEGER NOT NULL DEFAULT 0,
    "status" "SkillStatus" NOT NULL DEFAULT 'draft',
    "rejection_reason" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "thumbnail_url" TEXT,
    "cover_image_url" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_faculty" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "faculty_id" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "removed_at" TIMESTAMP(3),
    "removed_by" TEXT,
    "removal_reason" TEXT,

    CONSTRAINT "skill_faculty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_chapters" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "chapter_number" INTEGER NOT NULL,
    "status" "ChapterStatus" NOT NULL DEFAULT 'draft',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_lessons" (
    "id" TEXT NOT NULL,
    "chapter_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lesson_number" INTEGER NOT NULL,
    "video_url" TEXT,
    "video_duration" INTEGER,
    "video_size" BIGINT,
    "video_format" TEXT,
    "video_resolution" TEXT,
    "video_thumbnail" TEXT,
    "pdf_url" TEXT,
    "pdf_size" BIGINT,
    "attachment_urls" JSONB,
    "is_video_validated" BOOLEAN NOT NULL DEFAULT false,
    "video_validation_message" TEXT,
    "video_validated_at" TIMESTAMP(3),
    "video_validated_by" TEXT,
    "status" "LessonStatus" NOT NULL DEFAULT 'draft',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_tasks" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "task_number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "max_marks" INTEGER NOT NULL DEFAULT 10,
    "passing_marks" INTEGER NOT NULL DEFAULT 5,
    "rubric" JSONB NOT NULL DEFAULT '[]',
    "submission_type" "SubmissionType" NOT NULL DEFAULT 'file',
    "allowed_file_types" JSONB NOT NULL DEFAULT '["pdf", "doc", "docx", "zip"]',
    "max_file_size" INTEGER NOT NULL DEFAULT 10485760,
    "deadline_days" INTEGER NOT NULL DEFAULT 1,
    "status" "TaskStatus" NOT NULL DEFAULT 'draft',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_skills" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "group_id" TEXT,
    "status" "StudentSkillStatus" NOT NULL DEFAULT 'active',
    "dropped_at" TIMESTAMP(3),
    "drop_reason" TEXT,
    "total_tasks_completed" INTEGER NOT NULL DEFAULT 0,
    "total_marks_obtained" INTEGER NOT NULL DEFAULT 0,
    "progress_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "certificate_url" TEXT,

    CONSTRAINT "student_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_assessments" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "submission_text" TEXT,
    "submission_file_url" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "marks_obtained" DECIMAL(5,2),
    "rubric_scores" JSONB,
    "faculty_feedback" TEXT,
    "assessed_by" TEXT,
    "assessed_at" TIMESTAMP(3),
    "is_late" BOOLEAN NOT NULL DEFAULT false,
    "is_resubmitted" BOOLEAN NOT NULL DEFAULT false,
    "previous_submission_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_progress_logs" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "week_number" INTEGER NOT NULL,
    "log_date" TIMESTAMP(3) NOT NULL,
    "work_done" TEXT,
    "challenges_faced" TEXT,
    "next_plan" TEXT,
    "faculty_remarks" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "is_approved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_progress_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_lesson_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "video_watched_percentage" INTEGER NOT NULL DEFAULT 0,
    "last_watch_position" INTEGER NOT NULL DEFAULT 0,
    "is_video_completed" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMP(3),
    "first_watched_at" TIMESTAMP(3),
    "last_watched_at" TIMESTAMP(3),
    "total_watch_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_certificates" (
    "id" TEXT NOT NULL,
    "certificate_number" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "grade" TEXT,
    "total_marks_obtained" INTEGER,
    "total_marks_possible" INTEGER,
    "percentage" DECIMAL(5,2),
    "pdf_url" TEXT NOT NULL,
    "qr_code_url" TEXT,
    "qr_code_data" TEXT,
    "verification_code" TEXT NOT NULL,
    "is_verified" BOOLEAN NOT NULL DEFAULT true,
    "verified_count" INTEGER NOT NULL DEFAULT 0,
    "generated_by" TEXT,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "group_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GroupType" NOT NULL,
    "description" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_group_assignments" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skill_group_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "device_info" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "ip_address" TEXT,
    "location" TEXT,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_time" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "forced_logout_by" TEXT,
    "forced_logout_reason" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT,
    "old_values" JSONB,
    "new_values" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'info',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "action_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_is_active_idx" ON "users"("is_active");

-- CreateIndex
CREATE INDEX "users_is_logged_in_idx" ON "users"("is_logged_in");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "skills_skill_code_key" ON "skills"("skill_code");

-- CreateIndex
CREATE INDEX "skills_status_idx" ON "skills"("status");

-- CreateIndex
CREATE INDEX "skills_skill_code_idx" ON "skills"("skill_code");

-- CreateIndex
CREATE INDEX "skills_created_by_idx" ON "skills"("created_by");

-- CreateIndex
CREATE INDEX "skill_faculty_skill_id_idx" ON "skill_faculty"("skill_id");

-- CreateIndex
CREATE INDEX "skill_faculty_faculty_id_idx" ON "skill_faculty"("faculty_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_faculty_skill_id_faculty_id_key" ON "skill_faculty"("skill_id", "faculty_id");

-- CreateIndex
CREATE INDEX "skill_chapters_skill_id_idx" ON "skill_chapters"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_chapters_skill_id_chapter_number_key" ON "skill_chapters"("skill_id", "chapter_number");

-- CreateIndex
CREATE INDEX "skill_lessons_chapter_id_idx" ON "skill_lessons"("chapter_id");

-- CreateIndex
CREATE INDEX "skill_lessons_status_idx" ON "skill_lessons"("status");

-- CreateIndex
CREATE UNIQUE INDEX "skill_lessons_chapter_id_lesson_number_key" ON "skill_lessons"("chapter_id", "lesson_number");

-- CreateIndex
CREATE INDEX "skill_tasks_skill_id_idx" ON "skill_tasks"("skill_id");

-- CreateIndex
CREATE INDEX "skill_tasks_task_number_idx" ON "skill_tasks"("task_number");

-- CreateIndex
CREATE INDEX "student_skills_student_id_idx" ON "student_skills"("student_id");

-- CreateIndex
CREATE INDEX "student_skills_skill_id_idx" ON "student_skills"("skill_id");

-- CreateIndex
CREATE INDEX "student_skills_status_idx" ON "student_skills"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_skills_student_id_skill_id_key" ON "student_skills"("student_id", "skill_id");

-- CreateIndex
CREATE INDEX "daily_assessments_student_id_idx" ON "daily_assessments"("student_id");

-- CreateIndex
CREATE INDEX "daily_assessments_task_id_idx" ON "daily_assessments"("task_id");

-- CreateIndex
CREATE INDEX "daily_assessments_assessed_by_idx" ON "daily_assessments"("assessed_by");

-- CreateIndex
CREATE UNIQUE INDEX "daily_assessments_student_id_task_id_key" ON "daily_assessments"("student_id", "task_id");

-- CreateIndex
CREATE INDEX "skill_progress_logs_student_id_idx" ON "skill_progress_logs"("student_id");

-- CreateIndex
CREATE INDEX "skill_progress_logs_skill_id_idx" ON "skill_progress_logs"("skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_progress_logs_student_id_skill_id_week_number_key" ON "skill_progress_logs"("student_id", "skill_id", "week_number");

-- CreateIndex
CREATE INDEX "skill_lesson_progress_student_id_idx" ON "skill_lesson_progress"("student_id");

-- CreateIndex
CREATE INDEX "skill_lesson_progress_lesson_id_idx" ON "skill_lesson_progress"("lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_lesson_progress_student_id_lesson_id_key" ON "skill_lesson_progress"("student_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_certificates_certificate_number_key" ON "skill_certificates"("certificate_number");

-- CreateIndex
CREATE UNIQUE INDEX "skill_certificates_verification_code_key" ON "skill_certificates"("verification_code");

-- CreateIndex
CREATE INDEX "skill_certificates_student_id_idx" ON "skill_certificates"("student_id");

-- CreateIndex
CREATE INDEX "skill_certificates_verification_code_idx" ON "skill_certificates"("verification_code");

-- CreateIndex
CREATE UNIQUE INDEX "skill_certificates_student_id_skill_id_key" ON "skill_certificates"("student_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "groups_group_code_key" ON "groups"("group_code");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_group_id_student_id_key" ON "group_members"("group_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_group_assignments_skill_id_group_id_key" ON "skill_group_assignments"("skill_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "sessions_session_token_idx" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_is_active_idx" ON "sessions"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_user_id_session_token_key" ON "sessions"("user_id", "session_token");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_idx" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "notifications_is_read_idx" ON "notifications"("is_read");

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skills" ADD CONSTRAINT "skills_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_faculty" ADD CONSTRAINT "skill_faculty_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_faculty" ADD CONSTRAINT "skill_faculty_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_faculty" ADD CONSTRAINT "skill_faculty_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_faculty" ADD CONSTRAINT "skill_faculty_removed_by_fkey" FOREIGN KEY ("removed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_chapters" ADD CONSTRAINT "skill_chapters_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_chapters" ADD CONSTRAINT "skill_chapters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lessons" ADD CONSTRAINT "skill_lessons_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "skill_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lessons" ADD CONSTRAINT "skill_lessons_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lessons" ADD CONSTRAINT "skill_lessons_video_validated_by_fkey" FOREIGN KEY ("video_validated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tasks" ADD CONSTRAINT "skill_tasks_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tasks" ADD CONSTRAINT "skill_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_skills" ADD CONSTRAINT "student_skills_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assessments" ADD CONSTRAINT "daily_assessments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assessments" ADD CONSTRAINT "daily_assessments_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "skill_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assessments" ADD CONSTRAINT "daily_assessments_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_assessments" ADD CONSTRAINT "daily_assessments_assessed_by_fkey" FOREIGN KEY ("assessed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_progress_logs" ADD CONSTRAINT "skill_progress_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_progress_logs" ADD CONSTRAINT "skill_progress_logs_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_progress_logs" ADD CONSTRAINT "skill_progress_logs_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lesson_progress" ADD CONSTRAINT "skill_lesson_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lesson_progress" ADD CONSTRAINT "skill_lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "skill_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_lesson_progress" ADD CONSTRAINT "skill_lesson_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_certificates" ADD CONSTRAINT "skill_certificates_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_certificates" ADD CONSTRAINT "skill_certificates_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_certificates" ADD CONSTRAINT "skill_certificates_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_group_assignments" ADD CONSTRAINT "skill_group_assignments_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_group_assignments" ADD CONSTRAINT "skill_group_assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_group_assignments" ADD CONSTRAINT "skill_group_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_forced_logout_by_fkey" FOREIGN KEY ("forced_logout_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
