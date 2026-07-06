export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ApiError';
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const message =
    error instanceof Error ? error.message : 'unexpected backend failure';
  const status =
    error instanceof Error &&
    'statusCode' in error &&
    typeof error.statusCode === 'number'
      ? error.statusCode
      : 500;
  if (message.includes('NotOwner')) {
    return new ApiError(403, 'NOT_OWNER', message, { cause: error });
  }
  if (message.includes('window') || message.includes('Window')) {
    return new ApiError(409, 'CHALLENGE_WINDOW_CLOSED', message, {
      cause: error,
    });
  }
  if (message.includes('AlreadyChallenged')) {
    return new ApiError(409, 'ALREADY_CHALLENGED', message, {
      cause: error,
    });
  }
  if (
    message.includes('NotExecutable') ||
    message.includes('InvalidStatus')
  ) {
    return new ApiError(409, 'NOT_EXECUTABLE', message, {
      cause: error,
    });
  }
  return new ApiError(
    status,
    status === 503 ? 'ARM_FAILED' : 'INTERNAL_ERROR',
    message,
    { cause: error },
  );
}
