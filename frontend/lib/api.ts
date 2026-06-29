import type {
  ActionDetail,
  ActionSummary,
  AgentReputation,
  Deployment,
  Invoice,
  Reserve,
} from './types';

// Server components talk to the backend origin directly.
// Client components fetch the same paths through the Next proxy ("/api/*").
const SERVER_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:3001';

export class BackendUnreachable extends Error {
  constructor() {
    super('backend unreachable');
    this.name = 'BackendUnreachable';
  }
}

async function serverGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${SERVER_BASE}${path}`, { cache: 'no-store' });
  } catch {
    throw new BackendUnreachable();
  }
  if (!res.ok) {
    if (res.status === 404) throw new Error('not found');
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Wrap a server read so a page can render the backend-down state instead of crashing. */
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
  invoices: () => serverGet<Invoice[]>('/api/invoices'),
  actions: () => serverGet<ActionSummary[]>('/api/actions'),
  action: (id: number | string) => serverGet<ActionDetail>(`/api/actions/${id}`),
  agent: (address: string) =>
    serverGet<AgentReputation>(`/api/agents/${address}`),
  reserve: () => serverGet<Reserve>('/api/reserve'),
  deployments: () => serverGet<Deployment>('/api/deployments'),
};

// Client-side reads, proxied through Next at /api/*.
async function clientGet<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`request failed: ${res.status}`);
  return (await res.json()) as T;
}

export const clientApi = {
  actions: () => clientGet<ActionSummary[]>('/actions'),
  action: (id: number | string) => clientGet<ActionDetail>(`/actions/${id}`),
  reserve: () => clientGet<Reserve>('/reserve'),
};
