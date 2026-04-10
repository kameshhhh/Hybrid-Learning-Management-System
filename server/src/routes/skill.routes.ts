// ============================================================
// SKILL ROUTES (MIXED ACCESS)
// ============================================================
//
// Routes for viewing skills and content.
// Access varies by endpoint and user role.
//
// ============================================================

import { Router, Request, Response } from "express";
import prisma from "../config/database";
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from "../middleware/errorHandler";
import { requireRole } from "../middleware/auth";
import { logger } from "../utils/logger";

// ===================
// ROUTER SETUP
// ===================

const router = Router();

// ===================
// ADMIN: CREATE SKILL
// ===================

/**
 * POST /api/v1/skills
 *
 * Creates a new skill. Admin only.
 */
router.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const {
      skillCode,
      name,
      description,
      durationWeeks,
      thumbnailUrl,
      coverImageUrl,
    } = req.body;
    const adminId = req.user!.userId;

    if (!skillCode || !name || !durationWeeks) {
      throw BadRequestError(
        "Skill code, name, and duration weeks are required",
      );
    }

    // Check for existing skill code
    const existing = await prisma.skill.findUnique({
      where: { skillCode },
    });

    if (existing) {
      throw BadRequestError("Skill code already exists");
    }

    // Create skill
    const skill = await prisma.skill.create({
      data: {
        skillCode,
        name,
        description,
        durationWeeks: parseInt(durationWeeks),
        thumbnailUrl,
        coverImageUrl,
        createdBy: adminId,
        status: "draft",
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "CREATE_SKILL",
        entityType: "skill",
        entityId: skill.id,
        newValues: { skillCode, name },
      },
    });

    logger.info(`Admin ${adminId} created skill ${skill.id}`);

    res.status(201).json({
      success: true,
      data: { skill },
      message: "Skill created successfully",
    });
  }),
);

// ===================
// ADMIN: LIST ALL SKILLS
// ===================

/**
 * GET /api/v1/skills
 *
 * Returns skills based on user role:
 * - Admin: All skills
 * - Faculty: Assigned skills only
 * - Student: Enrolled skills only
 */
router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, role } = req.user!;
    const { status, search, page = "1", limit = "20" } = req.query;

    // Build where clause based on role
    let where: any = {};

    if (role === "admin") {
      // Admin sees all skills
      if (status) where.status = status;
    } else if (role === "faculty") {
      // Faculty sees only assigned skills
      const assignments = await prisma.skillFaculty.findMany({
        where: { facultyId: userId, isActive: true },
        select: { skillId: true },
      });
      where.id = { in: assignments.map((a) => a.skillId) };
    } else if (role === "student") {
      // Student sees all active skills
      where.status = "active";
    }

    // Add search filter
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: "insensitive" } },
        { skillCode: { contains: String(search), mode: "insensitive" } },
      ];
    }

    // Pagination
    const pageNum = Math.max(1, parseInt(String(page)));
    const limitNum = Math.min(50, Math.max(1, parseInt(String(limit))));

    // Execute query
    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: {
          _count: {
            select: {
              chapters: true,
              tasks: true,
              studentSkills: true,
            },
          },
          faculty: {
            where: { isActive: true },
            include: {
              faculty: { select: { fullName: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.skill.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        skills,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  }),
);

// ===================
// GET SINGLE SKILL
// ===================

/**
 * GET /api/v1/skills/:id
 *
 * Returns skill details based on user role.
 */
router.get(
  "/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.id as string;
    const { userId, role } = req.user!;

    // Get skill
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
      include: {
        chapters: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
            },
          },
        },
        tasks: {
          orderBy: { dayNumber: "asc" },
        },
        faculty: {
          where: { isActive: true },
          include: {
            faculty: { select: { id: true, fullName: true } },
          },
        },
        _count: {
          select: { studentSkills: { where: { status: "active" } } },
        },
      },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    // Check access based on role
    if (role === "faculty") {
      const hasAccess = skill.faculty.some((f) => f.facultyId === userId);
      if (!hasAccess) {
        throw ForbiddenError("You do not have access to this skill");
      }
    } else if (role === "student") {
      const enrollment = await prisma.studentSkill.findUnique({
        where: { studentId_skillId: { studentId: userId, skillId } },
      });
      if (!enrollment) {
        throw ForbiddenError("You are not enrolled in this skill");
      }

      // For students, filter to only approved content
      skill.chapters = skill.chapters
        .filter((c) => c.status === "approved")
        .map((c) => ({
          ...c,
          lessons: c.lessons.filter((l) => l.status === "approved"),
        }));
      skill.tasks = skill.tasks.filter((t) => t.status === "approved");
    }

    res.json({
      success: true,
      data: { skill },
    });
  }),
);

// ===================
// ADMIN: UPDATE SKILL
// ===================

/**
 * PUT /api/v1/skills/:id
 *
 * Updates a skill. Admin only.
 */
router.put(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.id as string;
    const adminId = req.user!.userId;
    const {
      name,
      description,
      durationWeeks,
      thumbnailUrl,
      coverImageUrl,
      status,
    } = req.body;

    // Check skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      throw NotFoundError("Skill not found");
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (durationWeeks !== undefined)
      updateData.durationWeeks = parseInt(durationWeeks);
    if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
    if (coverImageUrl !== undefined) updateData.coverImageUrl = coverImageUrl;
    if (status !== undefined) {
      updateData.status = status;
      if (status === "approved") {
        updateData.approvedAt = new Date();
        updateData.approvedById = adminId;
      }
    }

    // Update skill
    const skill = await prisma.skill.update({
      where: { id: skillId },
      data: updateData,
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "UPDATE_SKILL",
        entityType: "skill",
        entityId: skillId,
        oldValues: existingSkill,
        newValues: updateData,
      },
    });

    res.json({
      success: true,
      data: { skill },
      message: "Skill updated successfully",
    });
  }),
);

// ===================
// ADMIN: DELETE SKILL
// ===================

/**
 * DELETE /api/v1/skills/:id
 *
 * Archives a skill. Admin only.
 */
router.delete(
  "/:id",
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.id as string;
    const adminId = req.user!.userId;

    // Check skill exists
    const existingSkill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!existingSkill) {
      throw NotFoundError("Skill not found");
    }

    // Archive instead of hard delete
    await prisma.skill.update({
      where: { id: skillId },
      data: { status: "archived" },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "DELETE_SKILL",
        entityType: "skill",
        entityId: skillId,
        oldValues: { status: existingSkill.status },
      },
    });

    res.json({
      success: true,
      message: "Skill archived successfully",
    });
  }),
);

// ===================
// ADMIN: ASSIGN FACULTY
// ===================

/**
 * POST /api/v1/skills/:id/faculty
 *
 * Assigns faculty to a skill. Admin only.
 */
router.post(
  "/:id/faculty",
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.id as string;
    const { facultyId, isPrimary = false } = req.body;
    const adminId = req.user!.userId;

    if (!facultyId) {
      throw BadRequestError("Faculty ID is required");
    }

    // Verify skill exists
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    // Verify faculty exists and is faculty role
    const faculty = await prisma.user.findUnique({
      where: { id: facultyId },
    });

    if (!faculty || faculty.role !== "faculty") {
      throw BadRequestError("Invalid faculty ID");
    }

    // If setting as primary, remove primary from others
    if (isPrimary) {
      await prisma.skillFaculty.updateMany({
        where: { skillId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Upsert assignment
    const assignment = await prisma.skillFaculty.upsert({
      where: {
        skillId_facultyId: { skillId, facultyId },
      },
      update: {
        isActive: true,
        isPrimary,
        removedAt: null,
        removedBy: null,
        removalReason: null,
      },
      create: {
        skillId,
        facultyId,
        assignedBy: adminId,
        isPrimary,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "ASSIGN_FACULTY",
        entityType: "skill",
        entityId: skillId,
        newValues: { facultyId, facultyName: faculty.fullName, isPrimary },
      },
    });

    res.json({
      success: true,
      data: { assignment },
      message: `${faculty.fullName} assigned to skill`,
    });
  }),
);

// ===================
// ADMIN: REMOVE FACULTY
// ===================

/**
 * DELETE /api/v1/skills/:id/faculty/:facultyId
 *
 * Removes faculty from a skill. Admin only.
 */
router.delete(
  "/:id/faculty/:facultyId",
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.id as string;
    const facultyId = req.params.facultyId as string;
    const { reason } = req.body;
    const adminId = req.user!.userId;

    // Update assignment
    const assignment = await prisma.skillFaculty.update({
      where: {
        skillId_facultyId: { skillId, facultyId },
      },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedBy: adminId,
        removalReason: reason,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "REMOVE_FACULTY",
        entityType: "skill",
        entityId: skillId,
        newValues: { facultyId, reason },
      },
    });

    res.json({
      success: true,
      message: "Faculty removed from skill",
    });
  }),
);

// ===================
// ADMIN: ASSIGN STUDENT
// ===================

/**
 * POST /api/v1/skills/:id/students
 *
 * Assigns students to a skill. Admin only.
 */
router.post(
  "/:id/students",
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const skillId = req.params.id as string;
    const { studentIds } = req.body;
    const adminId = req.user!.userId;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      throw BadRequestError("Student IDs array is required");
    }

    // Verify skill exists and is active
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    // Verify all students exist and are students
    const students = await prisma.user.findMany({
      where: { id: { in: studentIds }, role: "student" },
    });

    if (students.length !== studentIds.length) {
      throw BadRequestError("Some student IDs are invalid");
    }

    // Upsert enrollments
    const operations = studentIds.map((studentId) =>
      prisma.studentSkill.upsert({
        where: {
          studentId_skillId: { studentId, skillId },
        },
        update: {
          status: "active",
          droppedAt: null,
          dropReason: null,
        },
        create: {
          studentId,
          skillId,
          assignedBy: adminId,
        },
      }),
    );

    await prisma.$transaction(operations);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminId,
        action: "ASSIGN_STUDENTS",
        entityType: "skill",
        entityId: skillId,
        newValues: { studentIds, count: studentIds.length },
      },
    });

    res.json({
      success: true,
      message: `${studentIds.length} student(s) assigned to skill`,
    });
  }),
);

export default router;
