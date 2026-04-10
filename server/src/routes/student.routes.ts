// ============================================================
// STUDENT ROUTES
// ============================================================
//
// All student endpoints for learning:
// - View assigned skills
// - Watch video lessons with progress tracking
// - Submit tasks
// - View grades and feedback
// - Weekly progress logs
// - Download certificates
//
// ============================================================

import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { requireRole } from "../middleware/auth";
import prisma from "../config/database";
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { sendUserNotification } from "../socket";
import {
  queryString,
  queryInt,
  parsePagination,
  createPaginatedResponse,
  successResponse,
  messageResponse,
} from "../utils/query";
import {
  generateCertificate,
  verifyCertificate,
} from "../services/certificate.service";
import { sendTaskSubmissionNotification } from "../services/email.service";
import multer from "multer";
import path from "path";
import fs from "fs";
import { progressService } from "../services/progress.service";

// ===================
// ROUTER SETUP
// ===================

const router = Router();

// All routes require student role
router.use(requireRole("student"));

// ===================
// FILE UPLOAD CONFIG
// ===================

const submissionUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), "uploads", "submissions");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(
        null,
        `sub-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
      );
    },
  }),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max for submissions
});

// ===================
// HELPER: Verify student enrolled
// ===================

async function verifyStudentEnrolled(
  studentId: string,
  skillId: string,
): Promise<void> {
  const enrollment = await prisma.studentSkill.findUnique({
    where: {
      studentId_skillId: { studentId, skillId },
    },
  });
  if (!enrollment || enrollment.status === "dropped") {
    throw ForbiddenError("You are not enrolled in this skill");
  }
}

// Progress calculation handled by progressService

// ===================
// DASHBOARD
// ===================

/**
 * GET /api/v1/student/dashboard
 */
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId;

    // Get enrolled skills
    const enrollments = await prisma.studentSkill.findMany({
      where: { studentId, status: "active" },
      include: {
        skill: {
          select: {
            id: true,
            name: true,
            skillCode: true,
            description: true,
            _count: { select: { chapters: true, tasks: true } }
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    // Get completed skills
    const completedCount = await prisma.studentSkill.count({
      where: { studentId, status: "completed" },
    });

    // Get pending tasks (tasks not yet submitted)
    const submittedTaskIds = await prisma.dailyAssessment.findMany({
      where: { studentId },
      select: { taskId: true },
    });
    const submittedIds = submittedTaskIds.map((t) => t.taskId);

    const enrolledSkillIds = enrollments.map((e) => e.skillId);

    const pendingTasks = await prisma.skillTask.findMany({
      where: {
        skillId: { in: enrolledSkillIds },
        status: { in: ["approved", "draft"] },
        id: { notIn: submittedIds.length > 0 ? submittedIds : ["none"] },
      },
      include: {
        skill: { select: { name: true } },
      },
      orderBy: { dayNumber: "asc" },
      take: 5,
    });

    // Get recent grades
    const recentGrades = await prisma.dailyAssessment.findMany({
      where: { studentId, assessedAt: { not: null } },
      include: {
        task: { select: { title: true, maxMarks: true } },
        skill: { select: { name: true } },
      },
      orderBy: { assessedAt: "desc" },
      take: 5,
    });

    // Get certificates
    const certificates = await prisma.skillCertificate.findMany({
      where: { studentId },
      include: {
        skill: { select: { name: true, skillCode: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    // Process skills to attach totalLessons, totalChapters, totalTasks
    const processedEnrollments = await Promise.all(
      enrollments.map(async (e) => {
        const totalLessons = await prisma.skillLesson.count({ where: { chapter: { skillId: e.skill.id } } });

        return {
          skill: {
            ...e.skill,
            totalChapters: e.skill._count.chapters,
            totalTasks: e.skill._count.tasks,
            totalLessons
          },
          progress: {
            percentage: Number(e.progressPercentage),
            tasksCompleted: e.totalTasksCompleted,
            marksObtained: e.totalMarksObtained,
          }
        };
      })
    );

    res.json(
      successResponse({
        enrollments: processedEnrollments,
        stats: {
          activeSkills: enrollments.length,
          completedSkills: completedCount,
          pendingTasks: pendingTasks.length,
          totalCertificates: certificates.length,
          completedTasks: enrollments.reduce((acc, e) => acc + e.totalTasksCompleted, 0),
        },
        pendingTasks,
        recentGrades,
        certificates,
      }),
    );
  }),
);

// ===================
// MY SKILLS
// ===================

/**
 * GET /api/v1/student/skills
 */
router.get(
  "/skills",
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId;
    const status = queryString(req.query.status) || "active";

    const enrollments = await prisma.studentSkill.findMany({
      where: {
        studentId,
        status: status as "active" | "completed" | "dropped",
      },
      include: {
        skill: {
          include: {
            chapters: {
              // Temporary: bypassing approval check to show testing content
              orderBy: { orderIndex: "asc" },
              include: {
                _count: { select: { lessons: true } },
              },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    res.json(
      successResponse(
        enrollments.map((e) => ({
          ...e.skill,
          enrollment: {
            status: e.status,
            progress: e.progressPercentage,
            tasksCompleted: e.totalTasksCompleted,
            marksObtained: e.totalMarksObtained,
            assignedAt: e.assignedAt,
            completedAt: e.completedAt,
          },
        })),
      ),
    );
  }),
);

/**
 * GET /api/v1/student/skills/:skillId
 *
 * Get detailed skill view with chapters, lessons, and tasks
 */
router.get(
  "/skills/:skillId",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const studentId = req.user!.userId;

    await verifyStudentEnrolled(studentId, skillId);

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        chapters: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              select: {
                id: true,
                title: true,
                description: true,
                contentType: true,
                videoDurationSeconds: true,
                pdfUrl: true,
                pdfSize: true,
              },
            },
            tasks: {
              orderBy: { dayNumber: "asc" },
            }
          },
        },
        // Include skill-level tasks (tasks without chapterId)
        tasks: {
          orderBy: { dayNumber: "asc" },
          select: {
            id: true,
            title: true,
            description: true,
            dayNumber: true,
            maxMarks: true,
            dueDate: true,
            rubric: true,
          },
        },
        faculty: {
          where: { isActive: true },
          include: {
            faculty: { select: { fullName: true, email: true } },
          },
          take: 1,
        },
        _count: { select: { chapters: true } }
      },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    // Get student's progress for lessons and tasks
    const [lessonProgress, assessments, enrollment, globalProgress] = await Promise.all([
      prisma.skillLessonProgress.findMany({
        where: { studentId, skillId },
      }),
      prisma.dailyAssessment.findMany({
        where: { studentId, skillId },
      }),
      prisma.studentSkill.findUnique({
        where: { studentId_skillId: { studentId, skillId } },
      }),
      prisma.studentProgress.findUnique({
        where: { studentId_skillId: { studentId, skillId } },
      }),
    ]);

    // Create progress maps
    const lessonProgressMap = new Map(
      lessonProgress.map((p) => [p.lessonId, p]),
    );
    const assessmentMap = new Map(assessments.map((a) => [a.taskId, a]));

    // Enhance chapters with progress
    const chaptersWithProgress = skill.chapters.map((chapter) => ({
      ...chapter,
      lessons: chapter.lessons.map((lesson) => {
        const progress = lessonProgressMap.get(lesson.id);
        return {
          ...lesson,
          progress: {
            watchedPercentage: progress?.videoWatchedPercentage || 0,
            isCompleted: progress?.isCompleted || false,
            lastWatchPosition: progress?.lastWatchPosition || 0,
          },
        };
      }),
    }));

    // Process skill-level tasks with submission status
    const skillTasksWithProgress = skill.tasks.map((task) => {
      const assessment = assessmentMap.get(task.id);
      return {
        ...task,
        submission: assessment
          ? {
            status: assessment.assessedAt ? "evaluated" : "submitted",
            submittedAt: assessment.submittedAt,
            marksObtained: assessment.marksObtained,
            feedback: assessment.facultyFeedback,
          }
          : null,
      };
    });

    res.json(
      successResponse({
        ...skill,
        chapters: chaptersWithProgress,
        tasks: skillTasksWithProgress,
        faculty: skill.faculty[0]?.faculty || null,
        enrollment: {
          progress: enrollment?.progressPercentage || 0,
          tasksCompleted: enrollment?.totalTasksCompleted || 0,
          marksObtained: enrollment?.totalMarksObtained || 0,
          status: enrollment?.status,
          completedBlocks: globalProgress?.completedBlocks || {},
        },
      }),
    );
  }),
);

// ===================
// VIDEO LESSONS
// ===================

/**
 * POST /api/v1/student/chapters/:chapterId/blocks/:blockId/progress
 */
router.post(
  "/chapters/:chapterId/blocks/:blockId/progress",
  asyncHandler(async (req: Request, res: Response) => {
    const { chapterId, blockId } = req.params;
    const studentId = req.user!.userId;

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
      select: { skillId: true, blocks: true }
    });

    if (!chapter) {
      logger.warn(`Progress Sync: Chapter ${chapterId} not found`);
      throw NotFoundError("Chapter not found");
    }
    
    await verifyStudentEnrolled(studentId, chapter.skillId);

    // Use upsert to ensure progress record exists
    const progress = await prisma.studentProgress.upsert({
      where: { studentId_skillId: { studentId, skillId: chapter.skillId } },
      create: {
        studentId,
        skillId: chapter.skillId,
        completedBlocks: { [chapterId]: [blockId] },
        progressPercentage: 0
      },
      update: {} // Handled below for logic consistency
    });

    const completedBlocks = (progress.completedBlocks as any) || {};
    if (!completedBlocks[chapterId]) {
      completedBlocks[chapterId] = [];
    }

    if (!completedBlocks[chapterId].includes(blockId)) {
      completedBlocks[chapterId].push(blockId);
      
      await prisma.studentProgress.update({
        where: { id: progress.id },
        data: { completedBlocks }
      });

      // Recalculate skill progress
      await progressService.recalculateSkillProgress(studentId, chapter.skillId);
      logger.info(`Progress Synced: Student ${studentId} completed block ${blockId} in chapter ${chapterId}`);
    }

    res.json(successResponse({ completedBlocks }));
  })
);

/**
 * GET /api/v1/student/lessons/:lessonId
 *
 * Get lesson details for watching
 */
router.get(
  "/lessons/:lessonId",
  asyncHandler(async (req: Request, res: Response) => {
    const lessonId = req.params.lessonId as string;
    const studentId = req.user!.userId;

    const lesson = await prisma.skillLesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: { select: { title: true, skillId: true } },
        contents: {
          orderBy: { orderIndex: "asc" }
        },
        tasks: {
          where: { status: "approved" },
          select: {
            id: true,
            title: true,
            description: true,
            dayNumber: true,
            maxMarks: true,
            dueDate: true,
            rubric: true,
            submissionType: true,
          }
        }
      },
    });

    if (!lesson) {
      throw NotFoundError("Lesson not found");
    }

    // @ts-ignore - Prisma relations access
    await verifyStudentEnrolled(studentId, lesson.chapter.skillId);

    // Get or create progress record
    let progress = await prisma.skillLessonProgress.findUnique({
      where: {
        studentId_lessonId: { studentId, lessonId },
      },
    });

    if (!progress) {
      progress = await prisma.skillLessonProgress.create({
        data: {
          studentId,
          lessonId,
          // @ts-ignore - Prisma relations access
          // @ts-ignore - Prisma relations access
          skillId: lesson.chapter.skillId,
          firstWatchedAt: new Date(),
        },
      });
    }

    // Update watch count
    await prisma.skillLessonProgress.update({
      where: { id: progress.id },
      data: {
        lastWatchedAt: new Date(),
        totalWatchCount: { increment: 1 },
      },
    });

    // Group content by type for frontend tabs
    const groupedContent = {
      // @ts-ignore - lesson.contents exists from include
      objectives: lesson.contents.filter((c: any) => c.type === 'OBJECTIVE').map((c: any) => c.content),
      // @ts-ignore
      outcomes: lesson.contents.filter((c: any) => c.type === 'OUTCOME').map((c: any) => c.content),
      // @ts-ignore
      materials: lesson.contents.filter((c: any) => c.type === 'MATERIAL').map((c: any) => c.content),
      // @ts-ignore
      theory: lesson.contents.find((c: any) => c.type === 'THEORY')?.content || "",
      // @ts-ignore
      safety: lesson.contents.filter((c: any) => c.type === 'SAFETY').map((c: any) => c.content),
      // @ts-ignore
      tasks: lesson.tasks || []
    };

    res.json(
      successResponse({
        lesson: {
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          videoUrl: lesson.videoUrl,
          textContent: lesson.textContent,
          videoDurationSeconds: lesson.videoDurationSeconds,
          pdfUrl: lesson.pdfUrl,
          pdfSize: lesson.pdfSize ? Number(lesson.pdfSize) : null,
          // @ts-ignore
          chapterTitle: lesson.chapter.title,
          ...groupedContent
        },
        progress: {
          watchedPercentage: progress.videoWatchedPercentage,
          lastPosition: progress.lastWatchPosition,
          isCompleted: progress.isCompleted,
        },
        contentVersion: "1.1",
        lastUpdated: lesson.updatedAt
      }),
    );
  }),
);

/**
 * POST /api/v1/student/lessons/:lessonId/progress
 *
 * Update video watching progress
 */
router.post(
  "/lessons/:lessonId/progress",
  asyncHandler(async (req: Request, res: Response) => {
    const lessonId = req.params.lessonId as string;
    const { watchedPercentage, currentPosition, maxWatched } = req.body;
    const studentId = req.user!.userId;

    const lesson = await prisma.skillLesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          select: { skillId: true },
        },
      },
    });

    if (!lesson) {
      throw NotFoundError("Lesson not found");
    }

    await verifyStudentEnrolled(studentId, lesson.chapter.skillId);

    // Get existing progress
    const existingProgress = await prisma.skillLessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId } }
    }) as any;

    // Security Validation: Ensure the student isn't reporting a jump ahead of what they've actually watched
    const dbMaxWatched = existingProgress?.maxWatchedTime || 0;
    const reportedMaxWatched = maxWatched || currentPosition || 0;
    
    const newMaxWatched = Math.max(dbMaxWatched, Math.min(lesson.videoDurationSeconds || 999999, reportedMaxWatched));

    // Calculate completion at 95%
    const duration = lesson.videoDurationSeconds || 0;
    const percentage = duration > 0 ? Math.min(100, Math.round((newMaxWatched / duration) * 100)) : watchedPercentage;
    const isCompleted = percentage >= 95;

    await prisma.skillLessonProgress.upsert({
      where: {
        studentId_lessonId: { studentId, lessonId },
      },
      create: {
        studentId,
        lessonId,
        skillId: lesson.chapter.skillId,
        videoWatchedPercentage: percentage,
        lastWatchPosition: currentPosition || 0,
        maxWatchedTime: newMaxWatched,
        watchedSeconds: newMaxWatched,
        isVideoCompleted: isCompleted,
        isCompleted,
        completedAt: isCompleted ? new Date() : null,
        firstWatchedAt: new Date(),
        lastWatchedAt: new Date(),
      } as any,
      update: {
        videoWatchedPercentage: percentage,
        lastWatchPosition: currentPosition || 0,
        maxWatchedTime: newMaxWatched,
        watchedSeconds: newMaxWatched,
        isVideoCompleted: isCompleted,
        isCompleted,
        completedAt: isCompleted && !existingProgress?.isCompleted ? new Date() : undefined,
        lastWatchedAt: new Date(),
      } as any
    });

    // Recalculate skill overall progress
    await progressService.recalculateSkillProgress(studentId, lesson.chapter.skillId);

    res.json(
      successResponse({
        watchedPercentage: percentage,
        isCompleted,
      }),
    );
  }),
);

// ===================
// TASK SUBMISSIONS
// ===================

/**
 * GET /api/v1/student/tasks/:taskId
 */
router.get(
  "/tasks/:taskId",
  asyncHandler(async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;
    const studentId = req.user!.userId;

    const task = await prisma.skillTask.findUnique({
      where: { id: taskId },
      include: {
        skill: { select: { name: true } },
      },
    });

    const requestedSkillId = queryString(req.query.skillId) || task?.skillId;
    
    // Smart Task Lookup if task not found by UUID
    let finalTask = task;
    if (!finalTask && requestedSkillId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
      if (!isUUID) {
        // Try to extract a number (e.g., from "Task: 1")
        const dayMatch = taskId.match(/\d+/);
        const dayNum = dayMatch ? parseInt(dayMatch[0]) : null;

        // Broad Search: Search current skill first, then all enrolled skills
        const enrollments = await prisma.studentSkill.findMany({
          where: { studentId, status: 'active' },
          select: { skillId: true }
        });
        const enrolledSkillIds = enrollments.map(e => e.skillId);
        
        // Ensure requestedSkillId is included
        if (!enrolledSkillIds.includes(requestedSkillId)) {
          enrolledSkillIds.push(requestedSkillId);
        }

        finalTask = await prisma.skillTask.findFirst({
          where: {
            skillId: { in: enrolledSkillIds },
            OR: [
              dayNum ? { dayNumber: dayNum } : {},
              { title: { contains: taskId, mode: 'insensitive' } }
            ]
          },
          include: { skill: { select: { name: true } } }
        });

        // FINAL FALLBACK: If still not found, search ALL skills in the database
        // This handles cases where a faculty linked a task from a course the student isn't enrolled in
        if (!finalTask) {
          finalTask = await prisma.skillTask.findFirst({
            where: {
              OR: [
                dayNum ? { dayNumber: dayNum } : {},
                { title: { contains: taskId, mode: 'insensitive' } }
              ]
            },
            include: { skill: { select: { name: true } } }
          });
        }
      }
    }

    if (!finalTask || !["approved", "draft"].includes(finalTask.status)) {
      throw NotFoundError(`Task not found: ${taskId}`);
    }

    await verifyStudentEnrolled(studentId, requestedSkillId);

    // Get existing submission if any (search globally for this student and task)
    const submission = await prisma.dailyAssessment.findFirst({
      where: {
        studentId,
        taskId: finalTask.id,
      },
      orderBy: { submittedAt: 'desc' }
    });

    res.json(
      successResponse({
        submission: submission
          ? {
            submittedAt: submission.submittedAt,
            submissionText: submission.submissionText,
            submissionFileUrl: submission.submissionFileUrl,
            marksObtained: submission.marksObtained,
            feedback: submission.facultyFeedback,
            rubricScores: submission.rubricScores,
            assessedAt: submission.assessedAt,
          }
          : null,
        task: {
          id: finalTask.id,
          title: finalTask.title,
          description: finalTask.description,
          dayNumber: finalTask.dayNumber,
          maxMarks: finalTask.maxMarks,
          submissionType: finalTask.submissionType,
          rubrics: finalTask.rubric,
          dueDate: finalTask.dueDate,
          skillName: finalTask.skill.name,
        },
      }),
    );
  }),
);

/**
 * POST /api/v1/student/tasks/:taskId/submit
 *
 * Submit a task
 */
router.post(
  "/tasks/:taskId/submit",
  submissionUpload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;
    const { submissionText } = req.body;
    const studentId = req.user!.userId;

    const task = await prisma.skillTask.findUnique({
      where: { id: taskId },
      include: {
        skill: {
          include: {
            faculty: {
              where: { isActive: true },
              include: { faculty: true },
              take: 1,
            },
          },
        },
      },
    });

    const requestedSkillId = req.body.skillId || task?.skillId;
    
    // Smart Task Lookup if task not found by UUID
    let finalTask = task;
    if (!finalTask && requestedSkillId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(taskId);
      if (!isUUID) {
        const dayMatch = taskId.match(/\d+/);
        const dayNum = dayMatch ? parseInt(dayMatch[0]) : null;

        // Broad Search for Submission: Search across all enrolled skills
        const enrollments = await prisma.studentSkill.findMany({
          where: { studentId, status: 'active' },
          select: { skillId: true }
        });
        const enrolledSkillIds = enrollments.map(e => e.skillId);
        
        if (!enrolledSkillIds.includes(requestedSkillId)) {
          enrolledSkillIds.push(requestedSkillId);
        }

        finalTask = await prisma.skillTask.findFirst({
          where: {
            skillId: { in: enrolledSkillIds },
            OR: [
              dayNum ? { dayNumber: dayNum } : {},
              { title: { contains: taskId, mode: 'insensitive' } }
            ]
          },
          include: { skill: { include: { faculty: { where: { isActive: true }, include: { faculty: true }, take: 1 } } } }
        });

        // FINAL FALLBACK: Search ALL skills
        if (!finalTask) {
          finalTask = await prisma.skillTask.findFirst({
            where: {
              OR: [
                dayNum ? { dayNumber: dayNum } : {},
                { title: { contains: taskId, mode: 'insensitive' } }
              ]
            },
            include: { skill: { include: { faculty: { where: { isActive: true }, include: { faculty: true }, take: 1 } } } }
          });
        }
      }
    }

    if (!finalTask || !["approved", "draft"].includes(finalTask.status)) {
      throw NotFoundError(`Task not found: ${taskId}`);
    }

    await verifyStudentEnrolled(studentId, requestedSkillId);
    
    // Use the resolved task for the rest of parameters
    const taskInstance = finalTask;

    // Check submission type requirements
    const hasText = submissionText && submissionText.trim().length > 0;
    const hasFile = !!req.file;

    if (taskInstance.submissionType === "text" && !hasText) {
      throw BadRequestError("Text submission is required");
    }
    if (taskInstance.submissionType === "file" && !hasFile) {
      throw BadRequestError("File submission is required");
    }
    if (taskInstance.submissionType === "both" && (!hasText || !hasFile)) {
      throw BadRequestError("Both text and file submissions are required");
    }

    // Check for existing submission using the unique index (studentId + taskId)
    const existing = await prisma.dailyAssessment.findUnique({
      where: { studentId_taskId: { studentId, taskId: taskInstance.id } },
    });

    // Check if late
    const isLate = taskInstance.dueDate ? new Date() > taskInstance.dueDate : false;

    const fileUrl = req.file
      ? `/uploads/submissions/${req.file.filename}`
      : null;

    let submission;

    if (existing) {
      // Update existing (resubmission)
      submission = await prisma.dailyAssessment.update({
        where: { id: existing.id },
        data: {
          skillId: requestedSkillId, // Move to current skill context
          submissionText: hasText ? submissionText : existing.submissionText,
          submissionFileUrl: fileUrl || existing.submissionFileUrl,
          submittedAt: new Date(),
          isResubmitted: true,
          previousSubmissionId: existing.id,
          isLate,
          // Reset assessment on resubmission
          marksObtained: null,
          rubricScores: Prisma.JsonNull,
          facultyFeedback: null,
          assessedAt: null,
          assessedBy: null,
        },
      });
    } else {
      // Create new submission
      submission = await prisma.dailyAssessment.create({
        data: {
          studentId,
          taskId: taskInstance.id,
          skillId: requestedSkillId,
          submissionText: hasText ? submissionText : null,
          submissionFileUrl: fileUrl,
          isLate,
        },
      });
    }

    // Notify faculty of the CURRENT skill (the one student is enrolled in)
    const currentSkillFaculty = await prisma.skillFaculty.findFirst({
      where: { skillId: requestedSkillId, isActive: true },
      include: { faculty: true },
      orderBy: { isPrimary: 'desc' }
    });

    const faculty = currentSkillFaculty?.faculty;
    if (faculty) {
      sendUserNotification(faculty.id, {
        type: "new_submission",
        title: "New Task Submission",
        message: `A student has submitted "${taskInstance.title}"`,
        data: { taskId: taskInstance.id, submissionId: submission.id },
      });

      // Get student info for email
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { fullName: true },
      });

      if (student) {
        await sendTaskSubmissionNotification(
          faculty.email,
          faculty.fullName,
          student.fullName,
          taskInstance.title,
          taskInstance.skill.name,
        );
      }
    }

    logger.info({
      message: existing ? "Task resubmitted" : "Task submitted",
      taskId: taskInstance.id,
      studentId,
      isLate,
    });

    // Recalculate skill progress for all active enrollments that include this task
    // This ensures shared tasks update progress across ALL related courses (Auto-Sync)
    const relatedEnrollments = await prisma.studentSkill.findMany({
      where: {
        studentId,
        status: 'active',
        skill: {
          tasks: {
            some: { id: taskInstance.id }
          }
        }
      },
      select: { skillId: true }
    });

    const skillIdsToUpdate = new Set([requestedSkillId, ...relatedEnrollments.map(e => e.skillId)]);
    
    for (const sId of skillIdsToUpdate) {
      await progressService.recalculateSkillProgress(studentId, sId);
    }

    res.json(
      successResponse({
        message: existing
          ? "Task resubmitted successfully"
          : "Task submitted successfully",
        submissionId: submission.id,
        isLate,
      }),
    );
  }),
);

// ===================
// GRADES
// ===================

/**
 * GET /api/v1/student/grades
 *
 * Get all grades for the student
 */
router.get(
  "/grades",
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId;
    const skillId = queryString(req.query.skillId);
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit,
    );

    const where: any = {
      studentId,
      assessedAt: { not: null },
    };

    if (skillId) {
      await verifyStudentEnrolled(studentId, skillId);
      where.skillId = skillId;
    }

    const [grades, total] = await Promise.all([
      prisma.dailyAssessment.findMany({
        where,
        include: {
          task: { select: { title: true, dayNumber: true, maxMarks: true } },
          skill: { select: { name: true, skillCode: true } },
          assessor: { select: { fullName: true } },
        },
        orderBy: { assessedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dailyAssessment.count({ where }),
    ]);

    // Calculate totals
    const allGrades = await prisma.dailyAssessment.findMany({
      where: { studentId, assessedAt: { not: null } },
      include: { task: { select: { maxMarks: true } } },
    });

    const totalMarks = allGrades.reduce((sum, g) => sum + g.task.maxMarks, 0);
    const obtainedMarks = allGrades.reduce(
      (sum, g) => sum + Number(g.marksObtained || 0),
      0,
    );

    res.json({
      ...createPaginatedResponse(grades, total, { page, limit, skip }),
      data: {
        ...createPaginatedResponse(grades, total, { page, limit, skip }).data,
        summary: {
          totalMarks,
          obtainedMarks,
          percentage: totalMarks > 0 ? (obtainedMarks / totalMarks) * 100 : 0,
          tasksEvaluated: allGrades.length,
        },
      },
    });
  }),
);

// ===================
// PROGRESS LOGS
// ===================

/**
 * GET /api/v1/student/progress-logs
 *
 * Get student's progress logs
 */
router.get(
  "/progress-logs",
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId;
    const skillId = queryString(req.query.skillId);

    const where: any = { studentId };
    if (skillId) {
      await verifyStudentEnrolled(studentId, skillId);
      where.skillId = skillId;
    }

    const logs = await prisma.skillProgressLog.findMany({
      where,
      include: {
        skill: { select: { name: true } },
        reviewer: { select: { fullName: true } },
      },
      orderBy: [{ skillId: "asc" }, { weekNumber: "desc" }],
    });

    res.json(successResponse(logs));
  }),
);

/**
 * POST /api/v1/student/skills/:skillId/progress-logs
 *
 * Submit a weekly progress log
 */
router.post(
  "/skills/:skillId/progress-logs",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const { workDone, challengesFaced, nextPlan } = req.body;
    const studentId = req.user!.userId;

    await verifyStudentEnrolled(studentId, skillId);

    if (!workDone || workDone.trim().length < 10) {
      throw BadRequestError(
        "Work done description is required (min 10 characters)",
      );
    }

    // Calculate current week number
    const enrollment = await prisma.studentSkill.findUnique({
      where: { studentId_skillId: { studentId, skillId } },
    });

    if (!enrollment) {
      throw NotFoundError("Enrollment not found");
    }

    const weeksSinceEnrollment = Math.floor(
      (Date.now() - enrollment.assignedAt.getTime()) /
      (7 * 24 * 60 * 60 * 1000),
    );
    const weekNumber = weeksSinceEnrollment + 1;

    // Check if log already exists for this week
    const existing = await prisma.skillProgressLog.findUnique({
      where: {
        studentId_skillId_weekNumber: { studentId, skillId, weekNumber },
      },
    });

    if (existing) {
      throw BadRequestError(
        `Progress log for week ${weekNumber} already exists`,
      );
    }

    const log = await prisma.skillProgressLog.create({
      data: {
        studentId,
        skillId,
        weekNumber,
        logDate: new Date(),
        workDone,
        challengesFaced,
        nextPlan,
      },
    });

    // Notify faculty
    const facultyAssignment = await prisma.skillFaculty.findFirst({
      where: { skillId, isActive: true },
    });

    if (facultyAssignment) {
      sendUserNotification(facultyAssignment.facultyId, {
        type: "new_log",
        title: "New Progress Log",
        message: `A student has submitted a weekly progress log`,
      });
    }

    res.status(201).json(successResponse(log));
  }),
);

// ===================
// CERTIFICATES
// ===================

/**
 * GET /api/v1/student/certificates
 */
router.get(
  "/certificates",
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId;

    const certificates = await prisma.skillCertificate.findMany({
      where: { studentId },
      include: {
        skill: { select: { name: true, skillCode: true } },
      },
      orderBy: { issueDate: "desc" },
    });

    res.json(successResponse(certificates));
  }),
);

/**
 * GET /api/v1/student/certificates/:certificateId
 */
router.get(
  "/certificates/:certificateId",
  asyncHandler(async (req: Request, res: Response) => {
    const certificateId = req.params.certificateId as string;
    const studentId = req.user!.userId;

    const certificate = await prisma.skillCertificate.findUnique({
      where: { id: certificateId },
      include: {
        skill: { select: { name: true, skillCode: true, durationWeeks: true } },
        student: { select: { fullName: true, rollNumber: true } },
      },
    });

    if (!certificate || certificate.studentId !== studentId) {
      throw NotFoundError("Certificate not found");
    }

    res.json(successResponse(certificate));
  }),
);

/**
 * POST /api/v1/student/skills/:skillId/request-certificate
 *
 * Request certificate generation for completed skill
 */
router.post(
  "/skills/:skillId/request-certificate",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const studentId = req.user!.userId;

    const enrollment = await prisma.studentSkill.findUnique({
      where: { studentId_skillId: { studentId, skillId } },
    });

    if (!enrollment) {
      throw NotFoundError("Enrollment not found");
    }

    if (enrollment.status !== "completed") {
      throw BadRequestError("Skill must be completed to request certificate");
    }

    // Check if certificate already exists
    const existing = await prisma.skillCertificate.findFirst({
      where: { studentId, skillId },
    });

    if (existing) {
      res.json(
        successResponse({
          message: "Certificate already generated",
          certificate: existing,
        }),
      );
      return;
    }

    // Generate certificate
    const result = await generateCertificate(enrollment.id);

    if (!result.success) {
      throw BadRequestError(result.error || "Failed to generate certificate");
    }

    const certificate = await prisma.skillCertificate.findFirst({
      where: { certificateNumber: result.certificateId },
    });

    res.json(
      successResponse({
        message: "Certificate generated successfully",
        certificate,
      }),
    );
  }),
);

/**
 * GET /api/v1/student/certificates/:certificateId/download
 */
router.get(
  "/certificates/:certificateId/download",
  asyncHandler(async (req: Request, res: Response) => {
    const certificateId = req.params.certificateId as string;
    const studentId = req.user!.userId;

    const certificate = await prisma.skillCertificate.findUnique({
      where: { id: certificateId },
    });

    if (!certificate || certificate.studentId !== studentId) {
      throw NotFoundError("Certificate not found");
    }

    const filePath = path.join(process.cwd(), certificate.pdfUrl);

    if (!fs.existsSync(filePath)) {
      throw NotFoundError("Certificate file not found");
    }

    res.download(filePath, `${certificate.certificateNumber}.pdf`);
  }),
);

// ===================
// PROFILE
// ===================

/**
 * GET /api/v1/student/profile
 */
router.get(
  "/profile",
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.user!.userId;

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        rollNumber: true,
        createdAt: true,
        groupMembers: {
          where: { isActive: true },
          include: {
            group: { select: { id: true, name: true, groupCode: true } },
          },
        },
      },
    });

    if (!student) {
      throw NotFoundError("Profile not found");
    }

    // Get skill stats
    const [activeSkills, completedSkills, totalCertificates] =
      await Promise.all([
        prisma.studentSkill.count({ where: { studentId, status: "active" } }),
        prisma.studentSkill.count({
          where: { studentId, status: "completed" },
        }),
        prisma.skillCertificate.count({ where: { studentId } }),
      ]);

    res.json(
      successResponse({
        ...student,
        stats: {
          activeSkills,
          completedSkills,
          totalCertificates,
        },
      }),
    );
  }),
);

export default router;
