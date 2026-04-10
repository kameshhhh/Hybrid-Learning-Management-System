import { PrismaClient } from "@prisma/client";
import { logger } from "../utils/logger";

const prisma = new PrismaClient();

/**
 * Common service to recalculate student progress across many triggers
 * (video completion, task submission, grading, etc.)
 */
export const progressService = {
  /**
   * Recalculates and updates the StudentSkill record with real-time percentage and marks
   */
  recalculateSkillProgress: async (studentId: string, skillId: string): Promise<void> => {
    try {
      // 1. Fetch Skill Content counts (Denominator)
      const chapters = await prisma.skillChapter.findMany({
        where: { skillId },
        select: { id: true, blocks: true, mcqData: true }
      });

      // Total Blocks (The new primary learning unit)
      const totalBlocks = chapters.reduce((acc, c) => {
        const blocks = (c.blocks as any[]) || [];
        return acc + blocks.length;
      }, 0);

      const totalTasks = await prisma.skillTask.count({ where: { skillId, status: "approved" } });
      
      const totalMCQs = chapters.filter(c => {
        const data = c.mcqData as any;
        return data && data.questions && data.questions.length > 0;
      }).length;

      // 2. Fetch Student completions (Numerator)
      // Extract task IDs from curriculum blocks for accurate counting (Block-Aware Progress)
      const resolvedIds = new Set<string>();
      
      // Get physical tasks first
      const dbTaskIds = await prisma.skillTask.findMany({
        where: { skillId, status: "approved" },
        select: { id: true }
      });
      dbTaskIds.forEach(t => resolvedIds.add(t.id));

      // Resolve tasks from curriculum blocks with Smart Fallback (Matches by ID or Title)
      for (const chapter of chapters) {
        const blocks = (chapter.blocks as any[]) || [];
        const taskBlocks = blocks.filter(b => b.type === 'task');
        
        for (const block of taskBlocks) {
          if (block.content?.taskId) {
            resolvedIds.add(block.content.taskId);
          } else if (block.content?.title) {
            const match = await prisma.skillTask.findFirst({
              where: { title: { contains: block.content.title, mode: 'insensitive' } },
              select: { id: true }
            });
            if (match) resolvedIds.add(match.id);
          }
        }
      }

      const skillTasIds = Array.from(resolvedIds);

      // Count only unique required tasks (Denominator override)
      const totalTasksCount = skillTasIds.length;

      const [studentProgress, submittedTasksCount, assessesedTasks, attemptedMCQsCount] = await Promise.all([
        prisma.studentProgress.findUnique({
          where: { studentId_skillId: { studentId, skillId } }
        }),
        prisma.dailyAssessment.count({
          where: { 
            studentId, 
            taskId: { in: skillTasIds }
          },
        }),
        prisma.dailyAssessment.findMany({
          where: { 
            studentId, 
            taskId: { in: skillTasIds },
            assessedAt: { not: null } 
          },
          select: { marksObtained: true }
        }),
        // @ts-ignore
        prisma.mCQAttempt?.groupBy({
           by: ['dayId'],
           where: { studentId, skillId }
        }) || []
      ]);

      // Calculate completed blocks count
      let completedBlocksCount = 0;
      if (studentProgress && studentProgress.completedBlocks) {
        const completedMap = studentProgress.completedBlocks as Record<string, string[]>;
        Object.values(completedMap).forEach(blockIds => {
          completedBlocksCount += blockIds.length;
        });
      }

      const attemptedMCQs = Array.isArray(attemptedMCQsCount) ? attemptedMCQsCount.length : 0;

      // 3. Mathematical Calculations (Weighted Model)
      // progress = (blockComp * 0.6) + (taskComp * 0.2) + (mcqComp * 0.2)
      
      const blockComp = totalBlocks === 0 ? 1 : Math.min(1, completedBlocksCount / totalBlocks);
      const taskComp = totalTasks === 0 ? 1 : Math.min(1, submittedTasksCount / totalTasks);
      const mcqComp = totalMCQs === 0 ? 1 : Math.min(1, attemptedMCQs / totalMCQs);

      const weightedProgress = (blockComp * 0.6) + (taskComp * 0.2) + (mcqComp * 0.2);
      const percentage = Math.min(100, Math.round(weightedProgress * 100));
      
      const totalMarksObtained = assessesedTasks.reduce((acc, curr) => acc + Number(curr.marksObtained || 0), 0);
      const isCompleted = percentage >= 100;

      // 4. Persistence update
      const updatedEnrollment = await prisma.studentSkill.update({
        where: { studentId_skillId: { studentId, skillId } },
        data: {
          progressPercentage: percentage,
          totalTasksCompleted: submittedTasksCount,
          totalMarksObtained: totalMarksObtained,
          status: isCompleted ? "completed" : "active",
          completedAt: isCompleted ? new Date() : null,
        },
      });

      // 5. Broadcast real-time update via Socket.io
      try {
        const { sendSkillUpdate } = await import("../socket");
        sendSkillUpdate(skillId, {
          type: "progress_updated",
          data: {
            studentId,
            progress: percentage,
            totalMarks: totalMarksObtained,
            tasksCompleted: submittedTasks,
            status: updatedEnrollment.status,
            lastWatchPosition: studentProgress?.lastWatchPosition
          }
        });
      } catch (socketError) {
        logger.warn("Failed to broadcast progress update via socket", socketError);
      }

      logger.info({
        message: "Skill progress recalculated (Block-Based Weighted)",
        userId: studentId,
        skillId,
        percentage,
        details: { blockComp, taskComp, mcqComp, totalBlocks, completedBlocksCount },
        isCompleted
      });
    } catch (error) {
      logger.error({
        message: "Error recalculating skill progress",
        userId: studentId,
        skillId,
        error
      });
      throw error;
    }
  }
};

export default progressService;
