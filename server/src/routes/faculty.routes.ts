// ============================================================
// FACULTY ROUTES
// ============================================================
//
// All faculty endpoints for managing skill content:
// - Chapter management (CRUD)
// - Lesson management with video upload
// - Task management with rubrics
// - Assessment/grading with rubric-based evaluation
// - Student progress viewing
// - Weekly progress log review
//
// ============================================================

import { Router, Request, Response } from "express";
import { requireRole } from "../middleware/auth";
import prisma from "../config/database";
import sanitizeHtml from "sanitize-html";
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
  queryEnum,
  parsePagination,
  createPaginatedResponse,
  successResponse,
  messageResponse,
} from "../utils/query";
import {
  validateVideo,
  quickValidateVideoFormat,
} from "../services/videoValidation.service";
import {
  sendGradeNotification,
  sendTaskSubmissionNotification,
} from "../services/email.service";
import multer from "multer";
import path from "path";
import fs from "fs";
import { progressService } from "../services/progress.service";
import { 
  dayContentSchema, 
  technicalKnowledgeSchema, 
  testingMeasurementSchema, 
  maintenanceRepairSchema, 
  checklistConfigSchema, 
  mcqDataSchema 
} from "../validators/courseContentValidator";
import { ChapterBlocksSchema } from "../validators/blockValidator";
import { transformBlocks, LATEST_VERSIONS } from "../utils/blockTransformer";
import { migrateChapterToBlocks } from "../utils/migration/legacyToBlocks";
import { z } from "zod";

// ===================
// ROUTER SETUP
// ===================

const router = Router();

// All routes require faculty or admin role
router.use(requireRole("faculty", "admin"));

/**
 * PUT /api/v1/faculty/skills/:skillId
 * Updates core skill metadata (Basic Info)
 */
router.put(
  "/skills/:skillId",
  asyncHandler(async (req: Request, res: Response) => {
    const { skillId } = req.params as { skillId: string };
    await verifyFacultyOwnsSkill(req.user!, skillId);

    // Filter only the fields allowed for faculty/admin update in this context
    const { 
      name, description, durationWeeks, totalDays, totalHours, 
      overallOutcome, relevance, preparedBy, externalLinks, 
      standardsFollowed, skillCoverage, useBlockSystem 
    } = req.body;

    const updated = await prisma.skill.update({
      where: { id: skillId },
      data: {
        name,
        description,
        durationWeeks,
        totalDays,
        totalHours,
        overallOutcome,
        relevance,
        preparedBy: preparedBy || undefined,
        externalLinks: externalLinks || undefined,
        standardsFollowed: standardsFollowed || undefined,
        skillCoverage: skillCoverage || undefined,
        useBlockSystem: useBlockSystem !== undefined ? useBlockSystem : undefined,
      },
    });

    res.json(successResponse(updated));
  })
);

// ===================
// FILE UPLOAD CONFIG
// ===================

const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), "uploads", "videos");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(
        null,
        `video-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
      );
    },
  }),
  fileFilter: (req, file, cb) => {
    if (quickValidateVideoFormat(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only MP4, WebM, and MOV video files are allowed"));
    }
  },
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max (from SRS)
});

const documentUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), "uploads", "documents");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(
        null,
        `doc-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`,
      );
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// ===================
// HELPER: Check faculty owns skill
// ===================

async function verifyFacultyOwnsSkill(
  user: { userId: string; role: string },
  skillId: string,
): Promise<void> {
  if (user.role === "admin") return;
  const facultyId = user.userId;
  const assignment = await prisma.skillFaculty.findFirst({
    where: { facultyId, skillId, isActive: true },
  });
  if (!assignment) {
    throw ForbiddenError("You are not assigned to this skill");
  }
}

// ===================
// SANITIZATION CONFIG
// ===================

const THEORY_SANITIZER_CONFIG = {
  allowedTags: [
    "p", "b", "strong", "i", "em", "ul", "ol", "li", "h1", "h2", "h3", "a", "br"
  ],
  allowedAttributes: {
    "a": ["href", "name", "target"]
  },
  allowedSchemes: ["http", "https", "mailto"]
};

function validateAndSanitizeContent(type: string, content: string): string {
  if (!content) return "";
  
  const upperType = type.toUpperCase();
  if (["THEORY", "SAFETY"].includes(upperType)) {
    return sanitizeHtml(content, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat(["img", "h1", "h2", "h3", "br"]),
      allowedAttributes: {
        ...sanitizeHtml.defaults.allowedAttributes,
        "*": ["style", "class"],
      },
    });
  }
  
  return content.trim();
}

/**
 * Helper to get faculty info and check ownership
 */
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const facultyId = req.user!.userId;

    // Get assigned skills
    const assignedSkills = await prisma.skillFaculty.findMany({
      where: { facultyId, isActive: true },
      include: {
        skill: {
          include: {
            _count: {
              select: { studentSkills: true, chapters: true, tasks: true },
            },
          },
        },
      },
    });

    const skillIds = assignedSkills.map((a) => a.skillId);

    // Get pending submissions
    const pendingCount = await prisma.dailyAssessment.count({
      where: {
        skillId: { in: skillIds },
        assessedAt: null,
      },
    });

    const pendingSubmissions = await prisma.dailyAssessment.findMany({
      where: {
        skillId: { in: skillIds },
        assessedAt: null,
      },
      include: {
        student: { select: { fullName: true, username: true } },
        task: { select: { title: true, dayNumber: true } },
        skill: { select: { name: true } },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
    });

    // Get pending logs
    const pendingLogs = await prisma.skillProgressLog.count({
      where: {
        skillId: { in: skillIds },
        isApproved: false,
        reviewedAt: null,
      },
    });

    // Get recent assessments
    const recentAssessments = await prisma.dailyAssessment.findMany({
      where: { skillId: { in: skillIds }, assessedAt: { not: null } },
      include: {
        student: {
          select: { fullName: true, rollNumber: true, username: true },
        },
        task: { select: { title: true, dayNumber: true } },
        skill: { select: { name: true } },
      },
      orderBy: { assessedAt: "desc" },
      take: 10,
    });

    res.json(
      successResponse({
        skills: assignedSkills
          .filter((a) => a.skill)
          .map((a) => ({
            ...a.skill,
            assignedAt: a.assignedAt,
          })),
        stats: {
          totalSkills: assignedSkills.filter((a) => a.skill).length,
          totalStudents: assignedSkills
            .filter((a) => a.skill)
            .reduce((sum, a) => sum + (a.skill._count?.studentSkills || 0), 0),
          pendingCount: pendingCount,
          pendingLogs,
        },
        pendingSubmissions,
        recentAssessments,
      }),
    );
  }),
);

// ===================
// MY SKILLS
// ===================

/**
 * GET /api/v1/faculty/tasks/all
 *
 * Get all tasks from all skills assigned to this faculty
 */
router.get(
  "/tasks/all",
  asyncHandler(async (req: Request, res: Response) => {
    const facultyId = req.user!.userId;

    const skills = await prisma.skillFaculty.findMany({
      where: { facultyId, isActive: true },
      include: {
        skill: {
          include: {
            tasks: {
              orderBy: { dayNumber: "asc" },
            },
          },
        },
      },
    });

    const allTasks = skills
      .filter((s) => s.skill)
      .map((s) => ({
        skillId: s.skillId,
        skillName: s.skill.name,
        tasks: s.skill.tasks,
      }));

    res.json(successResponse(allTasks));
  }),
);

/**
 * GET /api/v1/faculty/skills
 *
 * Get all skills assigned to this faculty
 */
router.get(
  "/skills",
  asyncHandler(async (req: Request, res: Response) => {
    const facultyId = req.user!.userId;

    const skills = await prisma.skillFaculty.findMany({
      where: { facultyId, isActive: true },
      include: {
        skill: {
          include: {
            chapters: {
              orderBy: { orderIndex: "asc" },
              include: {
                _count: { select: { lessons: true } },
              },
            },
            _count: {
              select: { studentSkills: true },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    res.json(
      successResponse(
        skills
          .filter((s) => s.skill)
          .map((s) => ({
            ...s.skill,
            assignedAt: s.assignedAt,
          })),
      ),
    );
  }),
);

/**
 * GET /api/v1/faculty/skills/:skillId
 */
router.get(
  "/skills/:skillId",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    await verifyFacultyOwnsSkill(req.user!, skillId);

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        chapters: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
            },
            tasks: {
              orderBy: { dayNumber: "asc" },
            },
          },
        },
        _count: {
          select: { studentSkills: true },
        },
      },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    res.json(successResponse(skill));
  }),
);

// ===================
// CHAPTER MANAGEMENT
// ===================

/**
 * POST /api/v1/faculty/skills/:skillId/chapters
 */
router.post(
  "/skills/:skillId/chapters",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const { title, description, orderIndex } = req.body;

    await verifyFacultyOwnsSkill(req.user!, skillId);

    if (!title) {
      throw BadRequestError("Chapter title is required");
    }

    // Get next order index if not provided
    let order = orderIndex;
    if (order === undefined) {
      const lastChapter = await prisma.skillChapter.findFirst({
        where: { skillId },
        orderBy: { orderIndex: "desc" },
      });
      order = lastChapter ? lastChapter.orderIndex + 1 : 1;
    }

    const chapter = await prisma.skillChapter.create({
      data: {
        skillId,
        title,
        description,
        orderIndex: order,
        createdBy: req.user!.userId,
      },
    });

    logger.info({
      message: "Chapter created",
      chapterId: chapter.id,
      skillId,
      createdBy: req.user!.userId,
    });

    res.status(201).json(successResponse(chapter));
  }),
);

/**
 * PUT /api/v1/faculty/chapters/:chapterId
 */
router.put(
  "/chapters/:chapterId",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const { title, description, orderIndex } = req.body;

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      throw NotFoundError("Chapter not found");
    }

    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      data: {
        title: title || chapter.title,
        description: description ?? chapter.description,
        orderIndex: orderIndex ?? chapter.orderIndex,
        blocks: req.body.blocks ? (transformBlocks(req.body.blocks) as any) : undefined,
        schemaVersion: req.body.blocks ? LATEST_VERSIONS.CHAPTER : undefined,
      },
    });

    res.json(successResponse(updated));
  }),
);

/**
 * POST /api/v1/faculty/chapters/:chapterId/migrate-to-blocks
 * Migrates legacy content to blocks
 */
router.post(
  "/chapters/:chapterId/migrate-to-blocks",
  asyncHandler(async (req: Request, res: Response) => {
    const { chapterId } = req.params as { chapterId: string };
    
    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
      include: {
        lessons: true
      }
    });

    if (!chapter) throw NotFoundError("Chapter not found");

    const blocks = migrateChapterToBlocks(chapter);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      data: {
        blocks: blocks as any,
        schemaVersion: LATEST_VERSIONS.CHAPTER
      }
    });

    res.json(successResponse(updated));
  })
);

/**
 * DELETE /api/v1/faculty/chapters/:chapterId
 */
router.delete(
  "/chapters/:chapterId",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
      include: { _count: { select: { lessons: true } } },
    });

    if (!chapter) {
      throw NotFoundError("Chapter not found");
    }

    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    // Check if chapter has content
    if (chapter._count && chapter._count.lessons > 0) {
      throw BadRequestError(
        "Cannot delete chapter with lessons. Delete them first.",
      );
    }

    await prisma.skillChapter.delete({ where: { id: chapterId } });

    res.json(messageResponse("Chapter deleted"));
  }),
);

// ===================
// LESSON MANAGEMENT
// ===================

/**
 * POST /api/v1/faculty/chapters/:chapterId/lessons
 */
router.post(
  "/chapters/:chapterId/lessons",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    // MANDATORY LOGGING: Trace incoming structure
    console.log("[DEBUG] Create Lesson Payload:", JSON.stringify(req.body, null, 2));

    const { title, description, contentType, textContent, orderIndex, contents } = req.body;

    // FAIL-FAST: Manual presence check
    if (!title) {
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        error: "Lesson title is required" 
      });
    }

    try {
      // Get next order index
      let order = orderIndex;
      if (order === undefined) {
        const lastLesson = await prisma.skillLesson.findFirst({
          where: { chapterId },
          orderBy: { orderIndex: "desc" },
        });
        order = lastLesson ? lastLesson.orderIndex + 1 : 1;
      }

      const lesson = await prisma.$transaction(async (tx) => {
        const newLesson = await tx.skillLesson.create({
          data: {
            chapterId,
            title,
            description: null, // Zero-tolerance: Strip legacy description
            contentType: contentType || "video",
            textContent: null, // Zero-tolerance: Strip legacy textContent
            orderIndex: order,
            createdBy: req.user!.userId,
          },
        });

        // Use helper or inline logic to normalize contents
        let finalContents = contents || [];
        
        // BACKWARD COMPATIBILITY: Fallback to textContent if contents is empty
        if (finalContents.length === 0 && textContent) {
          console.log("[DEBUG] Falling back to legacy textContent -> THEORY");
          finalContents = [{ type: "THEORY", content: textContent, orderIndex: 0 }];
        }

        if (finalContents.length > 0) {
          if (finalContents.length > 250) throw new Error("Too many content items (max 250)");
          
          // @ts-ignore - Prisma client types may be stale in IDE
          await tx.lessonContent.createMany({
            data: finalContents.filter((c: any) => c.content?.trim()).map((c: any, idx: number) => {
              const type = String(c.type).toUpperCase();
              return {
                lessonId: newLesson.id,
                type: type as any,
                content: validateAndSanitizeContent(type, c.content),
                orderIndex: c.orderIndex ?? idx,
              };
            })
          });
        }

        return newLesson;
      });

      console.log("[DEBUG] Lesson Created Successfully:", lesson.id);
      res.status(201).json(successResponse(lesson));
    } catch (err: any) {
      console.error("[DEBUG] Lesson Create Error:", err);
      res.status(400).json({
        success: false,
        message: "Lesson creation failed",
        error: err.errors || err.message
      });
    }
  }),
);

/**
 * POST /api/v1/faculty/lessons/:lessonId/upload-video
 */
router.post(
  "/lessons/:lessonId/upload-video",
  videoUpload.single("video"),
  asyncHandler(async (req: Request, res: Response) => {
    const lessonId = req.params.lessonId as string;

    if (!req.file) {
      throw BadRequestError("No video file uploaded");
    }

    const lesson = await prisma.skillLesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          select: { skillId: true },
        },
      },
    });

    if (!lesson) {
      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});
      throw NotFoundError("Lesson not found");
    }

    await verifyFacultyOwnsSkill(req.user!, lesson.chapter.skillId);

    // Validate video (format, duration, size)
    const validation = await validateVideo(req.file.path);

    if (!validation.isValid) {
      // Clean up invalid file
      fs.unlink(req.file.path, () => {});
      throw BadRequestError(
        `Video validation failed: ${validation.errors.join(", ")}`,
      );
    }

    // Update lesson with video info
    const videoUrl = `/uploads/videos/${req.file.filename}`;

    const updatedLesson = await prisma.skillLesson.update({
      where: { id: lessonId },
      data: {
        videoUrl,
        videoDurationSeconds: validation.duration
          ? Math.floor(validation.duration)
          : null,
        videoSize: Math.round(validation.size / (1024 * 1024)),
      },
    });

    logger.info({
      message: "Video uploaded for lesson",
      lessonId,
      videoUrl,
      duration: validation.duration,
      size: validation.size,
    });

    res.json(
      successResponse({
        message: "Video uploaded successfully",
        videoUrl,
        duration: validation.duration,
        resolution: validation.resolution,
        warnings: validation.warnings,
      }),
    );
  }),
);

/**
 * POST /api/v1/faculty/lessons/:lessonId/upload-material
 */
router.post(
  "/lessons/:lessonId/upload-material",
  documentUpload.single("material"),
  asyncHandler(async (req: Request, res: Response) => {
    const lessonId = req.params.lessonId as string;

    if (!req.file) {
      throw BadRequestError("No material file uploaded");
    }

    const lesson = await prisma.skillLesson.findUnique({
      where: { id: lessonId },
      include: {
        chapter: {
          select: { skillId: true },
        },
      },
    });

    if (!lesson) {
      // Clean up uploaded file
      fs.unlink(req.file.path, () => {});
      throw NotFoundError("Lesson not found");
    }

    await verifyFacultyOwnsSkill(req.user!, lesson.chapter.skillId);

    // Update lesson with pdf info
    const pdfUrl = `/uploads/documents/${req.file.filename}`;

    const updatedLesson = await prisma.skillLesson.update({
      where: { id: lessonId },
      data: {
        pdfUrl,
        pdfSize: BigInt(req.file.size),
      },
    });

    logger.info({
      message: "Material uploaded for lesson",
      lessonId,
      pdfUrl,
      size: req.file.size,
    });

    res.json(
      successResponse({
        message: "Material uploaded successfully",
        pdfUrl,
      }),
    );
  }),
);

/**
 * PUT /api/v1/faculty/lessons/:lessonId
 */
router.put(
  "/lessons/:lessonId",
  asyncHandler(async (req: Request, res: Response) => {
    const lessonId = req.params.lessonId as string;
    // MANDATORY LOGGING: Trace incoming structure
    console.log("[DEBUG] Update Lesson Payload:", JSON.stringify(req.body, null, 2));

    const { title, description, textContent, orderIndex, isPublished, contents, updatedAt: clientUpdatedAt } = req.body;

    try {
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

      await verifyFacultyOwnsSkill(req.user!, lesson.chapter.skillId);

      // Optimistic Locking Check
      if (clientUpdatedAt && new Date(lesson.updatedAt).getTime() !== new Date(clientUpdatedAt).getTime()) {
        throw new Error("Concurrency Conflict: This lesson has been modified by another user. Please refresh and try again.");
      }

      const updated = await prisma.$transaction(async (tx) => {
        // ENUM ENFORCEMENT & NORMALIZATION
        let finalContents = contents;
        
        // BACKWARD COMPATIBILITY: Fallback to textContent if contents is empty
        if ((!finalContents || finalContents.length === 0) && textContent) {
          console.log("[DEBUG] Falling back to legacy textContent -> THEORY");
          finalContents = [{ type: "THEORY", content: textContent, orderIndex: 0 }];
        }

        // 1. Handle structured contents if provided
        if (finalContents && Array.isArray(finalContents)) {
          if (finalContents.length > 250) throw new Error("Too many content items");

          // @ts-ignore
          await tx.lessonContent.deleteMany({
            where: { lessonId: lessonId }
          });

          // STEP 2: Process items
          const groupedByType: Record<string, any[]> = {};
          finalContents.forEach((c: any) => {
            const type = String(c.type).toUpperCase();
            if (!groupedByType[type]) groupedByType[type] = [];
            groupedByType[type].push({...c, type});
          });

          for (const type of Object.keys(groupedByType)) {
            const items = groupedByType[type].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
            
            for (let i = 0; i < items.length; i++) {
              const item = items[i];
              const sanitizedContent = validateAndSanitizeContent(type, item.content);
              
              // @ts-ignore
              await tx.lessonContent.create({
                data: { lessonId, type: type as any, content: sanitizedContent, orderIndex: i }
              });
            }
          }

          // Cleanup logic simplified to overwrite for hardening phase
        }

        // 2. Update lesson metadata
        return await tx.skillLesson.update({
          where: { id: lessonId },
          data: {
            title: title || lesson.title,
            description: null, // Strip legacy
            textContent: null, // Strip legacy
            orderIndex: orderIndex ?? lesson.orderIndex,
            status:
              isPublished !== undefined
                ? isPublished
                  ? "approved"
                  : "draft"
                : lesson.status,
          },
          include: {
            // @ts-ignore
            contents: {
              orderBy: { orderIndex: "asc" }
            }
          }
        });
      });

      console.log("[DEBUG] Lesson Updated Successfully:", updated.id);
      res.json(successResponse({
        ...updated,
        lastUpdated: updated.updatedAt,
        contentVersion: "1.1"
      }));
    } catch (err: any) {
      console.error("[DEBUG] Lesson Update Error:", err);
      res.status(400).json({
        success: false,
        message: "Lesson update failed",
        error: err.errors || err.message
      });
    }
  }),
);

/**
 * DELETE /api/v1/faculty/lessons/:lessonId
 */
router.delete(
  "/lessons/:lessonId",
  asyncHandler(async (req: Request, res: Response) => {
    const lessonId = req.params.lessonId as string;

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

    await verifyFacultyOwnsSkill(req.user!, lesson.chapter.skillId);

    // Delete video file if exists
    if (lesson.videoUrl) {
      const videoPath = path.join(process.cwd(), lesson.videoUrl);
      fs.unlink(videoPath, () => {});
    }

    await prisma.skillLesson.delete({ where: { id: lessonId } });

    res.json(messageResponse("Lesson deleted"));
  }),
);

// ===================
// TASK MANAGEMENT
// ===================

/**
 * POST /api/v1/faculty/chapters/:chapterId/tasks
 *
 * Create a task with rubrics
 */
router.post(
  "/chapters/:chapterId/tasks",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const {
      title,
      description,
      dayNumber,
      maxMarks,
      submissionType,
      rubrics,
      dueDate,
      lessonId
    } = req.body;

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) {
      throw NotFoundError("Chapter not found");
    }

    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    // Validate lessonId if provided
    if (lessonId) {
      const lesson = await prisma.skillLesson.findUnique({
        where: { id: lessonId }
      });
      if (!lesson || lesson.chapterId !== chapterId) {
        throw BadRequestError("Invalid lessonId: Lesson must belong to the same chapter");
      }
    }

    if (!title) {
      throw BadRequestError("Task title is required");
    }

    // Validate maxMarks (SRS: max 10 marks per task)
    const marks = maxMarks || 10;
    if (marks < 1 || marks > 10) {
      throw BadRequestError("Max marks must be between 1 and 10");
    }

    // Validate rubrics (should sum to maxMarks)
    if (rubrics && Array.isArray(rubrics)) {
      const totalWeight = rubrics.reduce(
        (sum: number, r: { criterion: string; maxMarks: number }) =>
          sum + r.maxMarks,
        0,
      );
      if (totalWeight !== marks) {
        throw BadRequestError(
          `Rubric weights (${totalWeight}) must equal max marks (${marks})`,
        );
      }
    }

    // Get next day number if not provided
    let day = dayNumber;
    if (day === undefined) {
      const lastTask = await prisma.skillTask.findFirst({
        where: { skillId: chapter.skillId },
        orderBy: { dayNumber: "desc" },
      });
      day = lastTask?.dayNumber ? lastTask.dayNumber + 1 : 1;
    }

    const task = await prisma.skillTask.create({
      data: {
        skillId: chapter.skillId,
        chapterId: chapter.id,
        // taskNumber: Number(day), // Removed since task relies on dayNumber
        title,
        description,
        dayNumber: day,
        maxMarks: marks,
        submissionType: submissionType || "both",
        rubric: rubrics || [],
        dueDate: dueDate ? new Date(dueDate) : null,
        // @ts-ignore - lessonId is a valid field in SkillTask
        lessonId: lessonId || null,
        createdBy: req.user!.userId,
      },
    });

    logger.info({
      message: "Task created",
      taskId: task.id,
      chapterId,
      dayNumber: day,
    });

    res.status(201).json(successResponse(task));
  }),
);

/**
 * PUT /api/v1/faculty/tasks/:taskId
 */
router.put(
  "/tasks/:taskId",
  asyncHandler(async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;
    const {
      title,
      description,
      maxMarks,
      submissionType,
      rubrics,
      dueDate,
      isPublished,
    } = req.body;

    const task = await prisma.skillTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw NotFoundError("Task not found");
    }

    await verifyFacultyOwnsSkill(req.user!, task.skillId);

    // Validate maxMarks
    if (maxMarks !== undefined && (maxMarks < 1 || maxMarks > 10)) {
      throw BadRequestError("Max marks must be between 1 and 10");
    }

    const updated = await prisma.skillTask.update({
      where: { id: taskId },
      data: {
        title: title || task.title,
        description: description ?? task.description,
        maxMarks: maxMarks || task.maxMarks,
        submissionType: submissionType || task.submissionType,
        rubric: rubrics !== undefined ? rubrics : task.rubric,
        dueDate:
          dueDate !== undefined
            ? dueDate
              ? new Date(dueDate)
              : null
            : task.dueDate,
        status:
          isPublished !== undefined
            ? isPublished
              ? "approved"
              : "draft"
            : task.status,
      },
    });

    res.json(successResponse(updated));
  }),
);

/**
 * DELETE /api/v1/faculty/tasks/:taskId
 */
router.delete(
  "/tasks/:taskId",
  asyncHandler(async (req: Request, res: Response) => {
    const taskId = req.params.taskId as string;

    const task = await prisma.skillTask.findUnique({
      where: { id: taskId },
      include: { _count: { select: { assessments: true } } },
    });

    if (!task) {
      throw NotFoundError("Task not found");
    }

    await verifyFacultyOwnsSkill(req.user!, task.skillId);

    // Don't delete if submissions exist
    if (task._count.assessments > 0) {
      throw BadRequestError("Cannot delete task with existing submissions");
    }

    await prisma.skillTask.delete({ where: { id: taskId } });

    res.json(messageResponse("Task deleted"));
  }),
);

// ===================
// ASSESSMENT / GRADING
// ===================

/**
 * GET /api/v1/faculty/assessments
 *
 * Get pending and recent assessments
 */
router.get(
  "/assessments",
  asyncHandler(async (req: Request, res: Response) => {
    const facultyId = req.user!.userId;
    const status = queryString(req.query.status); // 'pending' or 'evaluated'
    const skillId = queryString(req.query.skillId);
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit,
    );

    // Get faculty's skill IDs
    const assignments = await prisma.skillFaculty.findMany({
      where: { facultyId, isActive: true },
      select: { skillId: true },
    });
    const skillIds = skillId ? [skillId] : assignments.map((a) => a.skillId);

    // Verify faculty owns the skill if specific skillId provided
    if (skillId) {
      await verifyFacultyOwnsSkill(req.user!, skillId);
    }

    const where: any = { skillId: { in: skillIds } };

    if (status === "pending") {
      where.assessedAt = null;
    } else if (status === "evaluated") {
      where.assessedAt = { not: null };
    }

    const [assessments, total] = await Promise.all([
      prisma.dailyAssessment.findMany({
        where,
        include: {
          student: { select: { id: true, fullName: true, rollNumber: true } },
          task: {
            select: { id: true, title: true, maxMarks: true, rubric: true },
          },
          skill: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.dailyAssessment.count({ where }),
    ]);

    res.json(
      createPaginatedResponse(assessments, total, { page, limit, skip }),
    );
  }),
);

/**
 * GET /api/v1/faculty/assessments/:assessmentId
 */
router.get(
  "/assessments/:assessmentId",
  asyncHandler(async (req: Request, res: Response) => {
    const assessmentId = req.params.assessmentId as string;

    const assessment = await prisma.dailyAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        student: {
          select: { id: true, fullName: true, rollNumber: true, email: true },
        },
        task: {
          select: {
            id: true,
            title: true,
            description: true,
            maxMarks: true,
            rubric: true,
          },
        },
        skill: { select: { id: true, name: true, skillCode: true } },
        assessor: { select: { fullName: true } },
      },
    });

    if (!assessment) {
      throw NotFoundError("Assessment not found");
    }

    await verifyFacultyOwnsSkill(req.user!, assessment.skillId);

    res.json(successResponse(assessment));
  }),
);

/**
 * POST /api/v1/faculty/assessments/:assessmentId/evaluate
 *
 * Evaluate a student submission using rubrics
 */
router.post(
  "/assessments/:assessmentId/evaluate",
  asyncHandler(async (req: Request, res: Response) => {
    const assessmentId = req.params.assessmentId as string;
    const { rubricScores, feedback, marksObtained } = req.body;

    const assessment = await prisma.dailyAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        task: true,
        student: { select: { id: true, fullName: true, email: true } },
        skill: { select: { name: true } },
      },
    });

    if (!assessment) {
      throw NotFoundError("Assessment not found");
    }

    await verifyFacultyOwnsSkill(req.user!, assessment.skillId);

    // Calculate marks from rubric scores or use direct marks
    let marks = marksObtained;

    if (rubricScores && typeof rubricScores === "object") {
      marks = Object.values(rubricScores).reduce(
        (sum: number, score) => sum + Number(score),
        0,
      );
    }

    if (marks === undefined || marks < 0 || marks > assessment.task.maxMarks) {
      throw BadRequestError(
        `Marks must be between 0 and ${assessment.task.maxMarks}`,
      );
    }

    const updated = await prisma.dailyAssessment.update({
      where: { id: assessmentId },
      data: {
        marksObtained: marks,
        rubricScores: rubricScores || {},
        facultyFeedback: feedback,
        assessedBy: req.user!.userId,
        assessedAt: new Date(),
      },
    });

    // Update student's skill progress
    await progressService.recalculateSkillProgress(
      assessment.studentId,
      assessment.skillId,
    );

    // Notify student
    sendUserNotification(assessment.studentId, {
      type: "grade_received",
      title: "Task Graded",
      message: `Your submission for "${assessment.task.title}" has been graded. Score: ${marks}/${assessment.task.maxMarks}`,
      data: { assessmentId, marks },
    });

    // Send email notification
    await sendGradeNotification(
      assessment.student.email,
      assessment.student.fullName,
      assessment.task.title,
      marks,
      assessment.task.maxMarks,
      feedback || "",
    );

    logger.info({
      message: "Assessment evaluated",
      assessmentId,
      marks,
      evaluatedBy: req.user!.userId,
    });

    res.json(
      successResponse({
        message: "Assessment evaluated successfully",
        assessment: updated,
      }),
    );
  }),
);

// Progress calculation handled by progressService

// ===================
// STUDENT PROGRESS
// ===================

/**
 * GET /api/v1/faculty/skills/:skillId/students
 *
 * Get all students enrolled in a skill with their progress
 */
router.get(
  "/skills/:skillId/students",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit,
    );

    await verifyFacultyOwnsSkill(req.user!, skillId);

    const where = { skillId };

    const [enrollments, total] = await Promise.all([
      prisma.studentSkill.findMany({
        where,
        include: {
          student: {
            select: { id: true, fullName: true, email: true, rollNumber: true },
          },
        },
        orderBy: { assignedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.studentSkill.count({ where }),
    ]);

    res.json(
      createPaginatedResponse(enrollments, total, { page, limit, skip }),
    );
  }),
);

/**
 * GET /api/v1/faculty/skills/:skillId/students/:studentId
 *
 * Get detailed progress for a specific student
 */
router.get(
  "/skills/:skillId/students/:studentId",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const studentId = req.params.studentId as string;

    await verifyFacultyOwnsSkill(req.user!, skillId);

    const enrollment = await prisma.studentSkill.findUnique({
      where: {
        studentId_skillId: { studentId, skillId },
      },
      include: {
        student: {
          select: { id: true, fullName: true, email: true, rollNumber: true },
        },
      },
    });

    if (!enrollment) {
      throw NotFoundError("Student not enrolled in this skill");
    }

    // 1. Get all task IDs belonging to this skill (Check SkillTask table + Chapter Blocks)
    const dbTasks = await prisma.skillTask.findMany({
      where: { skillId },
      select: { id: true }
    });
    
    const chapters = await prisma.skillChapter.findMany({
      where: { skillId },
      select: { blocks: true }
    });
    
    const resolvedIds = new Set(dbTasks.map(t => t.id));
    
    for (const chapter of chapters) {
        const blocks = (chapter.blocks as any[]) || [];
        const taskBlocks = blocks.filter(b => b.type === 'task');
        
        for (const block of taskBlocks) {
            if (block.content?.taskId) {
                resolvedIds.add(block.content.taskId);
            } else if (block.content?.title) {
                // SMART FALLBACK: Resolve by title if ID is missing
                const match = await prisma.skillTask.findFirst({
                    where: { title: { contains: block.content.title, mode: 'insensitive' } },
                    select: { id: true }
                });
                if (match) resolvedIds.add(match.id);
            }
        }
      }

      const skillTasIds = Array.from(resolvedIds);

    // 2. Get ALL assessments for this student across the entire system (Universal Visibility)
    // This ensures that work submitted in 'Welding Final' is visible even from the 'Welding 1' profile.
    const assessments = await prisma.dailyAssessment.findMany({
      where: { 
        studentId
      },
      include: {
        task: { 
          include: { 
            skill: { select: { name: true } }
          } 
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    // Tag assessments that are part of the CURRENT skill's curriculum (from blocks or table)
    const enrichedAssessments = assessments.map(a => ({
        ...a,
        isCurrentCurriculum: skillTasIds.includes(a.taskId)
    }));

    // Get lesson progress
    const lessonProgress = await prisma.skillLessonProgress.findMany({
      where: { studentId, skillId },
      include: {
        lesson: { select: { title: true } },
      },
    });

    // Get progress logs
    const progressLogs = await prisma.skillProgressLog.findMany({
      where: { studentId, skillId },
      orderBy: { weekNumber: "desc" },
    });

    res.json(
      successResponse({
        enrollment,
        assessments: enrichedAssessments,
        lessonProgress,
        progressLogs,
      }),
    );
  }),
);

// ===================
// PROGRESS LOGS REVIEW
// ===================

/**
 * GET /api/v1/faculty/progress-logs
 *
 * Get progress logs for review
 */
router.get(
  "/progress-logs",
  asyncHandler(async (req: Request, res: Response) => {
    const facultyId = req.user!.userId;
    const status = queryString(req.query.status); // 'pending' or 'reviewed'
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit,
    );

    const assignments = await prisma.skillFaculty.findMany({
      where: { facultyId, isActive: true },
      select: { skillId: true },
    });
    const skillIds = assignments.map((a) => a.skillId);

    const where: any = { skillId: { in: skillIds } };

    if (status === "pending") {
      where.reviewedAt = null;
    } else if (status === "reviewed") {
      where.reviewedAt = { not: null };
    }

    const [logs, total] = await Promise.all([
      prisma.skillProgressLog.findMany({
        where,
        include: {
          student: { select: { fullName: true, rollNumber: true } },
          skill: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.skillProgressLog.count({ where }),
    ]);

    res.json(createPaginatedResponse(logs, total, { page, limit, skip }));
  }),
);

/**
 * POST /api/v1/faculty/progress-logs/:logId/review
 */
router.post(
  "/progress-logs/:logId/review",
  asyncHandler(async (req: Request, res: Response) => {
    const logId = req.params.logId as string;
    const { remarks, isApproved } = req.body;

    const log = await prisma.skillProgressLog.findUnique({
      where: { id: logId },
    });

    if (!log) {
      throw NotFoundError("Progress log not found");
    }

    await verifyFacultyOwnsSkill(req.user!, log.skillId);

    const updated = await prisma.skillProgressLog.update({
      where: { id: logId },
      data: {
        facultyRemarks: remarks,
        isApproved: isApproved ?? false,
        reviewedBy: req.user!.userId,
        reviewedAt: new Date(),
      },
    });

    // Notify student
    sendUserNotification(log.studentId, {
      type: "log_reviewed",
      title: "Progress Log Reviewed",
      message: isApproved
        ? "Your progress log has been approved"
        : "Your progress log has been reviewed",
    });

    res.json(successResponse(updated));
  }),
);

// ===================
// SUBMIT SKILL FOR APPROVAL
// ===================

/**
 * POST /api/v1/faculty/skills/:skillId/submit-for-approval
 */
router.post(
  "/skills/:skillId/submit-for-approval",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;

    await verifyFacultyOwnsSkill(req.user!, skillId);

    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        _count: { select: { tasks: true } },
        chapters: {
          include: { _count: { select: { lessons: true } } },
        },
      },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    // Validate skill has content
    if (skill.chapters.length === 0) {
      throw BadRequestError("Skill must have at least one chapter");
    }

    const hasLessons = skill.chapters.some((c) => c._count.lessons > 0);
    const hasTasks = skill._count.tasks > 0;

    if (!hasLessons) {
      throw BadRequestError("Skill must have at least one lesson");
    }

    if (!hasTasks) {
      throw BadRequestError("Skill must have at least one task");
    }

    await prisma.skill.update({
      where: { id: skillId },
      data: { status: "pending_approval" },
    });

    logger.info({
      message: "Skill submitted for approval",
      skillId,
      submittedBy: req.user!.userId,
    });

    res.json(messageResponse("Skill submitted for approval"));
  }),
);

// ===================
// STUDENTS
// ===================

/**
 * GET /api/v1/faculty/students
 * Get all students enrolled in faculty's skills
 */
router.get(
  "/students",
  asyncHandler(async (req: Request, res: Response) => {
    const facultyId = req.user!.userId;
    const skillId = queryString(req.query.skillId);

    const assignments = await prisma.skillFaculty.findMany({
      where: { facultyId, isActive: true },
      select: { skillId: true },
    });
    const skillIds = assignments.map((a) => a.skillId);

    if (skillIds.length === 0) {
      res.json(successResponse([]));
      return;
    }

    const where: any = {
      skillId: { in: skillIds },
      status: "active",
    };

    if (skillId) {
      await verifyFacultyOwnsSkill(req.user!, skillId);
      where.skillId = skillId;
    }

    const enrollments = await prisma.studentSkill.findMany({
      where,
      include: {
        student: {
          select: { id: true, fullName: true, email: true, rollNumber: true },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    // Group by student to avoid duplicates if enrolled in multiple
    const studentMap = new Map();
    enrollments.forEach((e) => {
      if (!e.student) return;
      if (!studentMap.has(e.studentId)) {
        studentMap.set(e.studentId, {
          id: e.student.id,
          fullName: e.student.fullName,
          email: e.student.email,
          rollNumber: e.student.rollNumber,
          enrollments: [],
        });
      }
      studentMap.get(e.studentId).enrollments.push({
        skillId: e.skillId,
        progress: e.progressPercentage,
        marks: e.totalMarksObtained,
      });
    });

    res.json(successResponse(Array.from(studentMap.values())));
  }),
);

// ============================================
// DAY CONTENT UPDATES (JSONB)
// ============================================

/**
 * PUT /api/v1/faculty/skills/:skillId/curriculum
 * 
 * Bulk update/sync the entire curriculum (chapters, lessons, tasks)
 */
router.put(
  "/skills/:skillId/curriculum",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.skillId as string;
    const { chapters } = req.body;

    await verifyFacultyOwnsSkill(req.user!, skillId);

    // Transactional update for data integrity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update basic skill chapters
      // For simplicity in this stabilization phase, we'll iterate and update.
      // A more optimized version would calculate diffs.
      
      const updatedChapters: any[] = [];
      for (const chapterData of chapters) {
        const { id, lessons, tasks, ...rest } = chapterData;
        
        const upsertedChapter = await tx.skillChapter.upsert({
          where: { id: (id && !id.startsWith('new-')) ? id : "new-chapter-" + Math.random() },
          create: {
            ...rest,
            skillId,
            orderIndex: rest.orderIndex || 0,
            dayNumber: (rest as any).dayNumber || rest.orderIndex || 1,
            createdBy: req.user!.userId
          } as any,
          update: {
            ...rest,
            updatedAt: new Date()
          } as any
        });

        // Sync Lessons
        if (lessons && Array.isArray(lessons)) {
          for (const lessonData of lessons) {
            const { id: lId, ...lRest } = lessonData;
            await tx.skillLesson.upsert({
              where: { id: lId || "new-lesson-" + Math.random() },
              create: {
                ...lRest,
                chapterId: upsertedChapter.id,
                orderIndex: lRest.orderIndex || 0,
                createdBy: req.user!.userId
              },
              update: {
                ...lRest,
                updatedAt: new Date()
              }
            });
          }
        }

        // Sync Tasks
        if (tasks && Array.isArray(tasks)) {
          for (const taskData of tasks) {
            const { id: tId, ...tRest } = taskData;
            await tx.skillTask.upsert({
              where: { id: tId || "new-task-" + Math.random() },
              create: {
                ...tRest,
                skillId,
                chapterId: upsertedChapter.id,
                dayNumber: (tRest as any).dayNumber || (upsertedChapter as any).dayNumber || 1,
                createdBy: req.user!.userId
              } as any,
              update: {
                ...tRest,
                updatedAt: new Date()
              }
            });
          }
        }
        
        updatedChapters.push(upsertedChapter);
      }
      
      return updatedChapters;
    });

    res.json(successResponse(result));
  })
);

/**
 * PUT /api/v1/faculty/chapters/:chapterId/content
 */
router.put(
  "/chapters/:chapterId/content",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const validated = dayContentSchema.parse(req.body);

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) throw NotFoundError("Day not found");
    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      // @ts-ignore
      data: { content: validated as any },
    });

    res.json(successResponse(updated));
  })
);

/**
 * PUT /api/v1/faculty/chapters/:chapterId/technical-knowledge
 */
router.put(
  "/chapters/:chapterId/technical-knowledge",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const validated = technicalKnowledgeSchema.parse(req.body);

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) throw NotFoundError("Day not found");
    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      // @ts-ignore
      data: { technicalKnowledge: validated as any },
    });

    res.json(successResponse(updated));
  })
);

/**
 * PUT /api/v1/faculty/chapters/:chapterId/testing-measurements
 */
router.put(
  "/chapters/:chapterId/testing-measurements",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const validated = z.array(testingMeasurementSchema).parse(req.body);

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) throw NotFoundError("Day not found");
    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      // @ts-ignore
      data: { testingMeasurements: validated as any },
    });

    res.json(successResponse(updated));
  })
);

/**
 * PUT /api/v1/faculty/chapters/:chapterId/maintenance-repair
 */
router.put(
  "/chapters/:chapterId/maintenance-repair",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const validated = maintenanceRepairSchema.parse(req.body);

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) throw NotFoundError("Day not found");
    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      // @ts-ignore
      data: { maintenanceRepair: validated as any },
    });

    res.json(successResponse(updated));
  })
);

/**
 * PUT /api/v1/faculty/chapters/:chapterId/checklist-config
 */
router.put(
  "/chapters/:chapterId/checklist-config",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const validated = checklistConfigSchema.parse(req.body);

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) throw NotFoundError("Day not found");
    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      // @ts-ignore
      data: { checklistConfig: validated as any },
    });

    res.json(successResponse(updated));
  })
);

/**
 * PUT /api/v1/faculty/chapters/:chapterId/mcq-data
 */
router.put(
  "/chapters/:chapterId/mcq-data",
  asyncHandler(async (req: Request, res: Response) => {
    const chapterId = req.params.chapterId as string;
    const validated = mcqDataSchema.parse(req.body);

    const chapter = await prisma.skillChapter.findUnique({
      where: { id: chapterId },
    });

    if (!chapter) throw NotFoundError("Day not found");
    await verifyFacultyOwnsSkill(req.user!, chapter.skillId);

    const updated = await prisma.skillChapter.update({
      where: { id: chapterId },
      // @ts-ignore
      data: { mcqData: validated as any },
    });

    res.json(successResponse(updated));
  })
);

export default router;
