// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
//
// Middleware for authenticating requests using JWT tokens.
// Also provides role-based access control.
//
// ============================================================

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/database";
import { UnauthorizedError, ForbiddenError } from "./errorHandler";
import { logger } from "../utils/logger";

// ===================
// TYPE DEFINITIONS
// ===================

/**
 * JWT payload structure
 * Contains the essential user information encoded in the token
 */
export interface JwtPayload {
  userId: string;
  sessionId: string;
  role: "admin" | "faculty" | "student";
  iat?: number;
  exp?: number;
}

/**
 * Extend Express Request type to include user information
 * This allows TypeScript to recognize req.user in route handlers
 */
declare global {
  namespace Express {
    interface Request {
      params: Record<string, string>;
      user?: JwtPayload & {
        fullName: string;
        email: string;
        username: string;
      };
    }
  }
}

// ===================
// JWT SECRET
// ===================

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

// ===================
// AUTH MIDDLEWARE
// ===================

/**
 * Authentication middleware
 *
 * Validates JWT token from Authorization header and:
 * 1. Decodes and verifies the token
 * 2. Checks if user exists and is active
 * 3. Validates session (single-device login)
 * 4. Attaches user info to request
 *
 * Usage: app.use('/protected', authMiddleware);
 */
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    // ===================
    // EXTRACT TOKEN
    // ===================

    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw UnauthorizedError("No token provided", "NO_TOKEN");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      throw UnauthorizedError("Invalid token format", "INVALID_TOKEN_FORMAT");
    }

    // ===================
    // VERIFY TOKEN
    // ===================

    let decoded: JwtPayload;

    try {
      decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch (err) {
      if ((err as any).name === "TokenExpiredError") {
        throw UnauthorizedError("Token has expired", "TOKEN_EXPIRED");
      }
      throw UnauthorizedError("Invalid token", "INVALID_TOKEN");
    }

    // ===================
    // VALIDATE USER
    // ===================

    // Fetch user from database to ensure they still exist and are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isBlocked: true,
        currentSessionId: true,
      },
    });

    // Check if user exists
    if (!user) {
      throw UnauthorizedError("User not found", "USER_NOT_FOUND");
    }

    // Check if user is active
    if (!user.isActive) {
      throw UnauthorizedError(
        "Account has been deactivated",
        "ACCOUNT_DEACTIVATED",
      );
    }

    // Check if user is blocked
    if (user.isBlocked) {
      throw UnauthorizedError("Account has been blocked", "ACCOUNT_BLOCKED");
    }

    // ===================
    // VALIDATE SESSION (Single Device Login)
    // ===================

    /**
     * Single Device Login Check
     *
     * If the session ID in the token doesn't match the user's
     * current session ID, it means they logged in from another
     * device and this session is now invalid.
     */
    if (user.currentSessionId && user.currentSessionId !== decoded.sessionId) {
      // Check if this session still exists and is active
      const session = await prisma.session.findUnique({
        where: { id: decoded.sessionId },
      });

      if (!session || !session.isActive) {
        throw UnauthorizedError(
          "You have been logged out due to login from another device",
          "SESSION_INVALIDATED",
        );
      }
    }

    // ===================
    // ATTACH USER TO REQUEST
    // ===================

    // Add user information to request for use in route handlers
    req.user = {
      userId: user.id,
      sessionId: decoded.sessionId,
      role: user.role,
      fullName: user.fullName,
      email: user.email,
      username: user.username,
    };

    // Update session last activity
    await prisma.session
      .update({
        where: { id: decoded.sessionId },
        data: { lastActivity: new Date() },
      })
      .catch(() => {
        // Ignore session update errors (session might not exist)
      });

    next();
  } catch (error) {
    next(error);
  }
};

// ===================
// ROLE-BASED ACCESS CONTROL
// ===================

/**
 * Role check middleware factory
 *
 * Creates middleware that allows only specific roles to access a route.
 * Should be used AFTER authMiddleware.
 *
 * Usage:
 * router.get('/admin-only', authMiddleware, requireRole('admin'), handler);
 * router.get('/staff-only', authMiddleware, requireRole('admin', 'faculty'), handler);
 */
export const requireRole = (
  ...allowedRoles: ("admin" | "faculty" | "student")[]
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Ensure user is authenticated
    if (!req.user) {
      return next(
        UnauthorizedError("Authentication required", "AUTH_REQUIRED"),
      );
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn({
        message: "Access denied - insufficient role",
        userId: req.user.userId,
        userRole: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return next(
        ForbiddenError(
          "You do not have permission to access this resource",
          "INSUFFICIENT_ROLE",
        ),
      );
    }

    next();
  };
};

// ===================
// CONVENIENCE MIDDLEWARES
// ===================

/**
 * Pre-configured role middlewares for common use cases
 */

// Only admins can access
export const adminOnly = requireRole("admin");

// Only faculty can access
export const facultyOnly = requireRole("faculty");

// Only students can access
export const studentOnly = requireRole("student");

// Admins and faculty can access
export const staffOnly = requireRole("admin", "faculty");

// ===================
// OPTIONAL AUTH MIDDLEWARE
// ===================

/**
 * Optional authentication middleware
 *
 * Similar to authMiddleware but doesn't throw errors.
 * If a valid token is present, attaches user to request.
 * If no token or invalid token, continues without user.
 *
 * Useful for routes that have different behavior for
 * authenticated vs unauthenticated users.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(); // No token, continue without user
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return next(); // Empty token, continue without user
    }

    // Try to verify token
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

    // Fetch minimal user info
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        isBlocked: true,
      },
    });

    // If user is valid, attach to request
    if (user && user.isActive && !user.isBlocked) {
      req.user = {
        userId: user.id,
        sessionId: decoded.sessionId,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
        username: user.username,
      };
    }

    next();
  } catch {
    // Any error, just continue without user
    next();
  }
};
