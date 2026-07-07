import { config as loadDotenv } from 'dotenv';
import { join } from 'node:path';

loadDotenv({ path: join(process.cwd(), '.env'), quiet: true });

const DEFAULT_API_BASE =
  'https://bondsman-backend-production.up.railway.app';
const API_BASE = (
  process.env.BONDSMAN_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  DEFAULT_API_BASE
).replace(/\/$/, '');
const TARGET_READY_CASES = Number(process.env.DEMO_READY_TARGET ?? 2);
const MIN_REMAINING_MS = 10 * 60 * 1000;

interface ReadyCase {
  actionId: number;
  status: string;
  duplicateProven: boolean;
  reservedForManual: boolean;
  safeToChallengeNow: boolean;
  remainingMs: number;
  windowEnd: number;
  explorerLinks?: Record<string, string>;
}

interface ReadyResponse {
  success: boolean;
  count: number;
  cases: ReadyCase[];
  code?: string;
  message?: string;
  nextStep?: string;
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'content-type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const reason =
      typeof body.message === 'string' ? body.message : response.statusText;
    throw new Error(`${path} failed (${response.status}): ${reason}`);
  }
  return body as T;
}

async function readyCases(): Promise<ReadyCase[]> {
  const response = await request<ReadyResponse>('/api/demo/ready');
  return response.cases.filter(
    (ready) =>
      ready.status === 'Executed' &&
      ready.duplicateProven &&
      ready.reservedForManual &&
      ready.safeToChallengeNow &&
      ready.remainingMs >= MIN_REMAINING_MS,
  );
}

function log(event: string, data: Record<string, unknown>) {
  console.log(JSON.stringify({ event, ...data }));
}

async function main() {
  log('demo_prearm_start', {
    apiBase: API_BASE,
    targetReadyCases: TARGET_READY_CASES,
    minRemainingMs: MIN_REMAINING_MS,
  });

  let ready = await readyCases();
  log('demo_prearm_ready_check', {
    readyActionIds: ready.map((action) => action.actionId),
    readyCount: ready.length,
  });

  while (ready.length < TARGET_READY_CASES) {
    const needed = TARGET_READY_CASES - ready.length;
    log('demo_prearm_arm_start', { needed });
    const armed = await request<ReadyCase>('/api/demo/arm', {
      method: 'POST',
    });
    log('demo_prearm_arm_complete', {
      actionId: armed.actionId,
      status: armed.status,
      duplicateProven: armed.duplicateProven,
      reservedForManual: armed.reservedForManual,
      remainingMs: Math.max(0, armed.windowEnd - Date.now()),
      explorerLinks: armed.explorerLinks ?? {},
    });
    ready = await readyCases();
    log('demo_prearm_ready_check', {
      readyActionIds: ready.map((action) => action.actionId),
      readyCount: ready.length,
    });
  }

  log('demo_prearm_complete', {
    readyActionIds: ready.map((action) => action.actionId),
    readyCount: ready.length,
  });
}

await main().catch((error) => {
  log('demo_prearm_failed', {
    reason: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
