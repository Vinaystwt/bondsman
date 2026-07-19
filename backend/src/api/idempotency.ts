import type { FastifyRequest } from 'fastify';

export interface IdempotencyStore {
  run<T>(
    request: FastifyRequest,
    scope: string,
    operation: () => Promise<T>,
  ): Promise<T>;
}

function header(request: FastifyRequest): string | undefined {
  const raw =
    request.headers['idempotency-key'] ??
    request.headers['x-idempotency-key'];
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function createIdempotencyStore(ttlMs = 10 * 60_000): IdempotencyStore {
  const inFlight = new Map<string, Promise<unknown>>();
  const completed = new Map<string, { value: unknown; expiresAt: number }>();

  return {
    async run<T>(
      request: FastifyRequest,
      scope: string,
      operation: () => Promise<T>,
    ): Promise<T> {
      const key = header(request);
      if (!key) return operation();

      const now = Date.now();
      for (const [candidate, result] of completed) {
        if (result.expiresAt <= now) completed.delete(candidate);
      }
      const scoped = `${scope}:${key}`;
      const cached = completed.get(scoped);
      if (cached) return cached.value as T;
      const existing = inFlight.get(scoped);
      if (existing) return existing as Promise<T>;

      const pending = operation()
        .then((value) => {
          completed.set(scoped, { value, expiresAt: Date.now() + ttlMs });
          return value;
        })
        .finally(() => inFlight.delete(scoped));
      inFlight.set(scoped, pending);
      return pending;
    },
  };
}

