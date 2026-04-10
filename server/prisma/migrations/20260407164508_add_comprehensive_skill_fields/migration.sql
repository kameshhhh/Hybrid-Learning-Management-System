-- AlterTable
ALTER TABLE "skill_chapters" ADD COLUMN     "checklist_config" JSONB,
ADD COLUMN     "content" JSONB,
ADD COLUMN     "day_number" INTEGER,
ADD COLUMN     "maintenance_repair" JSONB,
ADD COLUMN     "mcq_data" JSONB,
ADD COLUMN     "technical_knowledge" JSONB,
ADD COLUMN     "testing_measurements" JSONB;

-- AlterTable
ALTER TABLE "skills" ADD COLUMN     "day_wise_summary" JSONB,
ADD COLUMN     "external_links" JSONB,
ADD COLUMN     "overall_outcome" TEXT,
ADD COLUMN     "prepared_by" JSONB,
ADD COLUMN     "relevance" TEXT,
ADD COLUMN     "skill_coverage" JSONB,
ADD COLUMN     "standards_followed" JSONB,
ADD COLUMN     "total_days" INTEGER,
ADD COLUMN     "total_hours" INTEGER;

-- CreateTable
CREATE TABLE "mcq_attempts" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "day_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "max_score" INTEGER NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mcq_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "practical_evaluations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "day_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "criteria_marks" JSONB NOT NULL,
    "total_marks" INTEGER NOT NULL,
    "remarks" TEXT,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "practical_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checklist_evaluations" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "day_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "results" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "evaluated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checklist_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "day_id" TEXT NOT NULL,
    "submission_text" TEXT,
    "file_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "feedback" TEXT,
    "evaluated_by" TEXT,
    "evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "completed_days" JSONB NOT NULL DEFAULT '[]',
    "completed_tasks" JSONB NOT NULL DEFAULT '[]',
    "progress_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skill_analytics" (
    "id" TEXT NOT NULL,
    "skill_id" TEXT NOT NULL,
    "completion_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "avg_score" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "total_students" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mcq_attempts_student_id_skill_id_idx" ON "mcq_attempts"("student_id", "skill_id");

-- CreateIndex
CREATE INDEX "practical_evaluations_student_id_skill_id_idx" ON "practical_evaluations"("student_id", "skill_id");

-- CreateIndex
CREATE INDEX "checklist_evaluations_student_id_skill_id_idx" ON "checklist_evaluations"("student_id", "skill_id");

-- CreateIndex
CREATE INDEX "task_submissions_student_id_task_id_idx" ON "task_submissions"("student_id", "task_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_student_id_skill_id_key" ON "student_progress"("student_id", "skill_id");

-- CreateIndex
CREATE UNIQUE INDEX "skill_analytics_skill_id_key" ON "skill_analytics"("skill_id");

-- AddForeignKey
ALTER TABLE "mcq_attempts" ADD CONSTRAINT "mcq_attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_attempts" ADD CONSTRAINT "mcq_attempts_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mcq_attempts" ADD CONSTRAINT "mcq_attempts_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "skill_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_evaluations" ADD CONSTRAINT "practical_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_evaluations" ADD CONSTRAINT "practical_evaluations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_evaluations" ADD CONSTRAINT "practical_evaluations_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "skill_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "practical_evaluations" ADD CONSTRAINT "practical_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_evaluations" ADD CONSTRAINT "checklist_evaluations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_evaluations" ADD CONSTRAINT "checklist_evaluations_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_evaluations" ADD CONSTRAINT "checklist_evaluations_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "skill_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checklist_evaluations" ADD CONSTRAINT "checklist_evaluations_evaluator_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "skill_tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_day_id_fkey" FOREIGN KEY ("day_id") REFERENCES "skill_chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_analytics" ADD CONSTRAINT "skill_analytics_skill_id_fkey" FOREIGN KEY ("skill_id") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
