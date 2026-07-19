#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_BASE = process.env.BONDSMAN_API_BASE || 'http://127.0.0.1:3001';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bondsman API ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method: 'POST' };
  if (body !== undefined) {
    init.headers = { 'content-type': 'application/json' };
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Bondsman API ${path} failed: ${res.status} ${text}`);
  }
  return (await res.json()) as T;
}

async function apiPostResult<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<{
  status: number;
  ok: boolean;
  body: T;
  headers: Record<string, string | null>;
}> {
  const init: RequestInit = { method: 'POST' };
  init.headers = { 'content-type': 'application/json', ...headers };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    body: text ? JSON.parse(text) as T : null as T,
    headers: {
      paymentRequired: res.headers.get('payment-required'),
      paymentResponse: res.headers.get('payment-response'),
      xPaymentRequired: res.headers.get('x-payment-required'),
    },
  };
}

const server = new McpServer({ name: 'bondsman-mcp', version: '0.3.0' });

function content(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

server.registerTool(
  'list_actions',
  {
    description:
      'Read-only: list every bonded action from the live Bondsman projection, most recent first.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/actions')),
);

server.registerTool(
  'get_action',
  {
    description:
      'Read-only: full detail for one action, including reasoning, events, on-chain transactions, and explorer links.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  },
  async ({ actionId }) => content(await apiGet(`/api/actions/${actionId}`)),
);

server.registerTool(
  'get_reputation',
  {
    description:
      'Read-only: on-chain reputation for an agent address: clean, slashed, score, action history.',
    inputSchema: { agentAddress: z.string().min(1) },
  },
  async ({ agentAddress }) =>
    content(
      await apiGet(`/api/agents/${encodeURIComponent(agentAddress)}`),
    ),
);

server.registerTool(
  'get_deployments',
  {
    description:
      'Read-only: network, chain name, contract package hashes, and known account roles for the running Bondsman deployment.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/deployments')),
);

server.registerTool(
  'get_verifiers',
  {
    description:
      'Read-only: list the fault classes and verifier status advertised by the Bondsman backend.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/verifiers')),
);

server.registerTool(
  'verify_receipt',
  {
    description:
      'Read-only: verify a signed Bondsman receipt for a completed action.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  },
  async ({ actionId }) =>
    content(await apiGet(`/api/receipt/${actionId}/verify`)),
);

server.registerTool(
  'get_assurance_templates',
  {
    description:
      'Design-only: list supported Assurance Studio templates and whether they are executable today or blueprints.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/assurance/templates')),
);

server.registerTool(
  'design_assurance_policy',
  {
    description:
      'Design-only: produce a Bondsman assurance manifest without payment, challenge, settlement, or Casper transaction submission.',
    inputSchema: {
      templateId: z.enum([
        'invoice_delivery',
        'duplicate_invoice_test',
        'treasury_payment',
        'dex_execution',
        'x402_service_delivery',
      ]),
      description: z.string().min(8).max(1000),
      amount: z.string().regex(/^[1-9]\d*$/),
      agentConfidence: z.number().min(0).max(1),
      counterpartyStatus: z.enum(['new', 'known', 'trusted', 'unknown']),
      evidenceSource: z.enum([
        'signed_delivery_attestation',
        'paid_claim_registry',
        'multisig_approval',
        'oracle_report',
        'execution_receipt',
      ]),
      maxLossBps: z.number().int().min(1).max(10000),
      urgency: z.enum(['low', 'normal', 'high']),
    },
  },
  async (input) => content(await apiPost('/api/assurance/analyze', input)),
);

server.registerTool(
  'quote_bonded_action',
  {
    description:
      'Paid HTTP: request a bonded-action quote. Without a payment-signature this returns the x402 402 requirement and does not mutate protocol state.',
    inputSchema: {
      amount: z.string().regex(/^[1-9]\d*$/).optional(),
      faultClass: z.enum(['duplicate_claim', 'delivery_contradiction']).optional(),
      paymentSignature: z.string().optional(),
    },
  },
  async ({ paymentSignature, ...body }) =>
    content(await apiPostResult('/v1/actions/quote', body, paymentSignature
      ? { 'payment-signature': paymentSignature }
      : undefined)),
);

server.registerTool(
  'submit_bonded_action',
  {
    description:
      'Paid HTTP execution: submit a bonded action only after x402 quote settlement and payer submit authorization. This is not a sponsored public mutation.',
    inputSchema: {
      quoteHash: z.string().min(1),
      faultClass: z.enum(['duplicate_claim', 'delivery_contradiction']),
      buyerPublicKey: z.string().optional(),
      eventType: z.enum(['delivery_rejected', 'goods_not_received']).optional(),
      submitAuthorization: z.object({
        publicKey: z.string().min(1),
        timestamp: z.number().int().positive(),
        nonce: z.string().min(1),
        signature: z.string().min(1),
      }),
    },
  },
  async (input) => content(await apiPost('/v1/actions/submit', input)),
);

server.registerTool(
  'replay_canonical_proof',
  {
    description:
      'Read-only: replay canonical Action 27 evidence, receipt, and quote-consumption checks.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/replay/canonical')),
);

server.registerTool(
  'check_canonical_quote',
  {
    description:
      'Read-only: verify that canonical Action 27 paid quote is consumed and cannot be replayed.',
    inputSchema: {},
  },
  async () => content(await apiPost('/api/replay/canonical/quote-check')),
);

server.registerTool(
  'public_capabilities',
  {
    description:
      'Read-only: report public Bondsman capabilities and which mutation modes are disabled.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/public-capabilities')),
);

await server.connect(new StdioServerTransport());
