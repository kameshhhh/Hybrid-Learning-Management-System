// ============================================================
// AUTHENTICATION ROUTES
// ============================================================
//
// Handles all authentication-related endpoints:
// - Login (with device management for single-device login)
// - Logout
// - Password reset
// - Current user info
// - Force logout (admin only)
//
// ============================================================

import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import prisma from "../config/database";
import { authMiddleware, requireRole } from "../middleware/auth";
import {
  asyncHandler,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from "../middleware/errorHandler";
import { logger } from "../utils/logger";
import { forceUserLogout } from "../socket";

// ===================
// ROUTER SETUP
// ===================

const router = Router();

// ===================
// CONSTANTS
// ===================

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ||
  "7d") as jwt.SignOptions["expiresIn"];

// Password validation regex (min 8 chars, uppercase, lowercase, number, special char)
const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Generate JWT token for authenticated user
 *
 * Token contains:
 * - userId: For identifying the user
 * - sessionId: For single-device login validation
 * - role: For role-based access control
 */
const generateToken = (
  userId: string,
  sessionId: string,
  role: string,
): string => {
  return jwt.sign({ userId, sessionId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

/**
 * Parse device info from request
 * Used for tracking login devices
 */
const getDeviceInfo = (req: Request): string => {
  const userAgent = req.headers["user-agent"] || "Unknown";
  const deviceInfo = req.headers["x-device-info"] || "";
  return `${userAgent} | ${deviceInfo}`;
};

/**
 * Get client IP address
 */
const getClientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return (typeof forwarded === "string" ? forwarded : forwarded[0])
      .split(",")[0]
      .trim();
  }
  return req.ip || req.socket.remoteAddress || "Unknown";
};

// ===================
// LOGIN ENDPOINT
// ===================

/**
 * POST /api/v1/auth/login
 *
 * Authenticates user and returns JWT token.
 * Implements single-device login by invalidating previous sessions.
 *
 * Request Body:
 * - identifier: User identifier (username or email)
 * - password: User password
 *
 * Response:
 * - user: User details
 * - token: JWT access token
 */
router.post(
  "/login",
  asyncHandler(async (req: Request, res: Response) => {
    const { identifier, password } = req.body;

    // Validate input
    if (!identifier || !password) {
      throw BadRequestError("Username/email and password are required");
    }

    // Find user by username or email.
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: identifier.toLowerCase() },
          { email: identifier.toLowerCase() },
        ],
      },
    });

    // Check if user exists
    if (!user) {
      throw UnauthorizedError("Invalid credentials");
    }

    // Check if account is active
    if (!user.isActive) {
      throw UnauthorizedError("Account has been deactivated");
    }

    // Check if account is blocked
    if (user.isBlocked) {
      throw UnauthorizedError(
        `Account is blocked: ${user.blockReason || "Contact administrator"}`,
      );
    }

    // Check if account is locked due to too many failed attempts
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const unlockTime = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000,
      );
      throw UnauthorizedError(
        `Account is locked. Try again in ${unlockTime} minutes`,
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = user.failedLoginAttempts + 1;

      // Lock account after 5 failed attempts for 15 minutes
      const lockData =
        failedAttempts >= 5
          ? { lockedUntil: new Date(Date.now() + 15 * 60 * 1000) }
          : {};

      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          ...lockData,
        },
      });

      throw UnauthorizedError("Invalid credentials");
    }

    // ===================
    // SINGLE-DEVICE LOGIN HANDLING
    // ===================

    /**
     * When a user logs in from a new device:
     * 1. Invalidate any existing sessions
     * 2. Create a new session
     * 3. Update user's current session ID
     * 4. Notify old device via Socket.io
     */

    // Invalidate all existing active sessions for this user
    const existingSession = await prisma.session.findFirst({
      where: {
        userId: user.id,
        isActive: true,
      },
    });

    // Get io instance for real-time logout notification
    const io = req.app.get("io");

    if (existingSession) {
      // Mark old session as inactive
      await prisma.session.update({
        where: { id: existingSession.id },
        data: {
          isActive: false,
          logoutTime: new Date(),
          forcedLogoutReason: "New login from another device",
        },
      });

      // Send real-time logout notification to old device
      if (io) {
        forceUserLogout(
          io,
          user.id,
          "You have been logged out due to login from another device",
        );
      }

      logger.info(`Previous session invalidated for user ${user.id}`);
    }

    // ===================
    // CREATE NEW SESSION
    // ===================

    const sessionId = uuidv4();
    const deviceInfo = getDeviceInfo(req);
    const ipAddress = getClientIp(req);

    // Create session record
    await prisma.session.create({
      data: {
        id: sessionId,
        userId: user.id,
        sessionToken: uuidv4(), // This should be a secure random token
        deviceInfo,
        ipAddress,
        isActive: true,
      },
    });

    // Update user login info
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isLoggedIn: true,
        currentSessionId: sessionId,
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
        lastLoginDevice: deviceInfo,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // Generate JWT token
    const token = generateToken(user.id, sessionId, user.role);

    // Log successful login
    logger.info(`User ${user.username} logged in from ${ipAddress}`);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: "LOGIN",
        entityType: "user",
        entityId: user.id,
        newValues: { ip: ipAddress, device: deviceInfo },
        ipAddress,
      },
    });

    // Return response
    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          phone: user.phone,
        },
        token,
      },
      message: "Login successful",
    });
  }),
);

// ===================
// LOGOUT ENDPOINT
// ===================

/**
 * POST /api/v1/auth/logout
 *
 * Logs out the current user by invalidating their session.
 * Requires authentication.
 */
router.post(
  "/logout",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId, sessionId } = req.user!;

    // Invalidate the session
    await prisma.session.update({
      where: { id: sessionId },
      data: {
        isActive: false,
        logoutTime: new Date(),
      },
    });

    // Update user login status
    await prisma.user.update({
      where: { id: userId },
      data: {
        isLoggedIn: false,
        currentSessionId: null,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "LOGOUT",
        entityType: "user",
        entityId: userId,
        ipAddress: getClientIp(req),
      },
    });

    logger.info(`User ${userId} logged out`);

    res.json({
      success: true,
      message: "Logout successful",
    });
  }),
);

// ===================
// CURRENT USER ENDPOINT
// ===================

/**
 * GET /api/v1/auth/me
 *
 * Returns the current authenticated user's details.
 * Used by frontend to validate token and get user info.
 */
router.get(
  "/me",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw NotFoundError("User not found");
    }

    res.json({
      success: true,
      data: { user },
    });
  }),
);

// ===================
// CHANGE PASSWORD ENDPOINT
// ===================

/**
 * POST /api/v1/auth/change-password
 *
 * Allows user to change their password.
 * Requires current password for verification.
 */
router.post(
  "/change-password",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!;
    const { currentPassword, newPassword } = req.body;

    // Validate input
    if (!currentPassword || !newPassword) {
      throw BadRequestError("Current password and new password are required");
    }

    // Validate new password strength
    if (!PASSWORD_REGEX.test(newPassword)) {
      throw BadRequestError(
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character",
      );
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw NotFoundError("User not found");
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw UnauthorizedError("Current password is incorrect");
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        passwordChangedAt: new Date(),
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId,
        action: "PASSWORD_CHANGE",
        entityType: "user",
        entityId: userId,
        ipAddress: getClientIp(req),
      },
    });

    logger.info(`Password changed for user ${userId}`);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  }),
);

// ===================
// FORCE LOGOUT ENDPOINT (Admin Only)
// ===================

/**
 * POST /api/v1/auth/force-logout/:userId
 *
 * Allows admin to force logout a user from their current session.
 * Used for security purposes or when a user forgets to logout.
 */
router.post(
  "/force-logout/:userId",
  authMiddleware,
  requireRole("admin"),
  asyncHandler(async (req: Request, res: Response) => {
    const targetUserId = req.params.userId as string;
    const { reason } = req.body;
    const adminUserId = req.user!.userId;

    // Validate target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        userSessions: {
          where: { isActive: true },
        },
      },
    });

    if (!targetUser) {
      throw NotFoundError("User not found");
    }

    // Prevent self-logout via this endpoint
    if (targetUserId === adminUserId) {
      throw BadRequestError(
        "Cannot force logout yourself. Use regular logout.",
      );
    }

    // Invalidate all active sessions
    await prisma.session.updateMany({
      where: {
        userId: targetUserId,
        isActive: true,
      },
      data: {
        isActive: false,
        logoutTime: new Date(),
        forcedLogoutBy: adminUserId,
        forcedLogoutReason: reason || "Forced logout by admin",
      },
    });

    // Update user login status
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isLoggedIn: false,
        currentSessionId: null,
      },
    });

    // Send real-time logout notification
    const io = req.app.get("io");
    if (io) {
      forceUserLogout(
        io,
        targetUserId,
        reason || "You have been logged out by an administrator",
      );
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: "FORCE_LOGOUT",
        entityType: "user",
        entityId: targetUserId,
        newValues: { reason },
        ipAddress: getClientIp(req),
      },
    });

    logger.info(`Admin ${adminUserId} force logged out user ${targetUserId}`);

    res.json({
      success: true,
      message: `User ${targetUser.username} has been logged out`,
    });
  }),
);

// ===================
// ACTIVE SESSIONS ENDPOINT
// ===================

/**
 * GET /api/v1/auth/sessions
 *
 * Returns the current user's active sessions.
 * Useful for showing login history.
 */
router.get(
  "/sessions",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.user!;

    const sessions = await prisma.session.findMany({
      where: { userId },
      orderBy: { loginTime: "desc" },
      take: 10,
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        loginTime: true,
        lastActivity: true,
        logoutTime: true,
        isActive: true,
        forcedLogoutBy: true,
        forcedLogoutReason: true,
      },
    });

    res.json({
      success: true,
      data: { sessions },
    });
  }),
);

// ===================
// CHECK SESSION STATUS
// ===================

/**
 * GET /api/v1/auth/session-status
 *
 * Quick check if current session is still valid.
 * Frontend polls this to detect forced logouts.
 */
router.get(
  "/session-status",
  authMiddleware,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.user!;

    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { isActive: true },
    });

    if (!session || !session.isActive) {
      throw UnauthorizedError(
        "Session is no longer valid",
        "SESSION_INVALIDATED",
      );
    }

    res.json({
      success: true,
      data: { valid: true },
    });
  }),
);

export default router;
