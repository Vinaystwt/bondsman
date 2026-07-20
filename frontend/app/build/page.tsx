import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import {
  Container,
  Label,
  PanelGrid,
  SectionHeader,
  StatusPill,
} from '@/components/ui/Primitives';
import { BackendDown } from '@/components/ui/States';
import CopyHash from '@/components/ui/CopyHash';
import { contractExplorer, truncateHash } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Build',
  description:
    'Adopt bonded accountability from any autonomous agent. Assurance manifest, x402 paid quote, payer signed submit, canonical proof and portable receipt on Casper.',
};

export const revalidate = 60;

interface FlowStep {
  step: number;
  label: string;
  body: string;
  endpoint?: string;
  tone?: 'design' | 'read' | 'paid' | 'verification';
}

const FLOW: FlowStep[] = [
  {
    step: 1,
    label: 'Choose an assurance template',
    body: 'Read the templates once. Invoice or procurement delivery and duplicate invoice are executable today. Treasury, DEX and paid service delivery are integration blueprints.',
    endpoint: 'GET /api/assurance/templates',
    tone: 'read',
  },
  {
    step: 2,
    label: 'Design an assurance policy',
    body: 'Send a scenario. Bondsman returns the AI interpretation, deterministic bond policy and a signed integration manifest. No transaction is created.',
    endpoint: 'POST /api/assurance/analyze',
    tone: 'design',
  },
  {
    step: 3,
    label: 'Request a paid quote',
    body: 'Ask for a quote for the bonded action. The gate returns 402 Payment Required with an x402 v2 payment requirement.',
    endpoint: 'POST /v1/actions/quote',
    tone: 'paid',
  },
  {
    step: 4,
    label: 'Settle the x402 WCSPR payment',
    body: 'Sign an exact scheme WCSPR payment on casper:casper-test through the CSPR.cloud facilitator, then attach the payment on the retry.',
    tone: 'paid',
  },
  {
    step: 5,
    label: 'Submit with payer authorization',
    body: 'POST the paid quote hash with a Casper submit authorization signed by the same account that paid for the quote. Bondsman locks the bond, executes and opens the challenge window.',
    endpoint: 'POST /v1/actions/submit',
    tone: 'paid',
  },
  {
    step: 6,
    label: 'Monitor the action',
    body: 'Poll the action detail. If contradictory evidence verifies inside the challenge window, the watchdog challenges and the contract slashes. Otherwise the bond refunds when the window closes.',
    endpoint: 'GET /api/actions/:id',
    tone: 'read',
  },
  {
    step: 7,
    label: 'Retrieve the canonical proof',
    body: 'Read the settled action as a canonical proof schema with every transaction, participant and economic effect.',
    endpoint: 'GET /api/replay/canonical',
    tone: 'read',
  },
  {
    step: 8,
    label: 'Verify the portable receipt',
    body: 'Fetch the signed portable receipt. Reverify the signature at any time. Store or forward it as the outcome proof.',
    endpoint: 'GET /api/receipt/:id · POST /api/receipt/:id/verify',
    tone: 'verification',
  },
];

const QUOTE_EXAMPLE = `POST /v1/actions/quote
Content-Type: application/json

{
  "amount": "50000000000000",
  "faultClass": "delivery_contradiction"
}`;

const QUOTE_402 = `HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "success": false,
  "code": "X402_PAYMENT_REQUIRED",
  "message": "WCSPR payment is required for this quote",
  "payment": {
    "x402Version": 2,
    "accepts": [
      {
        "scheme": "exact",
        "network": "casper:casper-test",
        "payTo": "002cfb8f00d21230301310fc0d7633350ad7326d80b7f61561f77529dff71e918f",
        "amount": "100000000",
        "asset": "3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e",
        "extra": {
          "name": "Wrapped CSPR",
          "symbol": "WCSPR",
          "version": "1",
          "decimals": "9"
        },
        "maxTimeoutSeconds": 900
      }
    ]
  }
}`;

const QUOTE_RETRY = `POST /v1/actions/quote
Content-Type: application/json
PAYMENT-SIGNATURE: <base64 x402 v2 signed payment payload>

{
  "amount": "50000000000000",
  "faultClass": "delivery_contradiction"
}`;

const SUBMIT_EXAMPLE = `POST /v1/actions/submit
Content-Type: application/json

{
  "quoteHash": "0x8c3401bd019bfca6ff9e9ce0497ddf495bb19719e27d935c7a724bb4d5deca5f",
  "faultClass": "delivery_contradiction",
  "buyerPublicKey": "y55zB1XTRZgfZsXTF3gPQZK552hcwsH+TTqhfEEwdS0=",
  "eventType": "goods_not_received",
  "submitAuthorization": {
    "publicKey": "01<casper ed25519 public key of the x402 payer>",
    "signature": "<base64 ed25519 signature>",
    "timestamp": 1784457630418,
    "nonce": "<single use random nonce>"
  }
}`;

interface McpTool {
  name: string;
  body: string;
  tone: 'READ ONLY' | 'DESIGN ONLY' | 'VERIFICATION' | 'PAID HTTP';
}

const MCP_TOOLS: McpTool[] = [
  { name: 'list_actions', body: 'Read every bonded action from the live projection.', tone: 'READ ONLY' },
  { name: 'get_action', body: 'Read the full action detail: reasoning, events and transactions.', tone: 'READ ONLY' },
  { name: 'get_reputation', body: 'Read on chain agent reputation.', tone: 'READ ONLY' },
  { name: 'get_deployments', body: 'Read network, chain and contract package hashes.', tone: 'READ ONLY' },
  { name: 'get_verifiers', body: 'Read the deployed fault classes and their verifier status.', tone: 'READ ONLY' },
  { name: 'replay_canonical_proof', body: 'Read the canonical Action 27 replay with every hash and evidence label.', tone: 'READ ONLY' },
  { name: 'check_canonical_quote', body: 'Read only quote consumption check for canonical single use protection.', tone: 'READ ONLY' },
  { name: 'public_capabilities', body: 'Read the current public capability roster and mode flags.', tone: 'READ ONLY' },
  { name: 'get_assurance_templates', body: 'Read every assurance template with executable and blueprint status.', tone: 'READ ONLY' },
  { name: 'design_assurance_policy', body: 'Send a scenario and receive an assurance policy manifest. No transaction created.', tone: 'DESIGN ONLY' },
  { name: 'verify_receipt', body: 'Reverify a Bondsman portable receipt against the public verifier.', tone: 'VERIFICATION' },
  { name: 'quote_bonded_action', body: 'Ask for a paid quote. Real x402 settlement is required through an HTTP client with a funded WCSPR payer.', tone: 'PAID HTTP' },
  { name: 'submit_bonded_action', body: 'Submit a bonded action with a settled paid quote and a Casper submit authorization. Requires a funded payer.', tone: 'PAID HTTP' },
];

export default async function BuildPage() {
  const [depRes, cardRes] = await Promise.all([
    safeGet(() => api.deployments()),
    safeGet(() => api.agentCard()),
  ]);

  return (
    <Container className="space-y-16 py-14 lg:py-20">
      <SectionHeader
        eyebrow="Build"
        title="Adopt bonded accountability from any autonomous agent"
        lede="Bondsman ships as an assurance surface, an x402 paid HTTP endpoint, an A2A agent card and an MCP server. Design first, pay for a quote, submit under payer authorization, then verify the portable receipt."
      />

      <section aria-label="End to end integration flow">
        <Label>End to end integration</Label>
        <h2 className="mt-2 text-2xl font-semibold text-bone">
          Eight steps from a scenario to a signed portable receipt
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-2">
          {FLOW.map((s) => (
            <li key={s.step}>
              <div className="flex h-full flex-col rounded-md border border-rule bg-surface p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="serial text-[0.62rem] text-muted">
                    Step {String(s.step).padStart(2, '0')}
                  </span>
                  {s.tone && <StatusPill tone={toneOf(s.tone)}>{toneLabel(s.tone)}</StatusPill>}
                </div>
                <h3 className="mt-3 text-base font-semibold text-bone">{s.label}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.body}</p>
                {s.endpoint && (
                  <p className="mt-4 rounded border border-rule bg-ink px-3 py-1.5 font-mono text-xs text-accent">
                    {s.endpoint}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-label="Quote and pay" className="space-y-4">
        <Label>Example · Quote and pay</Label>
        <h2 className="text-2xl font-semibold text-bone">
          Ask for a quote and receive a 402
        </h2>
        <PanelGrid cols={2} gap="lg">
          <CodeBox title="Unpaid request" body={QUOTE_EXAMPLE} />
          <CodeBox title="402 response" body={QUOTE_402} />
        </PanelGrid>
        <p className="text-xs leading-relaxed text-muted">
          The <code className="rounded bg-surface px-1 py-0.5 text-bone">asset</code>{' '}
          value is the WCSPR package hash, not the token symbol. Settle the x402 payment through the CSPR.cloud facilitator.
        </p>
        <CodeBox title="Paid retry" body={QUOTE_RETRY} />
        <p className="text-xs leading-relaxed text-muted">
          The paid retry carries the x402 signed payment payload in the{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-bone">PAYMENT-SIGNATURE</code> header. On success the response returns the single use paid quote hash bound to the payer, fault class, verifier and challenge window.
        </p>
      </section>

      <section aria-label="Submit a bonded action" className="space-y-4">
        <Label>Example · Submit a bonded action</Label>
        <h2 className="text-2xl font-semibold text-bone">
          Bind the paid quote to a Casper submit authorization
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          Bondsman requires the paid submission to carry a submit authorization signed by the same Casper account that paid for the quote. The signature covers the quote hash, fault class, buyer public key, event type, timestamp and single use nonce. This binds the paid quote to the payer and blocks replay by any other account.
        </p>
        <p className="max-w-prose text-xs leading-relaxed text-muted">
          Canonical Action 27 predates the newer payer signed submit authorization requirement.
        </p>
        <CodeBox title="Submit body" body={SUBMIT_EXAMPLE} />
      </section>

      <section aria-label="MCP tools" id="mcp" className="space-y-4">
        <Label>MCP tools</Label>
        <h2 className="text-2xl font-semibold text-bone">
          MCP native agents can read and design against Bondsman
        </h2>
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          The published package{' '}
          <code className="rounded bg-surface px-1 py-0.5 text-bone">@vinaystwt/bondsman-mcp@0.3.0</code>{' '}
          exposes read, design, verification and paid HTTP tools. The paid HTTP tools require a real funded WCSPR payer; they do not silently sponsor quote settlement.
        </p>
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {MCP_TOOLS.map((t) => (
            <li key={t.name} className="rounded-md border border-rule bg-surface p-5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-mono text-sm text-accent">{t.name}</p>
                <StatusPill tone={mcpTone(t.tone)}>{t.tone}</StatusPill>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{t.body}</p>
            </li>
          ))}
        </ul>
        <CodeBox
          title="Run the MCP server"
          body={`npx @vinaystwt/bondsman-mcp

# Point at the production backend
BONDSMAN_API_BASE=https://bondsman-backend-production.up.railway.app \\
  npx @vinaystwt/bondsman-mcp`}
        />
      </section>

      {cardRes.reachable && (
        <section aria-label="A2A agent card" id="a2a" className="space-y-4">
          <Label>A2A agent card</Label>
          <h2 className="text-2xl font-semibold text-bone">
            What discovery returns for an A2A aware agent
          </h2>
          <p className="max-w-prose text-sm leading-relaxed text-muted">
            The well known agent card at{' '}
            <code className="rounded bg-surface px-1 py-0.5 text-bone">/.well-known/agent.json</code>{' '}
            advertises the Bondsman skills and the x402 authentication scheme. Every skill is tagged so an integrator can tell design only, read only, verification and paid HTTP apart.
          </p>
          <CodeBox
            title="/.well-known/agent.json"
            body={JSON.stringify(cardRes.data, null, 2)}
          />
        </section>
      )}

      {depRes.reachable ? (
        <section aria-label="Casper testnet deployments" className="space-y-4">
          <Label>Casper testnet deployments</Label>
          <h2 className="text-2xl font-semibold text-bone">
            Live Casper testnet addresses
          </h2>
          <p className="text-sm text-muted">
            Chain {depRes.data.chainName}. Node RPC {depRes.data.nodeRpcUrl}.
          </p>
          <ul className="space-y-2">
            {Object.entries(depRes.data.contracts).map(([name, entry]) => (
              <li
                key={name}
                className="grid grid-cols-[10rem_1fr_auto] items-center gap-4 rounded-md border border-rule bg-surface px-4 py-3"
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
            href="/assurance"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Design an assurance policy
          </Link>
          <Link
            href="/docs"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Full documentation
          </Link>
        </div>
      </section>
    </Container>
  );
}

function CodeBox({ title, body }: { title: string; body: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-rule bg-surface">
      <div className="border-b border-rule px-5 py-2 text-xs text-muted">
        {title}
      </div>
      <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
        <code className="font-mono text-bone">{body}</code>
      </pre>
    </div>
  );
}

function toneOf(t: FlowStep['tone']) {
  if (t === 'paid') return 'ok' as const;
  if (t === 'design') return 'info' as const;
  if (t === 'verification') return 'info' as const;
  return 'neutral' as const;
}

function toneLabel(t: FlowStep['tone']): string {
  if (t === 'paid') return 'PAID HTTP';
  if (t === 'design') return 'DESIGN ONLY';
  if (t === 'verification') return 'VERIFICATION';
  return 'READ ONLY';
}

function mcpTone(t: McpTool['tone']) {
  if (t === 'PAID HTTP') return 'ok' as const;
  if (t === 'DESIGN ONLY') return 'info' as const;
  if (t === 'VERIFICATION') return 'info' as const;
  return 'neutral' as const;
}
