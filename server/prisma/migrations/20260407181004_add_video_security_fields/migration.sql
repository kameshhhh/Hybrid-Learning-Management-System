/*
  Warnings:

  - You are about to drop the column `lastWatchPosition` on the `skill_lesson_progress` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "skill_lesson_progress" DROP COLUMN "lastWatchPosition",
ADD COLUMN     "last_watch_position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "max_watched_time" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "watched_seconds" INTEGER NOT NULL DEFAULT 0;
