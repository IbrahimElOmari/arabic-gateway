/**
 * Centralized API error class for normalized error handling
 */

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly functionName: string;
  public readonly timestamp: string;
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    functionName: string = 'unknown',
    isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.functionName = functionName;
    this.timestamp = new Date().toISOString();
    this.isRetryable = isRetryable;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * Normalize any error into an ApiError
 */
export function normalizeError(error: unknown, functionName: string = 'unknown'): ApiError {
  if (isApiError(error)) return error;

  if (error instanceof Error) {
    // Supabase errors often have a status or statusCode
    const statusCode = (error as any).status || (error as any).statusCode || 500;
    const isRetryable = statusCode >= 500;
    return new ApiError(error.message, statusCode, functionName, isRetryable);
  }

  if (typeof error === 'object' && error !== null) {
    const msg = (error as any).message || (error as any).error_description || JSON.stringify(error);
    const statusCode = (error as any).status || (error as any).statusCode || 500;
    return new ApiError(msg, statusCode, functionName, statusCode >= 500);
  }

  return new ApiError(String(error), 500, functionName, false);
}
