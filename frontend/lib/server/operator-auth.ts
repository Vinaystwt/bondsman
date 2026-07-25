// Server-only. Never import from a 'use client' component — the token must
// stay out of the browser bundle.
export function operatorHeaders(): Record<string, string> {
  const token = process.env.OPERATOR_API_TOKEN;
  return token ? { authorization: `Bearer ${token}` } : {};
}

export function forwardIdempotencyKey(request: Request): Record<string, string> {
  const key =
    request.headers.get('idempotency-key') ?? request.headers.get('x-idempotency-key');
  return key ? { 'idempotency-key': key } : {};
}
