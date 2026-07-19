import { timingSafeEqual } from 'node:crypto';
import type { FastifyRequest } from 'fastify';
import { ApiError } from './errors.js';

function token(): string | null {
  return process.env.OPERATOR_API_TOKEN?.trim() || null;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function requireOperator(request: FastifyRequest): void {
  const configured = token();
  if (!configured) {
    throw new ApiError(401, 'OPERATOR_AUTH_REQUIRED', 'operator authorization is required');
  }
  const header = request.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'OPERATOR_AUTH_REQUIRED', 'operator authorization is required');
  }
  if (!safeEqual(header.slice('Bearer '.length).trim(), configured)) {
    throw new ApiError(403, 'OPERATOR_AUTH_INVALID', 'operator authorization is invalid');
  }
}

export function publicArenaEnabled(): boolean {
  return process.env.PUBLIC_LEGACY_ARENA_ENABLED === 'true';
}

export function publicWalletChallengeEnabled(): boolean {
  return process.env.PUBLIC_WALLET_CHALLENGE_ENABLED === 'true';
}
