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

const server = new McpServer({ name: 'bondsman-mcp', version: '0.2.0' });

function content(value: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(value, null, 2) }],
  };
}

server.registerTool(
  'list_actions',
  {
    description:
      'List every bonded action from the live Bondsman projection, most recent first.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/actions')),
);

server.registerTool(
  'get_action',
  {
    description:
      'Full detail for one action: reasoning, events, on-chain transactions, explorer links.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  },
  async ({ actionId }) => content(await apiGet(`/api/actions/${actionId}`)),
);

server.registerTool(
  'get_reputation',
  {
    description:
      'On-chain reputation for an agent address: clean, slashed, score, action history.',
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
      'Network, chain name, contract package hashes, and known account roles for the running Bondsman deployment.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/deployments')),
);

server.registerTool(
  'get_verifiers',
  {
    description:
      'List the fault classes and verifier status advertised by the Bondsman backend.',
    inputSchema: {},
  },
  async () => content(await apiGet('/api/verifiers')),
);

server.registerTool(
  'verify_receipt',
  {
    description:
      'Verify a signed Bondsman receipt for a completed action.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  },
  async ({ actionId }) =>
    content(await apiGet(`/api/receipt/${actionId}/verify`)),
);

server.registerTool(
  'submit_bonded_action',
  {
    description:
      'V2 dependent tool. The current public controller remains on V1 until V2 deployment is proven.',
    inputSchema: {
      invoiceId: z.number().int().nonnegative(),
      amount: z.string().regex(/^\d+$/),
      faultClass: z.string().optional(),
    },
  },
  async (input) =>
    content({
      success: false,
      code: 'V2_REQUIRED',
      message:
        'submit_bonded_action requires the V2 controller deployment. Use the backend demo arm endpoint for the current V1 testnet flow.',
      input,
    }),
);

server.registerTool(
  'get_bond_requirement',
  {
    description:
      'Not exposed on the HTTP API. Use get_deployments and the pricing tiers documented in the Bondsman docs to compute the bond, or call the controller directly.',
    inputSchema: {
      amount: z.string().regex(/^\d+$/),
      agentAddress: z.string().min(1),
    },
  },
  async ({ amount, agentAddress }) =>
    content({
      note: 'get_bond_requirement is available via the local controller; the HTTP API does not expose it. Use the tier table in the Bondsman docs or call the controller from a Casper client.',
      amount,
      agentAddress,
    }),
);

server.registerTool(
  'challenge_action',
  {
    description:
      'Submit a challenge against an action via the Bondsman backend key. Returns the challenge and resolve transaction hashes.',
    inputSchema: { actionId: z.number().int().nonnegative() },
  },
  async ({ actionId }) =>
    content(await apiPost('/api/challenge', { actionId })),
);

await server.connect(new StdioServerTransport());
