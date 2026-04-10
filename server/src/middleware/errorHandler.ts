// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================
//
// Centralized error handling for the Express application.
// Catches all errors and returns consistent error responses.
//
// ============================================================

import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// ===================
// CUSTOM ERROR CLASS
// ===================

/**
 * Custom API Error class
 *
 * Extends the built-in Error class to include:
 * - HTTP status code
 * - Machine-readable error code
 * - Additional error details
 *
 * Usage:
 * throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
 */
export class ApiError extends Error {
  statusCode: number;
  code?: string;
  details?: any;
  isOperational: boolean;

  constructor(
    statusCode: number,
    message: string,
    code?: string,
    details?: any,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true; // Operational errors are expected/handled

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

// ===================
// COMMON ERROR CREATORS
// ===================

/**
 * Helper functions to create common error types
 * Makes code more readable and consistent
 */

export const BadRequestError = (
  message: string,
  code?: string,
  details?: any,
) => new ApiError(400, message, code || "BAD_REQUEST", details);

export const UnauthorizedError = (message = "Unauthorized", code?: string) =>
  new ApiError(401, message, code || "UNAUTHORIZED");

export const ForbiddenError = (message = "Forbidden", code?: string) =>
  new ApiError(403, message, code || "FORBIDDEN");

export const NotFoundError = (message: string, code?: string) =>
  new ApiError(404, message, code || "NOT_FOUND");

export const ConflictError = (message: string, code?: string) =>
  new ApiError(409, message, code || "CONFLICT");

export const ValidationError = (message: string, details?: any) =>
  new ApiError(422, message, "VALIDATION_ERROR", details);

export const TooManyRequestsError = (message = "Too many requests") =>
  new ApiError(429, message, "RATE_LIMIT_EXCEEDED");

export const InternalError = (message = "Internal server error") =>
  new ApiError(500, message, "INTERNAL_ERROR");

// ===================
// 404 NOT FOUND HANDLER
// ===================

/**
 * Handles requests to non-existent routes
 *
 * Called when no route matches the request
 * Returns a 404 error with helpful message
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const error = NotFoundError(
    `Route ${req.method} ${req.originalUrl} not found`,
  );
  next(error);
};

// ===================
// GLOBAL ERROR HANDLER
// ===================

/**
 * Global error handler middleware
 *
 * This catches ALL errors thrown in the application:
 * - Validation errors
 * - Database errors
 * - Custom API errors
 * - Unexpected errors
 *
 * It ensures consistent error response format and
 * proper logging of all errors.
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction,
): void => {
  // Default error values
  let statusCode = 500;
  let message = "Internal server error";
  let code = "INTERNAL_ERROR";
  let details = undefined;

  // Handle known operational errors (ApiError or AppError)
  if (err instanceof ApiError || (err as any).statusCode) {
    statusCode = (err as any).statusCode || statusCode;
    message = err.message;
    code = (err as any).code || (err as any).errorCode || code;
    details = (err as any).details;
  }

  // Handle Prisma errors
  if ((err as any).code) {
    const prismaCode = (err as any).code;

    switch (prismaCode) {
      case "P2002":
        // Unique constraint violation
        statusCode = 409;
        message = "A record with this value already exists";
        code = "DUPLICATE_ENTRY";
        details = (err as any).meta?.target;
        break;

      case "P2025":
        // Record not found
        statusCode = 404;
        message = "Record not found";
        code = "NOT_FOUND";
        break;

      case "P2003":
        // Foreign key constraint violation
        statusCode = 400;
        message = "Invalid reference: related record does not exist";
        code = "INVALID_REFERENCE";
        break;

      default:
        // Log unknown Prisma errors
        logger.error("Unknown Prisma error:", err);
    }
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    code = "INVALID_TOKEN";
  }

  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    code = "TOKEN_EXPIRED";
  }

  // Handle validation errors (from express-validator or Zod)
  if (err.name === "ZodError" || (err as any).constructor?.name === "ZodError") {
    statusCode = 422;
    const zodErrors = (err as any).errors || (err as any).issues;
    message = zodErrors && zodErrors.length > 0 
      ? `Validation failed: ${zodErrors[0].message}` 
      : "Validation failed";
    code = "VALIDATION_ERROR";
    details = zodErrors;
  }

  // Log the error
  if (statusCode >= 500) {
    // Log full error for server errors
    logger.error({
      message: err.message,
      stack: err.stack,
      method: req.method,
      path: req.path,
      body: req.body,
      user: (req as any).user?.id,
    });
  } else {
    // Log summary for client errors
    logger.warn({
      message: err.message,
      code,
      method: req.method,
      path: req.path,
      user: (req as any).user?.id,
    });
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      code,
      ...(details ? { details } : {}),
      // Include stack trace temporally for debugging
      ...(err.stack ? { stack: err.stack } : {}),
    },
  });
};

// ===================
// ASYNC HANDLER WRAPPER
// ===================

/**
 * Wrapper for async route handlers
 *
 * Automatically catches promise rejections and forwards
 * them to the error handler, eliminating try-catch boilerplate.
 *
 * Usage:
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await User.findAll();
 *   res.json(users);
 * }));
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
