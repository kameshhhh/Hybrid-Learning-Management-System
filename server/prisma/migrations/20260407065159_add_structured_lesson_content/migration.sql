/*
  Warnings:

  - You are about to drop the column `new_values` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `old_values` on the `audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `rubric_scores` on the `daily_assessments` table. All the data in the column will be lost.
  - You are about to drop the column `device_type` on the `sessions` table. All the data in the column will be lost.
  - You are about to drop the column `chapter_number` on the `skill_chapters` table. All the data in the column will be lost.
  - You are about to drop the column `last_watch_position` on the `skill_lesson_progress` table. All the data in the column will be lost.
  - You are about to drop the column `attachment_urls` on the `skill_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `lesson_number` on the `skill_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `video_duration` on the `skill_lessons` table. All the data in the column will be lost.
  - You are about to drop the column `allowed_file_types` on the `skill_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `max_file_size` on the `skill_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `submission_type` on the `skill_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `task_number` on the `skill_tasks` table. All the data in the column will be lost.
  - You are about to drop the column `blocked_by` on the `users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[skill_id,order_index]` on the table `skill_chapters` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[chapter_id,order_index]` on the table `skill_lessons` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_index` to the `skill_chapters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `order_index` to the `skill_lessons` table without a default value. This is not possible if the table is not empty.
  - Added the required column `day_number` to the `skill_tasks` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "LessonContentType" AS ENUM ('OBJECTIVE', 'OUTCOME', 'MATERIAL', 'THEORY', 'SAFETY');

-- DropIndex
DROP INDEX "skill_chapters_skill_id_chapter_number_key";

-- DropIndex
DROP INDEX "skill_lessons_chapter_id_lesson_number_key";

-- DropIndex
DROP INDEX "skill_tasks_task_number_idx";

-- AlterTable
ALTER TABLE "audit_logs" DROP COLUMN "new_values",
DROP COLUMN "old_values",
ADD COLUMN     "newValues" JSONB,
ADD COLUMN     "oldValues" JSONB;

-- AlterTable
ALTER TABLE "daily_assessments" DROP COLUMN "rubric_scores",
ADD COLUMN     "rubricScores" JSONB;

-- AlterTable
ALTER TABLE "sessions" DROP COLUMN "device_type",
ADD COLUMN     "deviceType" TEXT;

-- AlterTable
ALTER TABLE "skill_chapters" DROP COLUMN "chapter_number",
ADD COLUMN     "order_index" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "skill_lesson_progress" DROP COLUMN "last_watch_position",
ADD COLUMN     "lastWatchPosition" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "skill_lessons" DROP COLUMN "attachment_urls",
DROP COLUMN "lesson_number",
DROP COLUMN "video_duration",
ADD COLUMN     "attachmentUrls" JSONB,
ADD COLUMN     "content_type" TEXT NOT NULL DEFAULT 'video',
ADD COLUMN     "order_index" INTEGER NOT NULL,
ADD COLUMN     "text_content" TEXT,
ADD COLUMN     "videoDuration" INTEGER,
ADD COLUMN     "video_duration_seconds" INTEGER;

-- AlterTable
ALTER TABLE "skill_tasks" DROP COLUMN "allowed_file_types",
DROP COLUMN "max_file_size",
DROP COLUMN "submission_type",
DROP COLUMN "task_number",
ADD COLUMN     "allowedFileTypes" JSONB NOT NULL DEFAULT '["pdf", "doc", "docx", "zip"]',
ADD COLUMN     "chapter_id" TEXT,
ADD COLUMN     "day_number" INTEGER NOT NULL,
ADD COLUMN     "due_date" TIMESTAMP(3),
ADD COLUMN     "lesson_id" TEXT,
ADD COLUMN     "maxFileSize" INTEGER NOT NULL DEFAULT 10485760,
ADD COLUMN     "submissionType" "SubmissionType" NOT NULL DEFAULT 'file',
ALTER COLUMN "rubric" DROP NOT NULL,
ALTER COLUMN "rubric" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "blocked_by",
ADD COLUMN     "blockedBy" TEXT,
ADD COLUMN     "college_name" TEXT,
ADD COLUMN     "department" TEXT,
ADD COLUMN     "dob" TIMESTAMP(3),
ADD COLUMN     "roll_number" TEXT,
ADD COLUMN     "year_of_study" TEXT;

-- CreateTable
CREATE TABLE "lesson_contents" (
    "id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "type" "LessonContentType" NOT NULL,
    "content" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lesson_contents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lesson_contents_lesson_id_type_is_deleted_idx" ON "lesson_contents"("lesson_id", "type", "is_deleted");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_contents_lesson_id_type_order_index_key" ON "lesson_contents"("lesson_id", "type", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "skill_chapters_skill_id_order_index_key" ON "skill_chapters"("skill_id", "order_index");

-- CreateIndex
CREATE UNIQUE INDEX "skill_lessons_chapter_id_order_index_key" ON "skill_lessons"("chapter_id", "order_index");

-- CreateIndex
CREATE INDEX "skill_tasks_day_number_idx" ON "skill_tasks"("day_number");

-- AddForeignKey
ALTER TABLE "skill_tasks" ADD CONSTRAINT "skill_tasks_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "skill_chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_tasks" ADD CONSTRAINT "skill_tasks_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "skill_lessons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_contents" ADD CONSTRAINT "lesson_contents_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "skill_lessons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
