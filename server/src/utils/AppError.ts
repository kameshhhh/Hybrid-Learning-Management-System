// Simple wrapper for operational errors used in services
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly errorCode: string;

  constructor(statusCode: number, message: string, errorCode: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;

    Error.captureStackTrace(this);
  }
}

export const Errors = {
  notFound: (entity: string) => new AppError(404, `${entity} not found`, 'NOT_FOUND'),
  duplicateEntry: (field: string) => new AppError(409, `${field} already exists`, 'DUPLICATE_ENTRY'),
  unauthorized: () => new AppError(401, 'Unauthorized access', 'UNAUTHORIZED'),
  forbidden: () => new AppError(403, 'Forbidden access', 'FORBIDDEN'),
  badRequest: (message: string) => new AppError(400, message, 'BAD_REQUEST'),
};
