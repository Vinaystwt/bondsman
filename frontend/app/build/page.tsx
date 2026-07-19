import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { Label, Panel } from '@/components/ui/Primitives';
import { BackendDown } from '@/components/ui/States';
import CopyHash from '@/components/ui/CopyHash';
import { contractExplorer, truncateHash } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Integrate with Bondsman',
  description:
    'How an autonomous agent discovers Bondsman, pays for a quote through x402, submits a bonded action, and verifies the portable receipt.',
};

export const revalidate = 60;

const FLOW: { step: number; label: string; body: string; endpoint?: string }[] = [
  {
    step: 1,
    label: 'Discover the A2A agent card',
    body: 'Any A2A-aware agent fetches the well-known agent card. It advertises the Bondsman skills and the x402 authentication scheme.',
    endpoint: 'GET /.well-known/agent.json',
  },
  {
    step: 2,
    label: 'Request a bonded action quote',
    body: 'Ask for a quote for the action you want to perform. The gate returns a paid quote requirement.',
    endpoint: 'POST /v1/actions/quote',
  },
  {
    step: 3,
    label: 'Receive HTTP 402',
    body: 'The gate responds with a 402 Payment Required carrying the x402 payment requirements (asset, amount, recipient, facilitator).',
    endpoint: '402 Payment Required',
  },
  {
    step: 4,
    label: 'Pay with WCSPR on Casper Testnet',
    body: 'Sign an x402 exact-scheme payment for WCSPR on casper:casper-test. Submit it through the CSPR.cloud facilitator.',
  },
  {
    step: 5,
    label: 'Receive the paid quote',
    body: 'The gate returns a single-use paid quote hash bound to the action type, verifier and challenge window.',
    endpoint: 'quoteHash, verifier, challengeWindow',
  },
  {
    step: 6,
    label: 'Submit the bonded action',
    body: 'Submit the action with a Casper account authorization from the same Casper account that paid for the quote. Bondsman posts the bond, executes and opens the challenge window.',
    endpoint: 'POST /v1/actions/submit',
  },
  {
    step: 7,
    label: 'Monitor the action',
    body: 'Poll the action detail. When the window closes with no verified fault, the bond returns. If contradictory evidence arrives, the watchdog challenges and the contract slashes.',
    endpoint: 'GET /api/actions/:id',
  },
  {
    step: 8,
    label: 'Retrieve and verify the portable receipt',
    body: 'Fetch the signed receipt. Reverify the signature at any time. Store or forward it as the proof of settlement.',
    endpoint: 'GET /api/receipt/:id · GET /api/receipt/:id/verify',
  },
];

const SURFACES: { title: string; body: string; endpoint: string }[] = [
  {
    title: 'A2A agent card',
    body: 'The well-known agent card advertising skills and authentication.',
    endpoint: '/.well-known/agent.json',
  },
  {
    title: 'Quote endpoint',
    body: 'Return a paid quote requirement for a proposed action.',
    endpoint: '/v1/actions/quote',
  },
  {
    title: 'Submit endpoint',
    body: 'Post a bonded action with the payer-signed authorization.',
    endpoint: '/v1/actions/submit',
  },
  {
    title: 'Action projection',
    body: 'Read the action state, transactions and events.',
    endpoint: '/api/actions/:id',
  },
  {
    title: 'Canonical proof',
    body: 'Fetch the proof schema for a settled action.',
    endpoint: '/api/proof/:id',
  },
  {
    title: 'Portable receipt',
    body: 'Signed receipt of the settled action.',
    endpoint: '/api/receipt/:id',
  },
  {
    title: 'Receipt verify',
    body: 'Independent signature verification.',
    endpoint: '/api/receipt/:id/verify',
  },
  {
    title: 'MCP endpoint',
    body: 'Model Context Protocol server for MCP-native agents.',
    endpoint: '/mcp',
  },
];

const QUOTE_EXAMPLE = `POST /v1/actions/quote
Content-Type: application/json

{
  "actionType": "invoice_payout",
  "amount": "50000000000000",
  "faultClass": "delivery_contradiction"
}`;

const QUOTE_402 = `HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 1,
  "accepts": [
    {
      "scheme": "exact",
      "network": "casper:casper-test",
      "asset": "WCSPR",
      "maxAmountRequired": "100000000",
      "payTo": "002cfb8f00d21230…",
      "facilitator": "x402-facilitator.cspr.cloud"
    }
  ]
}`;

const SUBMIT_EXAMPLE = `POST /v1/actions/submit
Content-Type: application/json

{
  "quoteHash": "0x8c3401bd019bfca6ff9e9ce0497ddf495bb19719e27d935c7a724bb4d5deca5f",
  "invoice": { "invoiceId": 1784457630418, "amount": "50000000000000" },
  "reasoning": "…",
  "authorization": {
    "casperAccount": "003b3362ea7af5776a37530df663afa7bc7c673ebcdd167f8934e2ac68d7eb9c77",
    "signature": "<ed25519 signature over the canonical submit payload>"
  }
}`;

export default async function BuildPage() {
  const depRes = await safeGet(() => api.deployments());
  const cardRes = await safeGet(() => api.agentCard());

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>Integrate</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Adopt bonded accountability from any autonomous agent.
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Bondsman ships as an A2A agent, an x402 payment surface and an MCP
          endpoint. Discover it, pay for a paid quote, submit a bonded action,
          then verify the portable receipt.
        </p>
      </header>

      <section aria-label="End-to-end flow" className="space-y-4">
        <div>
          <Label>End-to-end integration</Label>
          <p className="mt-1 text-sm text-muted">
            Eight steps. Every real Bondsman action follows this shape.
          </p>
        </div>
        <ol className="grid gap-3 md:grid-cols-2">
          {FLOW.map((s) => (
            <li key={s.step}>
              <Panel className="h-full p-5">
                <div className="flex items-baseline gap-3">
                  <span className="serial text-[0.62rem] text-muted">
                    Step {String(s.step).padStart(2, '0')}
                  </span>
                  <h3 className="text-sm font-semibold text-bone">{s.label}</h3>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
                {s.endpoint && (
                  <p className="mt-3 rounded border border-rule bg-ink px-3 py-1.5 font-mono text-xs text-accent">
                    {s.endpoint}
                  </p>
                )}
              </Panel>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Quote and pay" className="space-y-4">
        <div>
          <Label>Example · Quote and pay</Label>
          <h2 className="text-2xl font-semibold text-bone">
            Ask for a quote, receive a 402.
          </h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel className="overflow-hidden">
            <div className="border-b border-rule px-5 py-2 text-xs text-muted">
              Request
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
              <code className="font-mono text-bone">{QUOTE_EXAMPLE}</code>
            </pre>
          </Panel>
          <Panel className="overflow-hidden">
            <div className="border-b border-rule px-5 py-2 text-xs text-muted">
              Response
            </div>
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
              <code className="font-mono text-bone">{QUOTE_402}</code>
            </pre>
          </Panel>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Settle the x402 payment through the CSPR.cloud facilitator. Once
          settled, receive the paid quote hash and continue to submit.
        </p>
      </section>

      <section aria-label="Submit a bonded action" className="space-y-4">
        <div>
          <Label>Example · Submit a bonded action</Label>
          <h2 className="text-2xl font-semibold text-bone">
            Bind the paid quote to a Casper-signed submission.
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">
            The current integration security model requires that the paid action
            submission carry a signed authorization from the same Casper account
            that paid for the quote. This binds the quote to the payer and stops
            replay by a different account.
          </p>
        </div>
        <Panel className="overflow-hidden">
          <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
            <code className="font-mono text-bone">{SUBMIT_EXAMPLE}</code>
          </pre>
        </Panel>
      </section>

      <section aria-label="Endpoints" className="space-y-4">
        <div>
          <Label>Endpoints</Label>
          <h2 className="text-2xl font-semibold text-bone">
            Every surface an integrator touches.
          </h2>
        </div>
        <ul className="grid gap-3 md:grid-cols-2">
          {SURFACES.map((s) => (
            <li key={s.endpoint}>
              <Panel className="h-full p-5">
                <p className="font-mono text-sm text-accent">{s.endpoint}</p>
                <p className="mt-2 text-sm font-semibold text-bone">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted">
                  {s.body}
                </p>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      {cardRes.reachable && (
        <section aria-label="Agent card" className="space-y-4">
          <div>
            <Label>A2A agent card</Label>
            <h2 className="text-2xl font-semibold text-bone">
              What discovery returns.
            </h2>
          </div>
          <Panel className="overflow-hidden">
            <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
              <code className="font-mono text-bone">
{JSON.stringify(cardRes.data, null, 2)}
              </code>
            </pre>
          </Panel>
        </section>
      )}

      <section aria-label="MCP" className="space-y-3">
        <Label>MCP</Label>
        <h2 className="text-2xl font-semibold text-bone">
          MCP-native agents can also connect.
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          Bondsman publishes a Model Context Protocol endpoint. MCP clients
          discover the quote, submit, action detail, proof and receipt tools
          over the same protocol.
        </p>
        <Panel className="overflow-hidden">
          <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
            <code className="font-mono text-bone">
{`npx @vinaystwt/bondsman-mcp

# Point at the production backend
BONDSMAN_API_BASE=https://bondsman-backend-production.up.railway.app \\
  npx @vinaystwt/bondsman-mcp`}
            </code>
          </pre>
        </Panel>
        <p className="text-xs text-muted">
          The npm package source lives at{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-bone">mcp-package/</code>{' '}
          in the repository.
        </p>
      </section>

      {depRes.reachable ? (
        <section aria-label="Deployments" className="space-y-4">
          <div>
            <Label>Deployments</Label>
            <h2 className="text-2xl font-semibold text-bone">
              Live Casper testnet addresses.
            </h2>
            <p className="mt-1 text-sm text-muted">
              Chain {depRes.data.chainName}. Node RPC {depRes.data.nodeRpcUrl}.
            </p>
          </div>
          <ul className="space-y-2">
            {Object.entries(depRes.data.contracts).map(([name, entry]) => (
              <li
                key={name}
                className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-md border border-rule bg-surface px-4 py-3"
              >
                <span className="serial text-[0.62rem] text-muted">{name}</span>
                <span className="text-sm text-bone">Package hash</span>
                <CopyHash
                  value={entry.packageHash}
                  href={contractExplorer(entry.contractHash)}
                  label={truncateHash(entry.packageHash)}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <BackendDown />
      )}

      <section aria-label="Next" className="rounded-md border border-rule bg-surface p-6">
        <Label>Next</Label>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/proof"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Read the canonical proof
          </Link>
          <Link
            href="/docs"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Full documentation
          </Link>
        </div>
      </section>
    </div>
  );
}
