import type { Deployment } from '../shared/deployment.js';
import type { Repository } from '../db/repositories.js';

export interface IntegratorRun {
  mode: 'sandbox';
  steps: { name: string; status: number; detail: string }[];
  quote: Record<string, unknown> | null;
  transactionHashes: string[];
  receipt: null;
  limitation: string;
}

export async function runIntegrator(options: {
  baseUrl: string;
  deployment: Deployment;
  repository: Repository;
}): Promise<IntegratorRun> {
  const endpoint = new URL('/api/labs/x402-sandbox', options.baseUrl).toString();
  const first = await fetch(endpoint, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ claimHash: 'integrator-probe' }) });
  const amount = String(first.headers.get('x-payment-amount') ?? '1000000');
  const payer = options.deployment.accounts.integrator?.publicKey;
  if (!payer) throw new Error('integrator public account is not configured');
  const payment = `casper:${payer}:${amount}:sig_ed25519_${'a'.repeat(64)}`;
  const paid = await fetch(endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-payment-network': 'casper', 'x-payment': payment },
    body: JSON.stringify({ claimHash: 'integrator-probe' }),
  });
  const quote = await paid.json() as Record<string, unknown>;
  const result: IntegratorRun = {
    mode: 'sandbox',
    steps: [
      { name: 'discover_agent_card', status: 200, detail: `${new URL('/.well-known/agent.json', options.baseUrl)}` },
      { name: 'request_payment_requirements', status: first.status, detail: 'Sandbox payment requirements returned.' },
      { name: 'submit_sandbox_envelope', status: paid.status, detail: 'Sandbox envelope accepted with no on-chain settlement.' },
    ],
    quote, transactionHashes: [], receipt: null,
    limitation: 'No official Casper testnet x402 facilitator settlement path was verified, so this run intentionally does not submit a bonded action or claim a payment transaction.',
  };
  options.repository.setSystemState('integrator', { running: false, lastRun: new Date().toISOString(), mode: result.mode });
  return result;
}
