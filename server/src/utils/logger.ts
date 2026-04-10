// ============================================================
// LOGGER UTILITY
// ============================================================
//
// Winston-based logging utility for consistent logging across
// the application. Supports multiple transports and formats.
//
// ============================================================

import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

// ===================
// LOG DIRECTORY SETUP
// ===================

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_DIR = path.join(__dirname, "../../logs");

// ===================
// LOG FORMAT
// ===================

/**
 * Custom log format that includes:
 * - Timestamp in ISO format
 * - Log level (info, error, warn, etc.)
 * - Message content
 * - Any additional metadata
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),
  winston.format.errors({ stack: true }), // Include stack traces
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // Format the log message
    let logMessage = `[${timestamp}] ${level.toUpperCase()}: `;

    // Handle different message types
    if (typeof message === "object") {
      logMessage += JSON.stringify(message);
    } else {
      logMessage += message;
    }

    // Add stack trace for errors
    if (stack) {
      logMessage += `\n${stack}`;
    }

    // Add any additional metadata
    if (Object.keys(meta).length > 0) {
      logMessage += ` ${JSON.stringify(meta)}`;
    }

    return logMessage;
  }),
);

// ===================
// CONSOLE FORMAT (COLORIZED)
// ===================

/**
 * Colorized format for console output in development
 * Makes it easier to scan logs visually
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({
    format: "HH:mm:ss",
  }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let logMessage = `[${timestamp}] ${level}: `;

    if (typeof message === "object") {
      logMessage += JSON.stringify(message, null, 2);
    } else {
      logMessage += message;
    }

    if (stack) {
      logMessage += `\n${stack}`;
    }

    return logMessage;
  }),
);

// ===================
// LOGGER INSTANCE
// ===================

/**
 * Create Winston logger instance
 *
 * Transports:
 * - Console: Always active, colorized in development
 * - File (combined): All logs for general review
 * - File (error): Only errors for quick debugging
 */
export const logger = winston.createLogger({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
  format: logFormat,
  defaultMeta: { service: "hlms-server" },
  transports: [
    // Console transport - always active
    new winston.transports.Console({
      format: consoleFormat,
    }),

    // File transport for all logs (in production)
    ...(process.env.NODE_ENV === "production"
      ? [
          new winston.transports.File({
            filename: path.join(LOG_DIR, "combined.log"),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: path.join(LOG_DIR, "error.log"),
            level: "error",
            maxsize: 5242880,
            maxFiles: 5,
          }),
        ]
      : []),
  ],
});

// ===================
// STREAM FOR MORGAN
// ===================

/**
 * Stream object for Morgan HTTP logger integration
 * Allows Morgan to use Winston for HTTP request logging
 */
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export default logger;
