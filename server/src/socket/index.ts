// ============================================================
// SOCKET.IO HANDLERS
// ============================================================
//
// Real-time communication handlers for the HLMS application.
// Handles user connections, room management, and real-time events.
//
// ============================================================

import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "../utils/logger";
import prisma from "../config/database";

// ===================
// TYPE DEFINITIONS
// ===================

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  sessionId?: string;
}

interface NotificationPayload {
  title?: string;
  message: string;
  type: string;
  actionUrl?: string;
  data?: unknown;
}

// ===================
// JWT SECRET
// ===================

const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";

let activeIo: Server | null = null;

// ===================
// SOCKET AUTHENTICATION
// ===================

/**
 * Authenticate socket connections using JWT token
 *
 * Token is passed via the auth.token field during connection
 * socket.io-client: io(url, { auth: { token: 'xxx' } })
 */
const authenticateSocket = async (
  socket: AuthenticatedSocket,
): Promise<boolean> => {
  try {
    const token = socket.handshake.auth.token;

    if (!token) {
      logger.debug("Socket connection without token");
      return false;
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      sessionId: string;
      role: string;
    };

    // Verify user exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        isActive: true,
        isBlocked: true,
        currentSessionId: true,
      },
    });

    if (!user || !user.isActive || user.isBlocked) {
      return false;
    }

    // Attach user info to socket
    socket.userId = user.id;
    socket.userRole = user.role;
    socket.sessionId = decoded.sessionId;

    return true;
  } catch (error) {
    logger.debug("Socket authentication failed:", error);
    return false;
  }
};

// ===================
// MAIN HANDLER INIT
// ===================

/**
 * Initialize all Socket.io event handlers
 *
 * This function is called from the main server file
 * and sets up all real-time communication features.
 */
export const initSocketHandlers = (io: Server): void => {
  activeIo = io;

  // ===================
  // AUTHENTICATION MIDDLEWARE
  // ===================

  /**
   * Socket.io middleware for authentication
   * Runs on every new connection before allowing access
   */
  io.use(async (socket: AuthenticatedSocket, next) => {
    const authenticated = await authenticateSocket(socket);

    // Allow connection even if not authenticated
    // (public features may not require auth)
    next();
  });

  // ===================
  // CONNECTION HANDLER
  // ===================

  io.on("connection", async (socket: AuthenticatedSocket) => {
    logger.info(
      `Socket connected: ${socket.id}, User: ${socket.userId || "anonymous"}`,
    );

    // ===================
    // JOIN PERSONAL ROOM
    // ===================

    /**
     * Personal rooms for private notifications
     * Each user joins their own room based on user ID
     */
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      logger.debug(`User ${socket.userId} joined personal room`);

      // Also join role-based room for broadcast notifications
      socket.join(`role:${socket.userRole}`);
    }

    // ===================
    // JOIN SKILL ROOM
    // ===================

    /**
     * Join a skill room to receive updates about a specific skill
     * Used for: progress updates, new content notifications, etc.
     */
    socket.on("join:skill", async (skillId: string) => {
      if (!socket.userId) {
        socket.emit("error", { message: "Authentication required" });
        return;
      }

      // Verify user has access to this skill
      const hasAccess = await verifySkillAccess(socket.userId, skillId);

      if (hasAccess) {
        socket.join(`skill:${skillId}`);
        logger.debug(`User ${socket.userId} joined skill room: ${skillId}`);
      } else {
        socket.emit("error", { message: "Access denied to this skill" });
      }
    });

    /**
     * Leave a skill room
     */
    socket.on("leave:skill", (skillId: string) => {
      socket.leave(`skill:${skillId}`);
      logger.debug(`User ${socket.userId} left skill room: ${skillId}`);
    });

    // ===================
    // VIDEO PROGRESS TRACKING
    // ===================

    /**
     * Track video watching progress in real-time
     * Saves progress periodically to database
     */
    socket.on(
      "video:progress",
      async (data: {
        lessonId: string;
        skillId: string;
        percentage: number;
        position: number;
        blockId?: string;
        chapterId?: string;
      }) => {
        if (!socket.userId) return;

        try {
          // 1. Legacy Lesson Progress Tracking
          if (data.lessonId && !data.lessonId.startsWith("new-")) {
            await prisma.skillLessonProgress.upsert({
              where: {
                studentId_lessonId: {
                  studentId: socket.userId,
                  lessonId: data.lessonId,
                },
              },
              update: {
                videoWatchedPercentage: Math.max(0, Math.min(100, Math.round(data.percentage))),
                lastWatchPosition: Math.round(data.position),
                lastWatchedAt: new Date(),
                isVideoCompleted: data.percentage >= 90,
              },
              create: {
                studentId: socket.userId,
                lessonId: data.lessonId,
                skillId: data.skillId,
                videoWatchedPercentage: Math.round(data.percentage),
                lastWatchPosition: Math.round(data.position),
                firstWatchedAt: new Date(),
                lastWatchedAt: new Date(),
                totalWatchCount: 1,
              },
            });
          }

          // 2. Structured Block Progress Tracking (Scale to 10K+ Students)
          if (data.blockId && data.skillId) {
            // Find or initialize main progress record
            const progress = await prisma.studentProgress.upsert({
              where: {
                studentId_skillId: {
                  studentId: socket.userId,
                  skillId: data.skillId,
                },
              },
              create: {
                studentId: socket.userId,
                skillId: data.skillId,
                blockProgress: {},
              },
              update: {},
            });

            // Atomic-ish JSON update (read-modify-write within same transaction/block)
            const currentBlockProgress = (progress.blockProgress as any) || {};
            const existingBlock = currentBlockProgress[data.blockId] || {
              secondsWatched: 0,
              maxReached: 0,
              isCompleted: false,
            };

            currentBlockProgress[data.blockId] = {
              secondsWatched: Math.round(data.position),
              maxReached: Math.max(existingBlock.maxReached, Math.round(data.position)),
              lastWatchedAt: new Date().toISOString(),
              isCompleted: existingBlock.isCompleted || data.percentage >= 90,
            };

            await prisma.studentProgress.update({
              where: { id: progress.id },
              data: {
                blockProgress: currentBlockProgress,
                lastAccessedAt: new Date(),
              },
            });
          }
        } catch (error) {
          logger.error("Failed to save video progress via socket:", error);
        }
      },
    );

    // ===================
    // TYPING INDICATOR
    // ===================

    /**
     * Show typing indicator for feedback/comments
     * (Faculty typing feedback, admin typing message, etc.)
     */
    socket.on(
      "typing:start",
      (data: { targetUserId: string; context: string }) => {
        if (socket.userId) {
          io.to(`user:${data.targetUserId}`).emit("typing:show", {
            userId: socket.userId,
            context: data.context,
          });
        }
      },
    );

    socket.on("typing:stop", (data: { targetUserId: string }) => {
      if (socket.userId) {
        io.to(`user:${data.targetUserId}`).emit("typing:hide", {
          userId: socket.userId,
        });
      }
    });

    // ===================
    // PRESENCE
    // ===================

    /**
     * Broadcast online/offline status
     * Useful for showing who's currently online
     */
    socket.on("presence:online", () => {
      if (socket.userId && socket.userRole) {
        // Notify admins/faculty about user coming online
        io.to(`role:admin`).to(`role:faculty`).emit("user:online", {
          userId: socket.userId,
          role: socket.userRole,
        });
      }
    });

    // ===================
    // DISCONNECTION
    // ===================

    socket.on("disconnect", (reason) => {
      logger.info(`Socket disconnected: ${socket.id}, Reason: ${reason}`);

      if (socket.userId) {
        // Notify about user going offline
        io.to(`role:admin`).to(`role:faculty`).emit("user:offline", {
          userId: socket.userId,
        });
      }
    });

    // ===================
    // ERROR HANDLING
    // ===================

    socket.on("error", (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });
  });

  logger.info("Socket.io handlers initialized");
};

// ===================
// HELPER FUNCTIONS
// ===================

/**
 * Verify if a user has access to a specific skill
 *
 * Rules:
 * - Admins have access to all skills
 * - Faculty have access to assigned skills
 * - Students have access to enrolled skills
 */
async function verifySkillAccess(
  userId: string,
  skillId: string,
): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // Admins have full access
    if (user.role === "admin") return true;

    // Faculty - check assignment
    if (user.role === "faculty") {
      const assignment = await prisma.skillFaculty.findUnique({
        where: {
          skillId_facultyId: {
            skillId,
            facultyId: userId,
          },
        },
      });
      return !!assignment && assignment.isActive;
    }

    // Students - check enrollment
    if (user.role === "student") {
      const enrollment = await prisma.studentSkill.findUnique({
        where: {
          studentId_skillId: {
            studentId: userId,
            skillId,
          },
        },
      });
      return !!enrollment && enrollment.status === "active";
    }

    return false;
  } catch (error) {
    logger.error("Error verifying skill access:", error);
    return false;
  }
}

// ===================
// EMITTER FUNCTIONS
// ===================

/**
 * These functions are used by route handlers to emit events
 * They provide a clean interface for sending real-time updates
 */

const resolveIo = (io?: Server): Server | null => io || activeIo;

/**
 * Send a notification to a specific user
 */
export function sendUserNotification(
  io: Server,
  userId: string,
  notification: NotificationPayload,
): void;
export function sendUserNotification(
  userId: string,
  notification: NotificationPayload,
): void;
export function sendUserNotification(
  ioOrUserId: Server | string,
  maybeUserIdOrNotification: string | NotificationPayload,
  maybeNotification?: NotificationPayload,
): void {
  const io = ioOrUserId instanceof Server ? ioOrUserId : resolveIo();
  const userId =
    ioOrUserId instanceof Server
      ? (maybeUserIdOrNotification as string)
      : ioOrUserId;
  const notification =
    ioOrUserId instanceof Server
      ? maybeNotification
      : (maybeUserIdOrNotification as NotificationPayload);

  if (!io || !notification) {
    logger.warn("Socket.io instance not available for user notification");
    return;
  }

  io.to(`user:${userId}`).emit("notification", notification);
}

/**
 * Send a notification to all users with a specific role
 */
export function sendRoleNotification(
  io: Server,
  role: "admin" | "faculty" | "student",
  notification: NotificationPayload,
): void;
export function sendRoleNotification(
  role: "admin" | "faculty" | "student",
  notification: NotificationPayload,
): void;
export function sendRoleNotification(
  ioOrRole: Server | "admin" | "faculty" | "student",
  maybeRoleOrNotification:
    | "admin"
    | "faculty"
    | "student"
    | NotificationPayload,
  maybeNotification?: NotificationPayload,
): void {
  const io = ioOrRole instanceof Server ? ioOrRole : resolveIo();
  const role =
    ioOrRole instanceof Server
      ? (maybeRoleOrNotification as "admin" | "faculty" | "student")
      : ioOrRole;
  const notification =
    ioOrRole instanceof Server
      ? maybeNotification
      : (maybeRoleOrNotification as NotificationPayload);

  if (!io || !notification) {
    logger.warn("Socket.io instance not available for role notification");
    return;
  }

  io.to(`role:${role}`).emit("notification", notification);
}

/**
 * Send an update to all users viewing a specific skill
 */
export function sendSkillUpdate(
  io: Server,
  skillId: string,
  update: {
    type:
      | "content_added"
      | "content_updated"
      | "task_added"
      | "progress_updated";
    data: unknown;
  },
): void;
export function sendSkillUpdate(
  skillId: string,
  update: {
    type:
      | "content_added"
      | "content_updated"
      | "task_added"
      | "progress_updated";
    data: unknown;
  },
): void;
export function sendSkillUpdate(
  ioOrSkillId: Server | string,
  maybeSkillIdOrUpdate:
    | string
    | {
        type:
          | "content_added"
          | "content_updated"
          | "task_added"
          | "progress_updated";
        data: unknown;
      },
  maybeUpdate?: {
    type:
      | "content_added"
      | "content_updated"
      | "task_added"
      | "progress_updated";
    data: unknown;
  },
): void {
  const io = ioOrSkillId instanceof Server ? ioOrSkillId : resolveIo();
  const skillId =
    ioOrSkillId instanceof Server
      ? (maybeSkillIdOrUpdate as string)
      : ioOrSkillId;
  const update =
    ioOrSkillId instanceof Server
      ? maybeUpdate
      : (maybeSkillIdOrUpdate as {
          type:
            | "content_added"
            | "content_updated"
            | "task_added"
            | "progress_updated";
          data: unknown;
        });

  if (!io || !update) {
    logger.warn("Socket.io instance not available for skill update");
    return;
  }

  io.to(`skill:${skillId}`).emit("skill:update", update);
}

/**
 * Force logout a user (for single-device enforcement)
 */
export function forceUserLogout(
  io: Server,
  userId: string,
  reason: string,
): void;
export function forceUserLogout(userId: string, reason: string): void;
export function forceUserLogout(
  ioOrUserId: Server | string,
  maybeUserIdOrReason: string,
  maybeReason?: string,
): void {
  const io = ioOrUserId instanceof Server ? ioOrUserId : resolveIo();
  const userId =
    ioOrUserId instanceof Server ? maybeUserIdOrReason : ioOrUserId;
  const reason =
    ioOrUserId instanceof Server ? maybeReason : maybeUserIdOrReason;

  if (!io || !reason) {
    logger.warn("Socket.io instance not available for force logout");
    return;
  }

  io.to(`user:${userId}`).emit("force:logout", {
    reason,
    timestamp: new Date().toISOString(),
  });
}
