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

// Casper only ever surfaces a contract revert as "User error: <N>" (the
// numeric discriminant) — the Rust enum variant name never reaches this
// message. Codes below are the BondsmanControllerV2 Error enum
// (contracts/bondsman_controller_v2/src/bondsman_controller_v2.rs); V1's
// enum matches for 1-7 and diverges after, but V2 is the only active
// deployment today.
const CONTROLLER_ERROR_CODES: Record<number, { code: string; message: string; status: number }> = {
  1: { code: 'ACTION_NOT_FOUND', message: 'This action could not be found.', status: 404 },
  2: { code: 'NOT_AGENT', message: 'Only the acting agent can perform this step.', status: 403 },
  3: { code: 'NOT_EXECUTABLE', message: 'This action is no longer in a challengeable state — it may already have been challenged or resolved.', status: 409 },
  4: { code: 'INSUFFICIENT_BOND', message: 'The posted bond is insufficient for this action.', status: 409 },
  5: { code: 'INVALID_BASIS_POINTS', message: 'The configured split is invalid.', status: 400 },
  6: { code: 'NOT_OWNER', message: 'The backend key is not the contract owner. The contract needs to be redeployed or the key updated.', status: 403 },
  7: { code: 'POOL_FINALIZED', message: 'This invoice pool has already been finalized.', status: 409 },
  8: { code: 'UNREGISTERED_VERIFIER', message: 'No verifier is registered for this fault class.', status: 409 },
  9: { code: 'FAULT_NOT_CONFIRMED', message: 'The claimed fault could not be confirmed on chain.', status: 409 },
  10: { code: 'CHALLENGE_WINDOW_CLOSED', message: "This action's challenge window has closed.", status: 409 },
  11: { code: 'WINDOW_STILL_OPEN', message: "This action's challenge window has not closed yet.", status: 409 },
};

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

  const userErrorCode = message.match(/User error:\s*(\d+)/)?.[1];
  if (userErrorCode) {
    const mapped = CONTROLLER_ERROR_CODES[Number(userErrorCode)];
    if (mapped) {
      return new ApiError(mapped.status, mapped.code, mapped.message, { cause: error });
    }
  }

  // Operational/resource errors (spend guard, funding, RPC rate limits) carry
  // account hashes, balances, or thresholds in their raw message: real, but
  // not something to show a judge. Match first, before the generic fallback
  // below would otherwise pass the raw text straight through unchanged.
  if (message.includes('SPENDING_CIRCUIT_TRIPPED')) {
    return new ApiError(
      429,
      'SPENDING_CIRCUIT_TRIPPED',
      'The demo spending circuit breaker is cooling down. Please try again shortly.',
      { cause: error },
    );
  }
  if (
    message.includes('funding unavailable') ||
    message.includes('balance check failed')
  ) {
    return new ApiError(
      503,
      'ARM_FAILED',
      'Backend funding is temporarily low. Please try again shortly.',
      { cause: error },
    );
  }
  if (message.includes('rate limited at')) {
    return new ApiError(
      429,
      'RATE_LIMITED',
      'The Casper node is rate-limiting requests right now. Please try again shortly.',
      { cause: error },
    );
  }

  // Fallback string matches, kept for any error source that reports the
  // enum variant name directly instead of Casper's numeric revert code.
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
