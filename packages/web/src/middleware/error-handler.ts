import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';

/**
 * Application error codes
 */
export enum ErrorCode {
  // Validation errors (400)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_PARAMETER = 'MISSING_PARAMETER',
  INVALID_FORMAT = 'INVALID_FORMAT',

  // Authentication errors (401)
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  // Authorization errors (403)
  FORBIDDEN = 'FORBIDDEN',
  HMAC_INVALID = 'HMAC_INVALID',
  ACCESS_DENIED = 'ACCESS_DENIED',

  // Not found errors (404)
  NOT_FOUND = 'NOT_FOUND',
  SHOP_NOT_FOUND = 'SHOP_NOT_FOUND',
  EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
  CUSTOMER_NOT_FOUND = 'CUSTOMER_NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',

  // Conflict errors (409)
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  ALREADY_SCANNED = 'ALREADY_SCANNED',
  CONFLICT = 'CONFLICT',

  // External service errors (502)
  SHOPIFY_API_ERROR = 'SHOPIFY_API_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',

  // Internal errors (500)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Map error codes to HTTP status codes
 */
const errorStatusMap: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_PARAMETER]: 400,
  [ErrorCode.INVALID_FORMAT]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.INVALID_TOKEN]: 401,
  [ErrorCode.SESSION_EXPIRED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.HMAC_INVALID]: 403,
  [ErrorCode.ACCESS_DENIED]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.SHOP_NOT_FOUND]: 404,
  [ErrorCode.EVENT_NOT_FOUND]: 404,
  [ErrorCode.CUSTOMER_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.ALREADY_EXISTS]: 409,
  [ErrorCode.ALREADY_SCANNED]: 409,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.SHOPIFY_API_ERROR]: 502,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * Standard application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    originalError?: Error
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = errorStatusMap[code] ?? 500;
    this.details = details;
    this.originalError = originalError;

    if (originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${originalError.stack}`;
    }
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Standardized error response format
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    requestId?: string;
  };
}

/**
 * Create common app errors with factory functions
 */
export const errors = {
  validation: (message: string, details?: Record<string, unknown>) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, details),

  invalidInput: (message: string, details?: Record<string, unknown>) =>
    new AppError(ErrorCode.INVALID_INPUT, message, details),

  missingParameter: (param: string) =>
    new AppError(ErrorCode.MISSING_PARAMETER, `Missing required parameter: ${param}`, { param }),

  unauthorized: (message = 'Unauthorized') =>
    new AppError(ErrorCode.UNAUTHORIZED, message),

  forbidden: (message = 'Access denied') =>
    new AppError(ErrorCode.FORBIDDEN, message),

  hmacInvalid: () =>
    new AppError(ErrorCode.HMAC_INVALID, 'Invalid HMAC signature'),

  notFound: (resource: string) =>
    new AppError(ErrorCode.RESOURCE_NOT_FOUND, `${resource} not found`, { resource }),

  shopNotFound: (shopDomain?: string) =>
    new AppError(ErrorCode.SHOP_NOT_FOUND, 'Shop not found', shopDomain ? { shopDomain } : undefined),

  eventNotFound: (eventSlug?: string) =>
    new AppError(ErrorCode.EVENT_NOT_FOUND, 'Event not found', eventSlug ? { eventSlug } : undefined),

  customerNotFound: (customerId?: string) =>
    new AppError(ErrorCode.CUSTOMER_NOT_FOUND, 'Customer not found', customerId ? { customerId } : undefined),

  alreadyExists: (resource: string, details?: Record<string, unknown>) =>
    new AppError(ErrorCode.ALREADY_EXISTS, `${resource} already exists`, details),

  alreadyScanned: (email?: string) =>
    new AppError(ErrorCode.ALREADY_SCANNED, 'Already registered for this event', email ? { email } : undefined),

  shopifyError: (message: string, originalError?: Error) =>
    new AppError(ErrorCode.SHOPIFY_API_ERROR, message, undefined, originalError),

  internal: (message = 'Internal server error', originalError?: Error) =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, undefined, originalError),

  database: (message: string, originalError?: Error) =>
    new AppError(ErrorCode.DATABASE_ERROR, message, undefined, originalError),
};

/**
 * Async route handler wrapper that catches errors and passes to error handler
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Global error handling middleware
 */
export const errorHandler: ErrorRequestHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  const requestId = req.headers['x-request-id'] as string || generateRequestId();

  const logContext = {
    requestId,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  };

  if (err instanceof AppError) {
    console.error(`[${requestId}] AppError:`, err.message, logContext);

    if (err.originalError) {
      console.error(`[${requestId}] Caused by:`, err.originalError);
    }

    const response: ErrorResponse = {
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
        requestId,
      },
    };

    return res.status(err.statusCode).json(response);
  }

  console.error(`[${requestId}] Unhandled error:`, err, logContext);

  const response: ErrorResponse = {
    error: {
      code: ErrorCode.UNKNOWN_ERROR,
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message || 'Unknown error',
      requestId,
    },
  };

  return res.status(500).json(response);
};

/**
 * 404 handler for unknown routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const response: ErrorResponse = {
    error: {
      code: ErrorCode.NOT_FOUND,
      message: `Route not found: ${req.method} ${req.path}`,
    },
  };
  res.status(404).json(response);
};

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function wrapError(error: unknown, code: ErrorCode, message: string): AppError {
  const originalError = error instanceof Error ? error : new Error(String(error));
  return new AppError(code, message, undefined, originalError);
}
