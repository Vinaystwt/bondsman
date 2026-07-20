import type {
  ActionDetail,
  ActionSummary,
  AgentReputation,
  AgentCard,
  CanonicalProof,
  CanonicalReplay,
  Coverage,
  Deployment,
  DemoReady,
  DemoProofs,
  DemoJob,
  Health,
  Invoice,
  PortableReceipt,
  PublicCapabilities,
  QuoteCheckResponse,
  ReceiptVerification,
  Reserve,
  TransactionStatus,
  Verifier,
  WalletResolveResult,
  Watchdog,
  X402PaymentResponse,
} from './types';

// Server components talk to the backend origin directly.
// Client components fetch the same paths through the Next proxy ("/api/*").
const SERVER_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';
const FETCH_TIMEOUT_MS = 30_000;
const DIRECT_BACKEND_WRITE_PATHS = new Set([
  '/challenge',
  '/challenge/wallet-resolve',
  '/demo/arm',
  '/resolve',
  '/watchdog/demo',
]);

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
  CHALLENGE_NOT_FINAL: 'The challenge transaction has not reached finality yet.',
  NODE_UNREACHABLE: 'The Casper testnet node is not reachable.',
  ARM_TIMEOUT: 'Arming is still submitting real Casper testnet transactions. Refresh or try again in a moment.',
  WATCHDOG_DEMO_TIMEOUT: 'The autonomous demo is still submitting real Casper testnet transactions. Refresh or try again in a moment.',
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
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), timeoutMs);
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
  publicCapabilities: () =>
    serverGet<PublicCapabilities>('/api/public-capabilities'),
  invoices: () => serverGet<Invoice[]>('/api/invoices'),
  actions: () => serverGet<ActionSummary[]>('/api/actions'),
  action: (id: number | string) => serverGet<ActionDetail>(`/api/actions/${id}`),
  demoReady: () => serverGet<DemoReady>('/api/demo/ready'),
  demoProofs: () => serverGet<DemoProofs>('/api/demo/proofs'),
  agent: (address: string) =>
    serverGet<AgentReputation>(`/api/agents/${address}`),
  reserve: () => serverGet<Reserve>('/api/reserve'),
  deployments: () => serverGet<Deployment>('/api/deployments'),
  watchdog: () => serverGet<Watchdog>('/api/watchdog'),
  canonicalProof: () => serverGet<CanonicalProof>('/api/proofs/canonical'),
  canonicalReplay: () => serverGet<CanonicalReplay>('/api/replay/canonical'),
  featuredProofs: () => serverGet<CanonicalProof[]>('/api/proofs/featured'),
  proof: (id: number | string) => serverGet<CanonicalProof>(`/api/proof/${id}`),
  receipt: (id: number | string) => serverGet<PortableReceipt>(`/api/receipt/${id}`),
  receiptVerify: (id: number | string) =>
    serverGet<ReceiptVerification>(`/api/receipt/${id}/verify`),
  verifiers: () => serverGet<Verifier[]>('/api/verifiers'),
  coverage: () => serverGet<Coverage>('/api/coverage'),
  agentCard: () => serverGet<AgentCard>('/.well-known/agent.json'),
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

async function clientPost<T>(
  path: string,
  body?: unknown,
  timeoutMs?: number,
): Promise<T> {
  let res: Response;
  try {
    const target = DIRECT_BACKEND_WRITE_PATHS.has(path)
      ? `${SERVER_BASE}/api${path}`
      : `/api${path}`;
    res = await fetchWithTimeout(
      target,
      {
        method: 'POST',
        ...(body !== undefined
          ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
          : {}),
      },
      timeoutMs,
    );
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
  publicCapabilities: () =>
    clientGet<PublicCapabilities>('/public-capabilities'),
  canonicalReplay: () => clientGet<CanonicalReplay>('/replay/canonical'),
  receipt: (id: number | string) =>
    clientGet<PortableReceipt>(`/receipt/${id}`),
  receiptVerify: (id: number | string) =>
    clientGet<ReceiptVerification>(`/receipt/${id}/verify`),
  actions: () => clientGet<ActionSummary[]>('/actions'),
  action: (id: number | string) => clientGet<ActionDetail>(`/actions/${id}`),
  demoReady: () => clientGet<DemoReady>('/demo/ready'),
  demoProofs: () => clientGet<DemoProofs>('/demo/proofs'),
  reserve: () => clientGet<Reserve>('/reserve'),
  watchdog: () => clientGet<Watchdog>('/watchdog'),
  arm: () => clientPost<ActionDetail>('/demo/arm'),
  armAsync: () => clientPost<DemoJob>('/demo/arm/async'),
  watchdogDemo: () => clientPost<ActionDetail>('/watchdog/demo'),
  watchdogDemoAsync: () => clientPost<DemoJob>('/watchdog/demo/async'),
  challenge: (actionId: number) => clientPost<DemoJob>('/challenge', { actionId }),
  job: (id: string) => clientGet<DemoJob>(`/jobs/${id}`),
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
  /**
   * Live x402 quote probe. Sends an unpaid quote request against the paid HTTP
   * surface. Expects HTTP 402 with an x402 payment requirement in the body,
   * and returns the parsed status plus that body so callers can display the
   * settlement instrument.
   */
  async liveQuoteProbe(body: {
    amount: string;
    faultClass: string;
  }): Promise<{
    status: number;
    x402?: X402PaymentResponse;
    other?: unknown;
    error?: string;
  }> {
    try {
      const res = await fetchWithTimeout('/v1/actions/quote', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const parsed = (await res.json().catch(() => null)) as
        | X402PaymentResponse
        | Record<string, unknown>
        | null;
      if (res.status === 402 && parsed && typeof parsed === 'object') {
        return { status: 402, x402: parsed as X402PaymentResponse };
      }
      return { status: res.status, other: parsed };
    } catch {
      return { status: 0, error: 'network' };
    }
  },
  /**
   * Read only quote consumption check for the canonical Action 27 replay.
   * Confirms that the paid quote is bound to the action and will not accept a
   * second submission.
   */
  quoteConsumptionCheck: (quoteHash: string) =>
    clientPost<QuoteCheckResponse>('/replay/canonical/quote-check', { quoteHash }),
  /**
   * Verify an arbitrary receipt against the backend. Used by the receipt
   * tamper lab: modify a single field client side, then send the full JSON to
   * the real verifier and show the result.
   */
  verifyReceiptBody: (
    id: number | string,
    body: PortableReceipt,
  ) => clientPost<ReceiptVerification>(`/receipt/${id}/verify`, body),
};
