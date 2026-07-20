import type {
  AgentCard,
  AssuranceAnalysis,
  AssuranceAnalyzeRequest,
  AssuranceTemplatesResponse,
  CanonicalProof,
  CanonicalReplay,
  Deployment,
  Health,
  ActionDetail,
  PaidQuoteResponse,
  PaidActionSubmitResponse,
  PortableReceipt,
  SubmitAuthorization,
  PublicCapabilities,
  QuoteCheckResponse,
  ReceiptVerification,
  X402PaymentResponse,
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
  NODE_UNREACHABLE: 'The Casper testnet node is not reachable.',
};

export function friendlyError(code: string, fallback: string): string {
  return FRIENDLY[code] ?? fallback;
}

async function parseErrorBody(
  res: Response,
): Promise<{ code: string; message: string } | null> {
  try {
    const body = await res.json();
    if (body && typeof body.code === 'string' && typeof body.message === 'string') {
      return { code: body.code as string, message: body.message as string };
    }
  } catch {
    /* not JSON */
  }
  return null;
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

async function serverGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetchWithTimeout(`${SERVER_BASE}${path}`, { cache: 'no-store' });
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

/**
 * Server-side reads. All read only. Only the endpoints the final product
 * actually uses are exposed.
 */
export const api = {
  health: () => serverGet<Health>('/api/health'),
  publicCapabilities: () =>
    serverGet<PublicCapabilities>('/api/public-capabilities'),
  deployments: () => serverGet<Deployment>('/api/deployments'),
  canonicalProof: () => serverGet<CanonicalProof>('/api/proofs/canonical'),
  canonicalReplay: () => serverGet<CanonicalReplay>('/api/replay/canonical'),
  receipt: (id: number | string) =>
    serverGet<PortableReceipt>(`/api/receipt/${id}`),
  receiptVerify: (id: number | string) =>
    serverGet<ReceiptVerification>(`/api/receipt/${id}/verify`),
  actions: () => serverGet<ActionDetail[]>('/api/actions'),
  action: (id: number | string) => serverGet<ActionDetail>(`/api/actions/${id}`),
  agentCard: () => serverGet<AgentCard>('/.well-known/agent.json'),
  assuranceTemplates: () =>
    serverGet<AssuranceTemplatesResponse>('/api/assurance/templates'),
};

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
    res = await fetchWithTimeout(
      `/api${path}`,
      {
        method: 'POST',
        ...(body !== undefined
          ? {
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify(body),
            }
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

/**
 * Client-side reads and interactions used by the final public product.
 *
 * READ ONLY: health, canonicalReplay, receipt.
 * DESIGN ONLY: assuranceAnalyze, assuranceTemplates.
 * VERIFICATION: receiptVerify, verifyReceiptBody.
 * PAID HTTP probe: liveQuoteProbe (unpaid probe returning HTTP 402).
 * READ ONLY replay helper: quoteConsumptionCheck.
 *
 * Paid HTTP methods require wallet authorization and real x402 settlement.
 * No sponsored operator mutation is exposed from the public frontend.
 */
export const clientApi = {
  health: () => clientGet<Health>('/health'),
  publicCapabilities: () =>
    clientGet<PublicCapabilities>('/public-capabilities'),
  canonicalReplay: () => clientGet<CanonicalReplay>('/replay/canonical'),
  receipt: (id: number | string) =>
    clientGet<PortableReceipt>(`/receipt/${id}`),
  receiptVerify: (id: number | string) =>
    clientGet<ReceiptVerification>(`/receipt/${id}/verify`),
  action: (id: number | string) =>
    clientGet<ActionDetail>(`/actions/${id}`),
  assuranceTemplates: () =>
    clientGet<AssuranceTemplatesResponse>('/assurance/templates'),
  assuranceAnalyze: (body: AssuranceAnalyzeRequest) =>
    clientPost<AssuranceAnalysis>('/assurance/analyze', body),
  quoteConsumptionCheck: (quoteHash: string) =>
    clientPost<QuoteCheckResponse>('/replay/canonical/quote-check', { quoteHash }),
  verifyReceiptBody: (id: number | string, body: PortableReceipt) =>
    clientPost<ReceiptVerification>(`/receipt/${id}/verify`, body),
  /**
   * Live x402 probe. Sends an unpaid quote request against /v1/actions/quote.
   * Expects HTTP 402 with an x402 v2 payment requirement. No transaction is
   * ever created and no secret is exposed.
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
  async paidQuote(
    body: { amount: string; faultClass: string },
    paymentSignature: string,
  ): Promise<PaidQuoteResponse> {
    let res: Response;
    try {
      res = await fetchWithTimeout('/v1/actions/quote', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'payment-signature': paymentSignature,
        },
        body: JSON.stringify(body),
      }, 120_000);
    } catch {
      throw new BackendUnreachable();
    }
    if (!res.ok) {
      const err = await parseErrorBody(res);
      if (err) throw new ApiError(err.code, friendlyError(err.code, err.message));
      throw new Error(`request failed: ${res.status}`);
    }
    return (await res.json()) as PaidQuoteResponse;
  },
  async submitPaidAction(body: {
    quoteHash: string;
    faultClass: 'duplicate_claim' | 'delivery_contradiction';
    buyerPublicKey?: string;
    eventType?: 'delivery_rejected' | 'goods_not_received';
    submitAuthorization: SubmitAuthorization;
  }): Promise<PaidActionSubmitResponse> {
    let res: Response;
    try {
      res = await fetchWithTimeout('/v1/actions/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      }, 120_000);
    } catch {
      throw new BackendUnreachable();
    }
    if (!res.ok) {
      const err = await parseErrorBody(res);
      if (err) throw new ApiError(err.code, friendlyError(err.code, err.message));
      throw new Error(`request failed: ${res.status}`);
    }
    return (await res.json()) as PaidActionSubmitResponse;
  },
};
