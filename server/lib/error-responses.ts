/**
 * Standardized error response format for API endpoints
 */
export interface ErrorResponse {
  error: string;
  details?: string;
  code?: string;
  timestamp: string;
}

/**
 * Creates a standardized error response object
 *
 * @param error - Main error message (user-friendly)
 * @param details - Additional error details (optional)
 * @param code - Error code for client-side handling (optional)
 * @returns Standardized error response object
 *
 * @example
 * ```typescript
 * res.status(404).json(createErrorResponse(
 *   'Repository not found',
 *   'No repository found with ID 12345',
 *   'REPO_NOT_FOUND'
 * ));
 * ```
 */
export function createErrorResponse(
  error: string,
  details?: string,
  code?: string
): ErrorResponse {
  return {
    error,
    ...(details && { details }),
    ...(code && { code }),
    timestamp: new Date().toISOString()
  };
}

/**
 * Common error codes for consistent client-side error handling
 */
export const ErrorCodes = {
  // Authentication errors
  INVALID_TOKEN: 'INVALID_TOKEN',
  MISSING_TOKEN: 'MISSING_TOKEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',

  // GitHub errors
  GITHUB_AUTH_FAILED: 'GITHUB_AUTH_FAILED',
  GITHUB_API_ERROR: 'GITHUB_API_ERROR',
  REPO_NOT_FOUND: 'REPO_NOT_FOUND',

  // OpenAI errors
  OPENAI_API_ERROR: 'OPENAI_API_ERROR',
  OPENAI_API_KEY_MISSING: 'OPENAI_API_KEY_MISSING',

  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
} as const;
