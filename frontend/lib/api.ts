import type {
  ActionDetail,
  ActionSummary,
  AgentReputation,
  Deployment,
  Health,
  Invoice,
  Reserve,
  TransactionStatus,
  WalletResolveResult,
  Watchdog,
} from './types';

// Server components talk to the backend origin directly.
// Client components fetch the same paths through the Next proxy ("/api/*").
const SERVER_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';
const FETCH_TIMEOUT_MS = 30_000;

export class BackendUnreachable extends Error {
  constructor() {
    super('backend unreachable');
    this.name = 'BackendUnreachable';
  }
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

const FRIENDLY: Record<string, string> = {
  NOT_OWNER: 'The backend key is not the contract owner. The contract needs to be redeployed or the key updated.',
  CHALLENGE_WINDOW_CLOSED: "This action's challenge window has closed.",
  NO_ELIGIBLE_ACTION: 'No eligible action is available right now. Try arming a new one.',
  NOT_EXECUTABLE: 'This action is not in an executable state.',
  ALREADY_CHALLENGED: 'This action has already been challenged.',
  STALE_CONTRACT_VERSION: 'The contract version has changed. Evidence from the previous version cannot be used.',
  ARM_FAILED: 'Could not arm a new action. The backend encountered an on-chain error.',
  CHALLENGE_NOT_FINAL: 'The challenge transaction has not reached finality yet.',
  NODE_UNREACHABLE: 'The Casper testnet node is not reachable.',
  RPC_ERROR: 'The Casper node rejected the deploy.',
};

export function friendlyError(code: string, fallback: string): string {
  return FRIENDLY[code] ?? fallback;
}

async function parseErrorBody(res: Response): Promise<{ code: string; message: string } | null> {
  try {
    const body = await res.json();
    if (body && typeof body.code === 'string' && typeof body.message === 'string') {
      return { code: body.code as string, message: body.message as string };
    }
  } catch { /* not JSON */ }
  return null;
}

async function serverGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${SERVER_BASE}${path}`, {
      cache: 'no-store',
    });
  } catch {
    throw new BackendUnreachable();
  }
  if (!res.ok) {
    const err = await parseErrorBody(res);
    if (err) throw new ApiError(err.code, friendlyError(err.code, err.message));
    if (res.status === 404) throw new Error('not found');
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(input, {
      ...init,
      signal: init.signal ?? abort.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function safeGet<T>(
  fn: () => Promise<T>,
): Promise<{ data: T; reachable: true } | { data: null; reachable: false }> {
  try {
    return { data: await fn(), reachable: true };
  } catch (err) {
    if (err instanceof BackendUnreachable) {
      return { data: null, reachable: false };
    }
    throw err;
  }
}

// Server-side reads.
export const api = {
  health: () => serverGet<Health>('/api/health'),
  invoices: () => serverGet<Invoice[]>('/api/invoices'),
  actions: () => serverGet<ActionSummary[]>('/api/actions'),
  action: (id: number | string) => serverGet<ActionDetail>(`/api/actions/${id}`),
  agent: (address: string) =>
    serverGet<AgentReputation>(`/api/agents/${address}`),
  reserve: () => serverGet<Reserve>('/api/reserve'),
  deployments: () => serverGet<Deployment>('/api/deployments'),
  watchdog: () => serverGet<Watchdog>('/api/watchdog'),
};

// Client-side reads, proxied through Next at /api/*.
async function clientGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`/api${path}`, { cache: 'no-store' });
  } catch {
    throw new BackendUnreachable();
  }
  if (!res.ok) {
    const err = await parseErrorBody(res);
    if (err) throw new ApiError(err.code, friendlyError(err.code, err.message));
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

async function clientPost<T>(path: string, body?: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`/api${path}`, {
      method: 'POST',
      ...(body !== undefined
        ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    });
  } catch {
    throw new BackendUnreachable();
  }
  if (!res.ok) {
    const err = await parseErrorBody(res);
    if (err) throw new ApiError(err.code, friendlyError(err.code, err.message));
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const clientApi = {
  health: () => clientGet<Health>('/health'),
  actions: () => clientGet<ActionSummary[]>('/actions'),
  action: (id: number | string) => clientGet<ActionDetail>(`/actions/${id}`),
  reserve: () => clientGet<Reserve>('/reserve'),
  watchdog: () => clientGet<Watchdog>('/watchdog'),
  arm: () => clientPost<ActionDetail>('/demo/arm'),
  watchdogDemo: () => clientPost<ActionDetail>('/watchdog/demo'),
  challenge: (actionId: number) =>
    clientPost<{ challenge: string; resolve: string }>('/challenge', { actionId }),
  deployments: () => clientGet<Deployment>('/deployments'),
  transactionStatus: (hash: string) =>
    clientGet<TransactionStatus>(`/transactions/${hash}`),
  walletResolve: (actionId: number, challengeDeployHash: string) =>
    clientPost<WalletResolveResult>('/challenge/wallet-resolve', {
      actionId,
      challengeDeployHash,
    }),
  putDeploy: (deploy: unknown, nodeUrl?: string) =>
    clientPost<{ deploy_hash: string }>('/rpc/put-deploy', { deploy, nodeUrl }),
};
