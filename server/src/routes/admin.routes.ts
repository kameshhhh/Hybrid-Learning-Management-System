// ============================================================
// ADMIN ROUTES
// ============================================================
//
// All admin-only endpoints for managing the HLMS system:
// - User management (create, update, delete users)
// - Student bulk upload
// - Faculty management
// - Group management
// - Skills management
// - Reports and analytics
//
// ============================================================

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { requireRole } from "../middleware/auth";
import prisma from "../config/database";
import {
  asyncHandler,
  BadRequestError,
  NotFoundError,
  ConflictError,
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
  parseStudentCSV,
  generateCSVTemplate,
  exportCredentialsCSV,
  parseFacultyCSV,
  generateFacultyCSVTemplate,
  exportUsersToCSV,
} from "../services/csvUpload.service";
import { sendWelcomeEmail } from "../services/email.service";
import {
  generatePassword,
  generateUsername,
  validatePassword,
} from "../utils/generators";
import multer from "multer";
import path from "path";
import fs from "fs";

// ===================
// ROUTER SETUP
// ===================

const router = Router();

// All routes require admin role
router.use(requireRole("admin"));

// ===================
// HELPER: Get current user ID
// ===================

const getUserId = (req: Request): string => req.user?.userId || "";

// ===================
// FILE UPLOAD CONFIG
// ===================

const csvUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = path.join(process.cwd(), "uploads", "temp");
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      cb(null, `csv-${Date.now()}-${Math.random().toString(36).slice(2)}.csv`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// ===================
// DASHBOARD STATS
// ===================

/**
 * GET /api/v1/admin/dashboard
 *
 * Returns aggregated statistics for admin dashboard
 */
router.get(
  "/dashboard",
  asyncHandler(async (req: Request, res: Response) => {
    const [
      totalStudents,
      totalFaculty,
      totalSkills,
      activeSkills,
      pendingApproval,
      recentStudents,
      recentSubmissions,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "student", isActive: true } }),
      prisma.user.count({ where: { role: "faculty", isActive: true } }),
      prisma.skill.count(),
      prisma.skill.count({ where: { status: "active" } }),
      prisma.skill.count({ where: { status: "pending_approval" } }),
      prisma.user.findMany({
        where: {
          role: "student",
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, fullName: true, email: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.dailyAssessment.findMany({
        where: {
          submittedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        include: {
          student: { select: { fullName: true } },
          task: { select: { title: true } },
          skill: { select: { name: true } },
        },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
    ]);

    res.json(
      successResponse({
        stats: {
          totalStudents,
          totalFaculty,
          totalSkills,
          activeSkills,
          pendingApproval,
        },
        recentStudents,
        recentSubmissions,
      }),
    );
  }),
);

// ===================
// USER MANAGEMENT - LIST
// ===================

/**
 * GET /api/v1/admin/users
 */
router.get(
  "/users",
  asyncHandler(async (req: Request, res: Response) => {
    const role = queryEnum(req.query.role, ["admin", "faculty", "student"]) as
      | "admin"
      | "faculty"
      | "student"
      | undefined;
    const search = queryString(req.query.search);
    const status = queryString(req.query.status);
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit,
    );

    const where: any = {};

    if (role) where.role = role;
    if (status === "active") {
      where.isActive = true;
      where.isBlocked = false;
    } else if (status === "blocked") {
      where.isBlocked = true;
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          rollNumber: true,
          isActive: true,
          isBlocked: true,
          isLoggedIn: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json(createPaginatedResponse(users, total, { page, limit, skip }));
  }),
);

/**
 * GET /api/v1/admin/users/export
 * 
 * Exports users of a specific role to CSV
 */
router.get(
  "/users/export",
  asyncHandler(async (req: Request, res: Response) => {
    const role = queryEnum(req.query.role, ["faculty", "student"]) as
      | "faculty"
      | "student";
    
    if (!role) {
      throw BadRequestError("Role (student or faculty) is required for export");
    }

    const users = await prisma.user.findMany({
      where: { role },
      orderBy: { fullName: "asc" },
    });

    const csvContent = await exportUsersToCSV(users, role);
    
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${role}s_${timestamp}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filename}`,
    );
    res.send(csvContent);
  }),
);

// ===================
// USER MANAGEMENT - GET ONE
// ===================

/**
 * GET /api/v1/admin/users/:id
 */
router.get(
  "/users/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id as string },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        rollNumber: true,
        isActive: true,
        isBlocked: true,
        isLoggedIn: true,
        lastLoginAt: true,
        lastLoginIp: true,
        lastLoginDevice: true,
        currentSessionId: true,
        createdAt: true,
        updatedAt: true,
        groupMembers: {
          include: {
            group: { select: { id: true, name: true, groupCode: true } },
          },
          where: { isActive: true },
        },
        studentSkills: {
          include: {
            skill: { select: { id: true, name: true, skillCode: true } },
          },
        },
      },
    });

    if (!user) {
      throw NotFoundError("User not found");
    }

    res.json(successResponse(user));
  }),
);

// ===================
// USER MANAGEMENT - CREATE
// ===================

/**
 * POST /api/v1/admin/users
 */
router.post(
  "/users",
  asyncHandler(async (req: Request, res: Response) => {
    const {
      email,
      fullName,
      phone,
      role,
      rollNumber,
      groupId,
      sendEmail: shouldSendEmail,
      dob,
      department,
      yearOfStudy,
      collegeName,
    } = req.body;

    if (!["faculty", "student"].includes(role)) {
      throw BadRequestError("Invalid role. Must be 'faculty' or 'student'");
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw ConflictError("Email already exists");
    }

    if (role === "student" && rollNumber) {
      const existingRoll = await prisma.user.findFirst({
        where: { rollNumber },
      });
      if (existingRoll) {
        throw ConflictError("Roll number already exists");
      }
    }

    const username = generateUsername(email);
    const plainPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const user = await prisma.user.create({
      data: {
        username,
        email: email.toLowerCase(),
        passwordHash: hashedPassword,
        fullName,
        phone,
        role,
        rollNumber: role === "student" ? rollNumber : null,
        dob: dob ? new Date(dob) : null,
        department,
        yearOfStudy,
        collegeName,
        isActive: true,
        createdBy: getUserId(req),
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    if (groupId && role === "student") {
      await prisma.groupMember.create({
        data: { groupId, studentId: user.id },
      });
    }

    if (shouldSendEmail !== false) {
      await sendWelcomeEmail(email, fullName, username, plainPassword, role);
    }

    logger.info({
      message: "User created by admin",
      userId: user.id,
      role,
      createdBy: getUserId(req),
    });

    res.status(201).json(
      successResponse({
        user,
        credentials: { username, password: plainPassword },
      }),
    );
  }),
);

// ===================
// USER MANAGEMENT - UPDATE
// ===================

/**
 * PUT /api/v1/admin/users/:id
 */
router.put(
  "/users/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { 
      fullName, phone, email, rollNumber, isActive, isBlocked,
      dob, department, yearOfStudy, collegeName, password, username
    } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw NotFoundError("User not found");
    }

    if (email && email.toLowerCase() !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      if (existingEmail) {
        throw ConflictError("Email already exists");
      }
    }
    
    if (username && username !== user.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });
      if (existingUsername) {
        throw ConflictError("Username already exists");
      }
    }

    const updateData: any = {
      username: username || user.username,
      fullName: fullName || user.fullName,
      phone: phone !== undefined ? phone : user.phone,
      email: email ? email.toLowerCase() : user.email,
      rollNumber: rollNumber ?? user.rollNumber,
      isActive: isActive ?? user.isActive,
      isBlocked: isBlocked ?? user.isBlocked,
      dob: dob ? new Date(dob) : user.dob,
      department: department ?? user.department,
      yearOfStudy: yearOfStudy ?? user.yearOfStudy,
      collegeName: collegeName ?? user.collegeName,
    };
    
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        isBlocked: true,
        updatedAt: true,
      },
    });

    logger.info({
      message: "User updated by admin",
      userId: id,
      updatedBy: getUserId(req),
    });

    res.json(successResponse(updated));
  }),
);

// ===================
// USER MANAGEMENT - DELETE
// ===================

/**
 * DELETE /api/v1/admin/users/:id
 */
router.delete(
  "/users/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw NotFoundError("User not found");
    }

    if (user.role === "admin") {
      throw BadRequestError("Cannot delete admin users");
    }

    // Soft delete
    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({
      message: "User deleted by admin",
      userId: id,
      deletedBy: getUserId(req),
    });

    res.json(messageResponse("User deleted successfully"));
  }),
);

// ===================
// ASSIGN SKILLS TO USER
// ===================

/**
 * POST /api/v1/admin/users/:id/skills
 */
router.post(
  "/users/:id/skills",
  asyncHandler(async (req: Request, res: Response) => {
    const studentId = req.params.id as string;
    const { skillIds } = req.body;

    if (!Array.isArray(skillIds)) {
      throw BadRequestError("skillIds must be an array");
    }

    const student = await prisma.user.findUnique({ where: { id: studentId, role: "student" } });
    if (!student) {
      throw NotFoundError("Student not found");
    }

    // Process assignments
    const assignments = await Promise.all(skillIds.map(async (skillId: string) => {
      return prisma.studentSkill.upsert({
        where: {
          studentId_skillId: { studentId, skillId }
        },
        update: { status: "active" },
        create: {
          studentId,
          skillId,
          assignedBy: getUserId(req)
        }
      });
    }));

    logger.info({
      message: "Skills assigned to student by admin",
      studentId,
      skillIds,
      assignedBy: getUserId(req),
    });

    res.json(successResponse({ assignments }));
  }),
);

// ===================
// BULK STUDENT UPLOAD
// ===================

/**
 * GET /api/v1/admin/students/template
 */
router.get(
  "/students/template",
  asyncHandler(async (req: Request, res: Response) => {
    const template = await generateCSVTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=students_template.csv",
    );
    res.send(template);
  }),
);

/**
 * POST /api/v1/admin/students/bulk
 */
router.post(
  "/students/bulk",
  csvUpload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw BadRequestError("No CSV file uploaded");
    }

    const result = await parseStudentCSV(req.file.path);
    fs.unlink(req.file.path, () => {});

    if (!result.success) {
      res.status(400).json({
        success: false,
        errors: result.errors,
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
      });
      return;
    }

    // Send emails in background
    Promise.all(
      result.credentials.map((cred) =>
        sendWelcomeEmail(cred.email, cred.fullName, cred.username, cred.password, "student")
          .catch((err) => logger.error(`Failed to send welcome email to ${cred.email}:`, err))
      )
    );

    const credentialsCsv = await exportCredentialsCSV(result.credentials);

    logger.info({
      message: "Bulk student upload completed",
      createdCount: result.createdCount,
      uploadedBy: getUserId(req),
    });

    res.json({
      success: true,
      message: `Successfully created ${result.createdCount} students`,
      createdCount: result.createdCount,
      credentialsCsv,
    });
  }),
);

// ===================
// BULK FACULTY UPLOAD
// ===================

/**
 * GET /api/v1/admin/faculty/template
 */
router.get(
  "/faculty/template",
  asyncHandler(async (req: Request, res: Response) => {
    const template = await generateFacultyCSVTemplate();
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=faculty_template.csv",
    );
    res.send(template);
  }),
);

/**
 * POST /api/v1/admin/faculty/bulk
 */
router.post(
  "/faculty/bulk",
  csvUpload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      throw BadRequestError("No CSV file uploaded");
    }

    const result = await parseFacultyCSV(req.file.path);
    fs.unlink(req.file.path, () => {});

    if (!result.success) {
      res.status(400).json({
        success: false,
        errors: result.errors,
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
      });
      return;
    }

    // Send emails in background
    Promise.all(
      result.credentials.map((cred) =>
        sendWelcomeEmail(cred.email, cred.fullName, cred.username, cred.password, "faculty")
          .catch((err) => logger.error(`Failed to send welcome email to ${cred.email}:`, err))
      )
    );

    const credentialsCsv = await exportCredentialsCSV(result.credentials);

    logger.info({
      message: "Bulk faculty upload completed",
      createdCount: result.createdCount,
      uploadedBy: getUserId(req),
    });

    res.json({
      success: true,
      message: `Successfully created ${result.createdCount} faculty members`,
      createdCount: result.createdCount,
      credentialsCsv,
    });
  }),
);

// ===================
// FORCE LOGOUT
// ===================

/**
 * POST /api/v1/admin/users/:id/force-logout
 */
router.post(
  "/users/:id/force-logout",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { reason } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw NotFoundError("User not found");
    }

    await prisma.session.updateMany({
      where: { userId: id, isActive: true },
      data: {
        isActive: false,
        logoutTime: new Date(),
        forcedLogoutBy: getUserId(req),
        forcedLogoutReason: reason || "Forced logout by admin",
      },
    });

    await prisma.user.update({
      where: { id },
      data: { isLoggedIn: false },
    });

    sendUserNotification(id, {
      type: "warning",
      message: reason || "You have been logged out by an administrator",
    });

    logger.info({
      message: "User force logged out",
      userId: id,
      forcedBy: getUserId(req),
      reason,
    });

    res.json(messageResponse("User logged out successfully"));
  }),
);

// ===================
// RESET PASSWORD
// ===================

/**
 * POST /api/v1/admin/users/:id/reset-password
 */
router.post(
  "/users/:id/reset-password",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { newPassword, sendEmail: shouldSendEmail } = req.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw NotFoundError("User not found");
    }

    const plainPassword = newPassword || generatePassword();

    const validation = validatePassword(plainPassword);
    if (!validation.valid) {
      throw BadRequestError(validation.errors.join(", "));
    }

    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    await prisma.user.update({
      where: { id },
      data: { passwordHash: hashedPassword },
    });

    await prisma.session.updateMany({
      where: { userId: id, isActive: true },
      data: {
        isActive: false,
        logoutTime: new Date(),
        forcedLogoutReason: "Password reset by admin",
      },
    });

    if (shouldSendEmail !== false) {
      await sendWelcomeEmail(
        user.email,
        user.fullName,
        user.username,
        plainPassword,
        user.role,
      );
    }

    logger.info({
      message: "Password reset by admin",
      userId: id,
      resetBy: getUserId(req),
    });

    res.json(
      successResponse({
        message: "Password reset successfully",
        credentials: { username: user.username, password: plainPassword },
      }),
    );
  }),
);

// ===================
// GROUP MANAGEMENT
// ===================

/**
 * GET /api/v1/admin/groups
 */
router.get(
  "/groups",
  asyncHandler(async (req: Request, res: Response) => {
    const search = queryString(req.query.search);
    const type = queryEnum(req.query.type, ["batch", "section", "custom"]) as
      | "batch"
      | "section"
      | "custom"
      | undefined;
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit,
    );

    const where: any = { isActive: true };
    if (type) where.type = type;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { groupCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [groups, total] = await Promise.all([
      prisma.group.findMany({
        where,
        include: {
          _count: { select: { members: true } },
          creator: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.group.count({ where }),
    ]);

    res.json(createPaginatedResponse(groups, total, { page, limit, skip }));
  }),
);

/**
 * POST /api/v1/admin/groups
 */
router.post(
  "/groups",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, type, description, groupCode } = req.body;

    if (!name || !type) {
      throw BadRequestError("Name and type are required");
    }

    if (groupCode) {
      const existing = await prisma.group.findUnique({ where: { groupCode } });
      if (existing) {
        throw ConflictError("Group code already exists");
      }
    }

    const group = await prisma.group.create({
      data: {
        name,
        type,
        description,
        groupCode: groupCode || `GRP-${Date.now().toString(36).toUpperCase()}`,
        createdBy: getUserId(req),
      },
    });

    logger.info({
      message: "Group created",
      groupId: group.id,
      createdBy: getUserId(req),
    });

    res.status(201).json(successResponse(group));
  }),
);

/**
 * GET /api/v1/admin/groups/:id
 */
router.get(
  "/groups/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id as string },
      include: {
        members: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                groupMembers: true,
              },
            },
          },
          where: { isActive: true },
        },
        skillAssignments: {
          include: {
            skill: { select: { id: true, name: true, skillCode: true } },
          },
        },
        creator: { select: { fullName: true } },
      },
    });

    if (!group) {
      throw NotFoundError("Group not found");
    }

    res.json(successResponse(group));
  }),
);

/**
 * PUT /api/v1/admin/groups/:id
 */
router.put(
  "/groups/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, description, isActive } = req.body;

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw NotFoundError("Group not found");
    }

    const updated = await prisma.group.update({
      where: { id },
      data: {
        name: name || group.name,
        description: description ?? group.description,
        isActive: isActive ?? group.isActive,
      },
    });

    res.json(successResponse(updated));
  }),
);

/**
 * POST /api/v1/admin/groups/:id/members
 */
router.post(
  "/groups/:id/members",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      throw BadRequestError("studentIds array is required");
    }

    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      throw NotFoundError("Group not found");
    }

    const results = await Promise.all(
      studentIds.map(async (studentId: string) => {
        try {
          await prisma.groupMember.upsert({
            where: { groupId_studentId: { groupId: id, studentId } },
            create: { groupId: id, studentId },
            update: { isActive: true, leftAt: null },
          });
          return { studentId, success: true };
        } catch {
          return { studentId, success: false };
        }
      }),
    );

    const added = results.filter((r) => r.success).length;
    res.json(
      successResponse({ message: `Added ${added} members to group`, results }),
    );
  }),
);

/**
 * DELETE /api/v1/admin/groups/:id/members/:studentId
 */
router.delete(
  "/groups/:id/members/:studentId",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const studentId = req.params.studentId as string;

    await prisma.groupMember.updateMany({
      where: { groupId: id, studentId },
      data: { isActive: false, leftAt: new Date() },
    });

    res.json(messageResponse("Member removed from group"));
  }),
);

// ===================
// SKILLS MANAGEMENT
// ===================

/**
 * GET /api/v1/admin/skills
 */
router.get(
  "/skills",
  asyncHandler(async (req: Request, res: Response) => {
    const search = queryString(req.query.search);
    const status = queryEnum(req.query.status, [
      "draft",
      "pending_approval",
      "approved",
      "rejected",
      "active",
      "archived",
    ]) as
      | "draft"
      | "pending_approval"
      | "approved"
      | "rejected"
      | "active"
      | "archived"
      | undefined;
    const { page, limit, skip } = parsePagination(
      req.query.page,
      req.query.limit,
    );

    const where: any = {};
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { skillCode: { contains: search, mode: "insensitive" } },
      ];
    }

    const [skills, total] = await Promise.all([
      prisma.skill.findMany({
        where,
        include: {
          faculty: {
            include: {
              faculty: { select: { id: true, fullName: true } },
            },
            where: { isActive: true },
          },
          _count: { select: { chapters: true, studentSkills: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.skill.count({ where }),
    ]);

    res.json(createPaginatedResponse(skills, total, { page, limit, skip }));
  }),
);

/**
 * POST /api/v1/admin/skills
 */
router.post(
  "/skills",
  asyncHandler(async (req: Request, res: Response) => {
    const { name, skillCode, description, durationWeeks } = req.body;

    // FAIL-FAST: Manual presence check
    if (!name || !skillCode) {
      return res.status(400).json({ 
        success: false, 
        message: "Validation failed", 
        error: "Skill name and skillCode are required" 
      });
    }

    try {
      const skill = await prisma.skill.create({
        data: {
          name,
          skillCode,
          description,
          durationWeeks: durationWeeks ? parseInt(String(durationWeeks)) : 4,
          createdBy: req.user!.userId,
          status: "draft"
        },
      });

      res.status(201).json(successResponse(skill));
    } catch (err: any) {
      console.error("[DEBUG] Skill Create Error:", err);
      res.status(400).json({
        success: false,
        message: "Database validation failed",
        error: err.errors || err.message
      });
    }
  }),
);

/**
 * PUT /api/v1/admin/skills/:id
 */
router.put(
  "/skills/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { name, skillCode, description, durationWeeks } = req.body;

    const existingSkill = await prisma.skill.findUnique({
      where: { id },
    });

    if (!existingSkill) {
      throw NotFoundError("Skill not found");
    }

    if (skillCode && skillCode !== existingSkill.skillCode) {
      const codeTaken = await prisma.skill.findUnique({ where: { skillCode } });
      if (codeTaken) {
        throw BadRequestError(`Skill code ${skillCode} is already in use`);
      }
    }

    try {
      const updatedSkill = await prisma.skill.update({
        where: { id },
        data: {
          name: name || existingSkill.name,
          skillCode: skillCode || existingSkill.skillCode,
          description: description ?? existingSkill.description,
          durationWeeks: durationWeeks ? parseInt(String(durationWeeks)) : existingSkill.durationWeeks,
        },
      });

      res.json(successResponse(updatedSkill));
    } catch (err: any) {
      console.error("[DEBUG] Skill Update Error:", err);
      res.status(400).json({
        success: false,
        message: "Update validation failed",
        error: err.errors || err.message
      });
    }
  })
);

/**
 * GET /api/v1/admin/skills/:id
 */
router.get(
  "/skills/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        faculty: {
          include: {
            faculty: { select: { id: true, fullName: true, email: true } },
          },
        },
        chapters: {
          orderBy: { orderIndex: "asc" },
          include: {
            _count: { select: { lessons: true } },
          },
        },
        groupAssignments: {
          include: {
            group: { select: { id: true, name: true, groupCode: true } },
          },
        },
        _count: { select: { studentSkills: true } },
        creator: { select: { fullName: true } },
      },
    });

    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    res.json(successResponse(skill));
  }),
);

/**
 * PUT /api/v1/admin/skills/:id
 */
router.put(
  "/skills/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const durationWeeks: string = req.body.durationWeeks;
    const { name, description, status } = req.body;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) {
      throw NotFoundError("Skill not found");
    }

    const updated = await prisma.skill.update({
      where: { id },
      data: {
        name: name || skill.name,
        description: description ?? skill.description,
        durationWeeks: durationWeeks
          ? parseInt(durationWeeks)
          : skill.durationWeeks,
        status: status || skill.status,
      },
    });

    res.json(successResponse(updated));
  }),
);

/**
 * POST /api/v1/admin/skills/:id/approve
 */
router.post(
  "/skills/:id/approve",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) throw NotFoundError("Skill not found");
    if (skill.status !== "pending_approval") {
      throw BadRequestError("Skill is not pending approval");
    }

    await prisma.skill.update({
      where: { id },
      data: {
        status: "approved",
        approvedBy: getUserId(req),
        approvedAt: new Date(),
      },
    });

    logger.info({
      message: "Skill approved",
      skillId: id,
      approvedBy: getUserId(req),
    });
    res.json(messageResponse("Skill approved successfully"));
  }),
);

/**
 * POST /api/v1/admin/skills/:id/reject
 */
router.post(
  "/skills/:id/reject",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { reason } = req.body;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) throw NotFoundError("Skill not found");

    await prisma.skill.update({
      where: { id },
      data: { status: "rejected", rejectionReason: reason },
    });

    logger.info({
      message: "Skill rejected",
      skillId: id,
      rejectedBy: getUserId(req),
      reason,
    });
    res.json(messageResponse("Skill rejected"));
  }),
);

/**
 * POST /api/v1/admin/skills/:id/activate
 */
router.post(
  "/skills/:id/activate",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) throw NotFoundError("Skill not found");
    if (skill.status !== "approved") {
      throw BadRequestError("Only approved skills can be activated");
    }

    await prisma.skill.update({
      where: { id },
      data: { status: "active" },
    });

    res.json(messageResponse("Skill activated"));
  }),
);

/**
 * POST /api/v1/admin/skills/:id/assign-group
 */
router.post(
  "/skills/:id/assign-group",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;
    const { groupId } = req.body;

    const skill = await prisma.skill.findUnique({ where: { id } });
    if (!skill) throw NotFoundError("Skill not found");

    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: {
        members: { where: { isActive: true }, select: { studentId: true } },
      },
    });
    if (!group) throw NotFoundError("Group not found");

    await prisma.skillGroupAssignment.upsert({
      where: { skillId_groupId: { skillId: id, groupId } },
      create: { skillId: id, groupId, assignedBy: getUserId(req) },
      update: {},
    });

    const enrollments = group.members.map((m) => ({
      studentId: m.studentId,
      skillId: id,
      assignedById: getUserId(req),
      groupId,
    }));

    for (const enrollment of enrollments) {
      await prisma.studentSkill.upsert({
        where: {
          studentId_skillId: {
            studentId: enrollment.studentId,
            skillId: enrollment.skillId,
          },
        },
        create: enrollment,
        update: { status: "active" },
      });
    }

    res.json(
      successResponse({
        message: `Skill assigned to group. ${enrollments.length} students enrolled.`,
        enrolledCount: enrollments.length,
      }),
    );
  }),
);

// ===================
// REPORTS
// ===================

/**
 * GET /api/v1/admin/reports/overview
 */
router.get(
  "/reports/overview",
  asyncHandler(async (req: Request, res: Response) => {
    const [
      totalUsers,
      usersByRole,
      skillsByStatus,
      recentEnrollments,
      completionRate,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ["role"],
        _count: true,
        where: { isActive: true },
      }),
      prisma.skill.groupBy({ by: ["status"], _count: true }),
      prisma.studentSkill.count({
        where: {
          assignedAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.studentSkill.aggregate({ _avg: { progressPercentage: true } }),
    ]);

    res.json(
      successResponse({
        totalUsers,
        usersByRole: usersByRole.reduce(
          (acc, r) => {
            acc[r.role] = r._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        skillsByStatus: skillsByStatus.reduce(
          (acc, s) => {
            acc[s.status] = s._count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        averageProgress: completionRate._avg.progressPercentage || 0,
        recentEnrollments,
      }),
    );
  }),
);

/**
 * GET /api/v1/admin/reports/master-data
 * Fast scalable endpoint pulling decoupled arrays for frontend UI merging and export
 */
router.get(
  "/reports/master-data",
  asyncHandler(async (req: Request, res: Response) => {
    // 1. Fetch Students (Lean)
    const students = await prisma.user.findMany({
      where: { role: "student" },
      select: {
        id: true,
        fullName: true,
        username: true,
        email: true,
        department: true,
        yearOfStudy: true,
        collegeName: true,
        isActive: true,
        isBlocked: true,
      }
    });

    // 2. Fetch Skills (Lean but inclusive of metrics)
    const skills = await prisma.skill.findMany({
      select: {
        id: true,
        skillCode: true,
        name: true,
        status: true,
        durationWeeks: true,
        faculty: {
          select: {
             faculty: { select: { fullName: true } }
          }
        },
        _count: {
          select: { studentSkills: true, tasks: true }
        }
      }
    });

    // 3. Fetch Enrollments & Submissions (Lean)
    const enrollments = await prisma.studentSkill.findMany({
      select: {
        studentId: true,
        skillId: true,
        status: true,
        progressPercentage: true,
        totalTasksCompleted: true,
        totalMarksObtained: true,
        assignedAt: true,
        completedAt: true,
      }
    });

    // 4. Progress Logs count per student-skill
    const logs = await prisma.skillProgressLog.groupBy({
       by: ['studentId', 'skillId'],
       _count: true
    });

    res.json(successResponse({ students, skills, enrollments, logs }));
  })
);

/**
 * GET /api/v1/admin/reports/skill/:id
 */
router.get(
  "/reports/skill/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const id = req.params.id as string;

    const skill = await prisma.skill.findUnique({
      where: { id },
      include: {
        studentSkills: {
          include: {
            student: { select: { fullName: true, rollNumber: true } },
          },
        },
        chapters: { include: { _count: { select: { lessons: true } } } },
      },
    });

    if (!skill) throw NotFoundError("Skill not found");

    const enrolledCount = skill.studentSkills.length;
    const completedCount = skill.studentSkills.filter(
      (s) => s.status === "completed",
    ).length;
    const droppedCount = skill.studentSkills.filter(
      (s) => s.status === "dropped",
    ).length;
    const avgProgress =
      enrolledCount > 0
        ? skill.studentSkills.reduce(
            (sum, s) => sum + Number(s.progressPercentage),
            0,
          ) / enrolledCount
        : 0;

    res.json(
      successResponse({
        skill: { id: skill.id, name: skill.name, skillCode: skill.skillCode },
        stats: {
          enrolledCount,
          completedCount,
          droppedCount,
          activeCount: enrolledCount - completedCount - droppedCount,
          completionRate:
            enrolledCount > 0 ? (completedCount / enrolledCount) * 100 : 0,
          averageProgress: avgProgress,
        },
        enrollments: skill.studentSkills.map((s) => ({
          studentName: s.student.fullName,
          rollNumber: s.student.rollNumber,
          progress: s.progressPercentage,
          status: s.status,
        })),
      }),
    );
  }),
);

export default router;
