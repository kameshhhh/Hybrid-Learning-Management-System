-- AlterTable
ALTER TABLE "mcq_attempts" ADD COLUMN     "block_id" TEXT;

-- AlterTable
ALTER TABLE "skill_chapters" ADD COLUMN     "blocks" JSONB,
ADD COLUMN     "schema_version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "use_block_system" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "student_progress" ADD COLUMN     "completed_blocks" JSONB NOT NULL DEFAULT '{}';

-- AlterTable
ALTER TABLE "task_submissions" ADD COLUMN     "block_id" TEXT;
