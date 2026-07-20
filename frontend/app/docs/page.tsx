import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import DocsLayout from '@/components/docs/DocsLayout';
import DocSection from '@/components/docs/DocSection';
import CodeBlock from '@/components/docs/CodeBlock';
import ContractTable from '@/components/docs/ContractTable';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'How Bondsman works. Verify the proof, create a bonded action, integrate the paid HTTP surface, use MCP and A2A, read the Casper impact and the ninety day launch plan.',
};

export const revalidate = 60;

export default async function DocsPage() {
  const deploymentsRes = await safeGet(() => api.deployments());

  return (
    <DocsLayout>
      <header className="mb-6">
        <Label>Documentation</Label>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-bone">
          Bondsman, end to end
        </h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted">
          Everything Bondsman ships today, in plain language. Read top to bottom or jump to a section.
        </p>
      </header>

      <DocSection id="understand" title="Understand Bondsman">
        <p>
          Bondsman is a bonded execution gateway for autonomous finance. It requires economic collateral before an autonomous financial action, then settles objective failure on Casper. The rule is simple: no bond, no action.
        </p>
        <p>
          x402 pays for the action. Bondsman makes the acting agent economically accountable for it. The AI interprets the risk. The deterministic policy prices the minimum bond. The autonomous watchdog challenges objective faults. The Casper contracts hold the collateral and settle the outcome. A signed portable receipt closes every action.
        </p>
        <p>
          Delivery contradiction is the flagship delayed evidence fault class. Duplicate invoice is an advanced deterministic test vector. Treasury, DEX and paid service delivery are adapter blueprints, not deployed customer flows.
        </p>
      </DocSection>

      <DocSection id="verify" title="Verify the proof">
        <p>
          The fastest path for a judge. No local setup, no wallet required. Every hash opens on the Casper testnet explorer.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Open the <Link href="/proof">Proof Console</Link>. Run the live x402 probe. Expect HTTP 402 with the real WCSPR payment requirement.
          </li>
          <li>
            Read the canonical Action 27 replay. Every stage links its Casper transaction and carries an honest evidence label.
          </li>
          <li>
            Test the paid quote single use. The backend confirms the quote is consumed and will not accept another submission.
          </li>
          <li>
            Verify the portable receipt against POST <code>/api/receipt/27/verify</code>. Then break it. Any single field change fails signature verification.
          </li>
        </ol>
      </DocSection>

      <DocSection id="create" title="Create a bonded action">
        <p>
          Open <Link href="/app/new">Create bonded action</Link>. Choose a policy template. Describe your action. Review the deterministic bond and connect Casper Wallet only when you execute.
        </p>
        <p>
          The analysis returns four layers: the live AI interpretation, the deterministic policy that prices the minimum bond, the verifier and evidence rules, and a signed integration manifest with scenario, model and policy hashes.
        </p>
        <p>
          The browser flow can test payment terms without a wallet. Wallet connection begins only when you request live settlement and submit a real action.
        </p>
      </DocSection>

      <DocSection id="integrate" title="Integrate the API">
        <p>
          The full integration story lives on the <Link href="/build">Build</Link> page. In summary:
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Read <code>/api/assurance/templates</code> to pick a policy template.</li>
          <li>POST <code>/api/assurance/analyze</code> for the policy manifest.</li>
          <li>POST <code>/v1/actions/quote</code> unpaid to receive an x402 v2 payment requirement.</li>
          <li>Settle the WCSPR payment through the CSPR.cloud facilitator.</li>
          <li>Retry with the <code>PAYMENT-SIGNATURE</code> header and receive the paid quote hash.</li>
          <li>POST <code>/v1/actions/submit</code> with the paid quote and a Casper payer signed submit authorization.</li>
          <li>Poll <code>/api/actions/:id</code> and fetch the canonical proof.</li>
          <li>Fetch and verify the portable receipt at <code>/api/receipt/:id</code>.</li>
        </ol>
        <p>
          The submit endpoint requires an Ed25519 signature from the same Casper account that paid for the quote. This binds the paid quote to the payer and blocks replay.
        </p>
      </DocSection>

      <DocSection id="mcp" title="Use MCP">
        <p>
          The published MCP package{' '}
          <code>@vinaystwt/bondsman-mcp@0.3.0</code>{' '}
          exposes read, design, verification and paid HTTP tools for MCP native agents.
        </p>
        <CodeBlock
          label="npm"
          code={`npx @vinaystwt/bondsman-mcp

BONDSMAN_API_BASE=https://bondsman-backend-production.up.railway.app \\
  npx @vinaystwt/bondsman-mcp`}
        />
        <p>
          Read only tools cover actions, verifiers, deployments, capabilities, canonical replay and single use quote check. Design only tools cover policy analysis. Verification covers portable receipt verification. Paid HTTP tools carry quote and submit; they need a real funded WCSPR payer.
        </p>
      </DocSection>

      <DocSection id="a2a" title="Use A2A">
        <p>
          Bondsman ships an A2A agent card at{' '}
          <code>/.well-known/agent.json</code> that advertises the Bondsman skills and the x402 authentication scheme. Each skill carries tags so an integrator can tell design only, read only, verification and paid HTTP apart.
        </p>
      </DocSection>

      <DocSection id="casper" title="Casper impact">
        <p>
          Bondsman is more than one hackathon proof. Its surfaces plug directly into how Casper agents will discover services, price risk and prove outcomes:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Real x402 settlement on casper:casper-test drives WCSPR transaction volume.</li>
          <li>The paid HTTP surface produces agent originated Casper transactions.</li>
          <li>The MCP package and A2A agent card make Bondsman discoverable by other Casper agents.</li>
          <li>The verifier registry and policy manifest are reusable by any team that wants to bond a Casper action.</li>
          <li>Delivery adapters are supported by the current proof path. Treasury, DEX and paid service delivery are labelled adapter blueprints.</li>
        </ul>
      </DocSection>

      <DocSection id="launch" title="Launch plan">
        <p>
          From proof to Casper infrastructure. Measurable milestones. Nothing here is already complete beyond what the current /proof page verifies.
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong className="text-bone">30 day goal.</strong> Testnet design partner pilot. Ship one external adapter through the blueprint flow end to end.
          </li>
          <li>
            <strong className="text-bone">60 day goal.</strong> Independent security review of the controller, bond vault, invoice pool and verifier registry. Publish a public verifier SDK.
          </li>
          <li>
            <strong className="text-bone">90 day goal.</strong> Ship the second external adapter. Publish the mainnet readiness criteria and the operational runbook.
          </li>
        </ul>
      </DocSection>

      <DocSection id="security" title="Threat model and security">
        <p>
          Bondsman separates model interpretation from deterministic pricing, an independent watchdog and Casper contracts that hold the collateral. Authority is bounded:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>The model does not calculate the final bond and cannot slash.</li>
          <li>The policy engine cannot submit a Casper transaction.</li>
          <li>The watchdog cannot make a payment on the payer&apos;s behalf.</li>
          <li>The contracts are the only authority that moves collateral.</li>
        </ul>
        <p>
          The frontend never exposes an operator token or a protected mutation. Public controls call only read, design, verification and paid HTTP surfaces. Every paid submission requires a payer signed authorization bound to the paid quote.
        </p>
      </DocSection>

      {deploymentsRes.reachable && (
        <DocSection id="contracts" title="Casper contract addresses">
          <p>
            Chain {deploymentsRes.data.chainName}. Node RPC {deploymentsRes.data.nodeRpcUrl}.
          </p>
          <ContractTable deployment={deploymentsRes.data} />
        </DocSection>
      )}
    </DocsLayout>
  );
}
