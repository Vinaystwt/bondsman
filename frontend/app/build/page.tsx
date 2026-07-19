import type { Metadata } from 'next';
import { api, safeGet } from '@/lib/api';
import { Label, Panel } from '@/components/ui/Primitives';
import { BackendDown } from '@/components/ui/States';
import CopyHash from '@/components/ui/CopyHash';
import { contractExplorer, truncateHash } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Build with Bondsman',
  description: 'Adoptable bonded accountability infrastructure for Casper builders.',
};

const TOOLS: { name: string; summary: string; input: string; output: string }[] = [
  {
    name: 'list_actions',
    summary: 'List every bonded action across the controller, most recent first.',
    input: '{}',
    output: 'Array of action summaries with status, bond, window, challenger.',
  },
  {
    name: 'get_action',
    summary: 'Full detail for one action: reasoning, events, transactions, explorer links.',
    input: '{ actionId: number }',
    output: 'ActionDetail with reasoning, reasoningHash, events, transactions.',
  },
  {
    name: 'get_reputation',
    summary: 'On-chain reputation for an agent address: clean, slashed, score.',
    input: '{ agentAddress: string }',
    output: 'AgentReputation with score and action history.',
  },
  {
    name: 'get_bond_requirement',
    summary: 'Compute the bond required for a proposed action given its amount and the agent.',
    input: '{ amount: string, agentAddress: string }',
    output: '{ amount, agentAddress, bondRequired }',
  },
  {
    name: 'get_deployments',
    summary: 'Network, chain name, contract package hashes, and known account roles.',
    input: '{}',
    output: 'Deployment payload with contracts and accounts.',
  },
  {
    name: 'challenge_action',
    summary: 'Submit a challenge against an action. Returns the challenge and resolve transactions.',
    input: '{ actionId: number }',
    output: '{ challenge: string, resolve: string }',
  },
];

export default async function BuildPage() {
  const depRes = await safeGet(() => api.deployments());

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>Build</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Adopt bonded accountability
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Bondsman publishes a Model Context Protocol server on npm. Casper
          agents and MCP clients can call these six tools to check reputation,
          quote a bond, submit a challenge, and settle on chain.
        </p>
      </header>

      <section aria-label="Install the MCP server" className="space-y-4">
        <Label>Install</Label>
        <h2 className="text-2xl font-semibold text-bone">
          <a
            href="https://www.npmjs.com/package/@vinaystwt/bondsman-mcp"
            target="_blank"
            rel="noreferrer"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            @vinaystwt/bondsman-mcp
          </a>
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          Published and installable now. Point it at any running Bondsman
          backend and any MCP client gets the six tools over stdio.
        </p>
        <Panel className="overflow-hidden">
          <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
            <code className="font-mono text-bone">
{`# Install globally
npm install -g @vinaystwt/bondsman-mcp
bondsman-mcp

# Or run without installing
npx @vinaystwt/bondsman-mcp`}
            </code>
          </pre>
        </Panel>
        <p className="text-xs text-muted">
          Requires a running Bondsman backend. Point it at one with
          <code className="mx-1 rounded bg-surface px-1 py-0.5 text-bone">BONDSMAN_API_BASE</code>.
          Defaults to <code className="rounded bg-surface px-1 py-0.5 text-bone">http://127.0.0.1:3001</code>.
        </p>
      </section>

      <section aria-label="MCP tools" className="space-y-6">
        <div className="space-y-2">
          <Label>Six MCP tools</Label>
          <h2 className="text-2xl font-semibold text-bone">
            Every core operation reachable from an MCP client
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            The backend runs a Model Context Protocol server. Agents connect,
            call these tools, and act on the results. MCP is the interface.
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2">
          {TOOLS.map((t) => (
            <li key={t.name}>
              <Panel className="h-full p-5">
                <p className="font-mono text-sm text-accent">{t.name}</p>
                <p className="mt-2 text-sm leading-relaxed text-bone">{t.summary}</p>
                <dl className="mt-4 space-y-2 border-t border-rule pt-3 text-xs">
                  <div>
                    <dt className="serial text-[0.58rem] text-muted">Input</dt>
                    <dd className="mt-1 font-mono text-muted">{t.input}</dd>
                  </div>
                  <div>
                    <dt className="serial text-[0.58rem] text-muted">Output</dt>
                    <dd className="mt-1 leading-snug text-muted">{t.output}</dd>
                  </div>
                </dl>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Example integration" className="space-y-4">
        <Label>Example</Label>
        <h2 className="text-2xl font-semibold text-bone">
          An external watchdog, in six lines
        </h2>
        <p className="text-sm leading-relaxed text-muted">
          An external agent that catches duplicates and earns the slash reward.
          The MCP client calls the local server, then the server submits the
          challenge through the backend key.
        </p>
        <Panel className="overflow-hidden">
          <pre className="overflow-x-auto p-5 text-xs leading-relaxed">
            <code className="font-mono text-bone">
{`const actions = await mcp.call('list_actions', {});
for (const a of actions) {
  if (a.status !== 'Executed') continue;
  const duplicate = await isDuplicate(a.claimHash);
  if (!duplicate) continue;
  await mcp.call('challenge_action', { actionId: a.actionId });
}`}
            </code>
          </pre>
        </Panel>
      </section>

      {depRes.reachable ? (
        <section aria-label="Contract addresses" className="space-y-4">
          <Label>Deployments</Label>
          <h2 className="text-2xl font-semibold text-bone">
            Live testnet addresses
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Chain: {depRes.data.chainName}. Node RPC: {depRes.data.nodeRpcUrl}.
          </p>
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

      <section aria-label="Current deployment scope" className="space-y-3 border-t border-rule pt-8">
        <Label>Current deployment scope</Label>
        <ul className="space-y-2 text-sm leading-relaxed text-muted">
          <li>
            MCP is the interface. There is no SDK by design. MCP clients include
            Claude, Cursor, and any Anthropic-compatible agent runtime.
          </li>
          <li>
            x402 quote metering uses real WCSPR settlement through the
            CSPR.cloud facilitator when the integrator account has WCSPR. The
            sandbox verifier remains available only as a reference path.
          </li>
          <li>
            Reputation is tracked for agents (the actor who posts a bond), not
            for challengers. Client apps can derive challenger activity from
            list_actions, as this app does on the Ledger page.
          </li>
          <li>
            The npm package is published at{' '}
            <a
              href="https://www.npmjs.com/package/@vinaystwt/bondsman-mcp"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
            >
              npmjs.com/package/@vinaystwt/bondsman-mcp
            </a>
            . Its source lives in
            <code className="ml-1 rounded bg-surface px-1 py-0.5 text-bone">mcp-package/</code>
            in this repository.
          </li>
        </ul>
      </section>
    </div>
  );
}
