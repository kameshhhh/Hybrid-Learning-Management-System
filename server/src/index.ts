// ============================================================
// HLMS - MAIN SERVER ENTRY POINT
// ============================================================
//
// This is the main entry point for the Hybrid Learning Management
// System backend server. It initializes all core services including:
// - Express server with middleware
// - Database connection via Prisma
// - Socket.io for real-time communication
// - All API routes
//
// ============================================================

// ===================
// IMPORTS
// ===================

// External dependencies
import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { Server as SocketServer } from "socket.io";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Internal utilities
import { logger } from "./utils/logger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { authMiddleware } from "./middleware/auth";
import prisma from "./config/database";
import { initSocketHandlers } from "./socket";

// Polyfill for JSON.stringify to handle BigInt
(BigInt.prototype as any).toJSON = function () {
  return Number(this);
};

// Route imports
import authRoutes from "./routes/auth.routes";
import adminSessionRoutes from "./routes/adminSessionRoutes";
import adminSkillRoutes from "./routes/adminSkillRoutes";
import adminRoutes from "./routes/admin.routes";
import facultyRoutes from "./routes/faculty.routes";
import studentRoutes from "./routes/student.routes";
import skillRoutes from "./routes/skill.routes";
import uploadRoutes from "./routes/upload.routes";

// Load environment variables (already loaded in config)
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

const splitOrigins = (value?: string): string[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const allowedOrigins = Array.from(
  new Set([
    ...splitOrigins(process.env.CORS_ORIGINS),
    ...splitOrigins(process.env.CLIENT_URL),
    ...splitOrigins(process.env.FRONTEND_URL),
    ...(NODE_ENV === "development"
      ? ["http://localhost:3000", "http://localhost:5173"]
      : []),
  ]),
);

const primaryClientUrl =
  allowedOrigins[0] || process.env.FRONTEND_URL || "http://localhost:3000";

const corsOriginHandler = (
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
): void => {
  if (!origin || allowedOrigins.includes(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error(`CORS blocked origin: ${origin}`));
};

// ===================
// EXPRESS APP SETUP
// ===================

/**
 * Create and configure Express application
 *
 * We use a separate function to make the app testable
 * and allow for different configurations in testing
 */
const app: Application = express();

// Create HTTP server (needed for Socket.io)
const httpServer = createServer(app);

// ===================
// SOCKET.IO SETUP
// ===================

/**
 * Initialize Socket.io server for real-time features:
 * - Live notifications
 * - Real-time progress updates
 * - Device management (force logout)
 */
const io = new SocketServer(httpServer, {
  cors: {
    origin: corsOriginHandler,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Store io instance on app for use in routes
app.set("io", io);

// ===================
// SECURITY MIDDLEWARE
// ===================

/**
 * Helmet - Sets various HTTP headers for security
 *
 * Protects against:
 * - XSS attacks
 * - Clickjacking
 * - MIME sniffing
 * - And more...
 */
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow video streaming
    contentSecurityPolicy: false, // Disabled for development, enable in production
  }),
);

/**
 * Rate Limiter - Prevents abuse and DDoS attacks
 *
 * Settings:
 * - 100 requests per minute per IP
 * - Standard headers for client-side handling
 */
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // 100 requests per minute
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
app.use(limiter);

// ===================
// CORS CONFIGURATION
// ===================

/**
 * CORS (Cross-Origin Resource Sharing)
 *
 * Allows the frontend (running on different port) to
 * communicate with the backend securely.
 *
 * credentials: true - Required for cookies/auth headers
 */
const corsOptions = {
  origin: corsOriginHandler,
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Device-Info"],
};

app.use(cors(corsOptions));

// ===================
// BODY PARSING MIDDLEWARE
// ===================

/**
 * Parse incoming request bodies:
 * - JSON for API requests
 * - URL-encoded for form submissions
 * - Cookies for session handling
 */
app.use(express.json({ limit: "10mb" })); // Larger limit for base64 images
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());

// ===================
// RESPONSE COMPRESSION
// ===================

/**
 * Compress all HTTP responses for faster transfer
 *
 * This significantly reduces bandwidth usage,
 * especially for large JSON responses and reports
 */
app.use(compression());

// ===================
// STATIC FILES
// ===================

/**
 * Serve static files from the uploads directory
 *
 * This handles:
 * - Uploaded videos
 * - PDFs and documents
 * - Certificate files
 * - Profile images
 */
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));
app.use(
  "/certificates",
  express.static(path.join(__dirname, "../certificates")),
);

// ===================
// REQUEST LOGGING
// ===================

/**
 * Log all incoming requests for monitoring
 *
 * In production, this helps with:
 * - Debugging issues
 * - Monitoring traffic
 * - Security auditing
 */
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });

  next();
});

// ===================
// HEALTH CHECK ENDPOINT
// ===================

/**
 * Health check endpoint for monitoring services
 *
 * Used by:
 * - Load balancers
 * - Container orchestration (Docker/K8s)
 * - Monitoring systems (Prometheus, etc.)
 */
app.get("/health", async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        server: "running",
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "disconnected",
        server: "running",
      },
    });
  }
});

// ===================
// API VERSION PREFIX
// ===================

/**
 * All API routes are prefixed with /api/v1
 *
 * This allows for:
 * - Future API versioning (v2, v3...)
 * - Clear separation of API routes
 * - Easy reverse proxy configuration
 */
const API_PREFIX = "/api/v1";

// ===================
// SYSTEM ROUTES
// ===================

/**
 * System routes for time sync and monitoring
 */
app.get(`${API_PREFIX}/system/time`, (req: Request, res: Response) => {
  res.json({ success: true, data: { time: new Date().toISOString() } });
});

// ===================
// ROUTE REGISTRATION
// ===================

/**
 * Authentication Routes (Public)
 *
 * Handles: login, logout, password reset, session management
 * Does NOT require authentication
 */
app.use(`${API_PREFIX}/auth`, authRoutes);

/**
 * Upload Routes (Protected)
 *
 * Handles: file uploads (videos, documents, images)
 * Requires authentication
 */
app.use(`${API_PREFIX}/upload`, authMiddleware, uploadRoutes);

/**
 * Admin Session & Auth Routes (Admin Portal)
 */
app.use(`${API_PREFIX}/admin/auth`, adminSessionRoutes);

/**
 * Admin Skill Routes (Admin Portal)
 */
app.use(`${API_PREFIX}/admin`, adminSkillRoutes);

/**
 * Admin Routes (Protected - Admin Only)
 *
 * Handles: user management, skill creation, reports
 * Requires admin role
 */
app.use(`${API_PREFIX}/admin`, adminRoutes);

/**
 * Faculty Routes (Protected - Faculty Only)
 *
 * Handles: content creation, assessment, logs
 * Requires faculty role
 */
app.use(`${API_PREFIX}/faculty`, authMiddleware, facultyRoutes);

/**
 * Student Routes (Protected - Student Only)
 *
 * Handles: learning, submissions, progress
 * Requires student role
 */
app.use(`${API_PREFIX}/student`, authMiddleware, studentRoutes);

/**
 * Skill Routes (Protected - Mixed Access)
 *
 * Handles: skill viewing, chapters, lessons
 * Access varies by endpoint
 */
app.use(`${API_PREFIX}/skills`, authMiddleware, skillRoutes);

// ===================
// ERROR HANDLING
// ===================

/**
 * 404 Handler
 *
 * Catches all requests that don't match any route
 * Returns a consistent JSON error response
 */
app.use(notFoundHandler);

/**
 * Global Error Handler
 *
 * Catches all errors thrown in routes/middleware
 * Logs errors and returns safe error messages
 */
app.use(errorHandler);

// ===================
// SOCKET.IO INITIALIZATION
// ===================

/**
 * Initialize Socket.io event handlers
 *
 * Handles:
 * - User connection/disconnection
 * - Room management (skill rooms, user rooms)
 * - Real-time notifications
 */
initSocketHandlers(io);

// ===================
// DATABASE CONNECTION
// ===================

/**
 * Connect to PostgreSQL via Prisma
 *
 * Prisma handles:
 * - Connection pooling
 * - Query building
 * - Migrations
 */
async function connectDatabase(): Promise<void> {
  try {
    await prisma.$connect();
    logger.info("✅ Database connected successfully");
  } catch (error) {
    logger.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

// ===================
// GRACEFUL SHUTDOWN
// ===================

/**
 * Handle server shutdown gracefully
 *
 * Ensures:
 * - Active connections are closed
 * - Database connection is released
 * - Resources are cleaned up
 */
function handleShutdown(signal: string): void {
  logger.info(`\n${signal} received. Shutting down gracefully...`);

  // Close HTTP server
  httpServer.close(async () => {
    logger.info("HTTP server closed");

    // Close Socket.io connections
    io.close();
    logger.info("Socket.io connections closed");

    // Disconnect database
    await prisma.$disconnect();
    logger.info("Database disconnected");

    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
}

// Register shutdown handlers
process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

// ===================
// SERVER STARTUP
// ===================

/**
 * Start the server
 *
 * Steps:
 * 1. Connect to database
 * 2. Start HTTP server
 * 3. Log startup information
 */
async function startServer(): Promise<void> {
  try {
    // Connect to database first
    await connectDatabase();

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🚀 HLMS Server Started Successfully                     ║
║                                                           ║
║   📍 Port: ${PORT.toString().padEnd(44)}║
║   🌍 Environment: ${NODE_ENV.padEnd(38)}║
║   🔗 API: http://localhost:${PORT}${API_PREFIX.padEnd(22)}║
║   💻 Client: ${primaryClientUrl.padEnd(43)}║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the server
startServer();

// Export for testing
export { app, httpServer, io };
