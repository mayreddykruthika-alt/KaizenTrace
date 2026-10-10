export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'PROJECT_NOT_FOUND'
  | 'TASK_NOT_FOUND'
  | 'USER_NOT_FOUND'
  | 'DATABASE_ERROR'
  | 'JOB_FAILED'
  | 'NOTIFICATION_FAILED'
  | 'CONFLICT'
  | 'BAD_REQUEST'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: ErrorCode;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, errorCode: ErrorCode, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, errorCode: ErrorCode = 'BAD_REQUEST', details?: unknown) {
    return new AppError(message, 400, errorCode, details);
  }

  static unauthorized(message = 'Authentication required', details?: unknown) {
    return new AppError(message, 401, 'UNAUTHORIZED', details);
  }

  static forbidden(message = 'You do not have permission to perform this action', details?: unknown) {
    return new AppError(message, 403, 'FORBIDDEN', details);
  }

  static notFound(message: string, errorCode: ErrorCode = 'BAD_REQUEST', details?: unknown) {
    return new AppError(message, 404, errorCode, details);
  }

  static conflict(message: string, details?: unknown) {
    return new AppError(message, 409, 'CONFLICT', details);
  }

  static internal(message = 'An unexpected internal error occurred', errorCode: ErrorCode = 'INTERNAL_ERROR', details?: unknown) {
    return new AppError(message, 500, errorCode, details);
  }
}
