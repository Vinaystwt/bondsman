export interface RecentError {
  timestamp: string;
  method: string;
  path: string;
  code: string;
  statusCode: number;
  message: string;
  requestId?: string;
}

export interface RequestLogEntry {
  event: 'api_request';
  requestId?: string;
  method: string;
  path: string;
  statusCode: number;
  durationMs: number;
  actionId?: number;
}

const recentErrors: RecentError[] = [];
let requestsToday = 0;
let errorsToday = 0;
let day = new Date().toISOString().slice(0, 10);

function rotateDay(now = new Date()): void {
  const next = now.toISOString().slice(0, 10);
  if (next === day) return;
  day = next;
  requestsToday = 0;
  errorsToday = 0;
}

export function recordRequest(): void {
  rotateDay();
  requestsToday += 1;
}

export function recordApiError(error: RecentError): void {
  rotateDay(new Date(error.timestamp));
  errorsToday += 1;
  recentErrors.unshift(error);
  if (recentErrors.length > 50) recentErrors.pop();
}

export function recentApiErrors(): RecentError[] {
  return [...recentErrors];
}

export function dailyOpsSummary() {
  rotateDay();
  return {
    date: day,
    requests: requestsToday,
    errors: errorsToday,
  };
}

export function resetObservability(): void {
  recentErrors.splice(0);
  requestsToday = 0;
  errorsToday = 0;
  day = new Date().toISOString().slice(0, 10);
}
