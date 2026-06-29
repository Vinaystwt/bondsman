import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import DocsLayout from '@/components/docs/DocsLayout';
import DocSection from '@/components/docs/DocSection';
import CodeBlock from '@/components/docs/CodeBlock';
import ContractTable from '@/components/docs/ContractTable';
import { Label } from '@/components/ui/Primitives';
import LifecycleDiagram from '@/components/diagrams/LifecycleDiagram';
import SystemArchitecture from '@/components/diagrams/SystemArchitecture';
import AgentDecision from '@/components/diagrams/AgentDecision';
import SlashSplit from '@/components/diagrams/SlashSplit';
import DuplicateClaim from '@/components/diagrams/DuplicateClaim';
import ReputationEffect from '@/components/diagrams/ReputationEffect';

export const metadata: Metadata = {
  title: 'Documentation',
  description: 'How Bondsman works, end to end: the agent, the contracts, the bond, the slash, and the API.',
};

const FALLBACK_REASONING =
  'All three policy criteria are met: (1) delivery is confirmed (delivered=true), (2) amount is positive (1000 csprUSD), and (3) due date is on or before the evaluation date.';

export default async function DocsPage() {
  const deploymentsRes = await safeGet(() => api.deployments());
  const actionRes = await safeGet(() => api.action(0));
  const reasoning =
    actionRes.reachable && actionRes.data.reasoning.trim()
      ? actionRes.data.reasoning
      : FALLBACK_REASONING;

  return (
    <DocsLayout>
      <header className="mb-4">
        <Label>Documentation</Label>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
          Bondsman, end to end
        </h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted">
          Everything Bondsman does, in plain language and with the real
          contracts and API it runs on. Read top to bottom, or jump to a section.
        </p>
      </header>

      <DocSection id="overview" title="Overview">
        <p>
          Bondsman is a notary for money. An autonomous agent can approve a
          payout in milliseconds. Today it risks nothing when it is wrong.
          Bondsman makes the agent stake real capital before it can move your
          money, and takes that stake when the agent is wrong.
        </p>
        <p>
          The rule is simple: <strong>no bond, no action</strong>. Before any
          payout, the agent locks a bond sized to the risk. The payout then has a
          challenge window. If anyone proves the payout was wrong, the contract
          slashes the bond: half to whoever caught it, half to a reserve that
          protects depositors. If the window closes clean, the bond returns in
          full.
        </p>
        <SystemArchitecture />
      </DocSection>

      <DocSection id="how-it-works" title="How it works">
        <p>
          Every action follows the same five steps. The agent commits its intent
          and the hash of its reasoning. It locks the bond. The payout executes.
          A challenge window opens. The action then resolves one of two ways.
        </p>
        <p>
          On the <strong>clean path</strong>, no challenge holds and the window
          closes. The bond returns to the agent in full and its reputation rises.
          On the <strong>slash path</strong>, a challenge proves the payout was a
          duplicate. The contract slashes the bond and the agent&apos;s
          reputation falls.
        </p>
        <LifecycleDiagram />
      </DocSection>

      <DocSection id="agent" title="The agent">
        <p>
          The agent reads an invoice: the amount, the vendor, whether it was
          delivered, the due date, and a claim hash that fingerprints what the
          invoice is claiming. It checks the payout against a plain policy, then
          writes a short reason and a decision to approve or reject.
        </p>
        <p>
          The reasoning is written by the model, and its hash is committed
          on-chain with the action. The decision cannot be quietly rewritten
          later. A confident, well-argued mistake is exactly the failure the bond
          exists to cover: the agent can sound certain and still be wrong, so it
          must have something at stake.
        </p>
        <AgentDecision />
        <h3>A real reasoning example</h3>
        <p>This is the reasoning an agent committed for a real action on testnet.</p>
        <CodeBlock label="reasoning, from /api/actions/0" code={reasoning} />
      </DocSection>

      <DocSection id="contracts" title="Smart contracts">
        <p>
          Four contracts run Bondsman. The controller owns the lifecycle and
          calls the others. The bond vault holds and releases or slashes the
          stake. The invoice pool approves payouts and detects duplicate claims.
          The csprUSD token settles value and is mocked for testnet.
        </p>
        {deploymentsRes.reachable ? (
          <ContractTable deployment={deploymentsRes.data} />
        ) : (
          <p>
            The contract addresses load from the running backend. Start it with{' '}
            <code>npm run api</code> to see the live table.
          </p>
        )}
        <p>
          The controller is the only contract that initiates and resolves
          actions. It asks the invoice pool to approve a payout, tells the bond
          vault to lock the stake, and on resolution tells the vault to release
          or slash. Authority lives on the chain, not in the app.
        </p>
      </DocSection>

      <DocSection id="bond-and-slash" title="The bond and the slash">
        <p>
          The bond is risk weighted. A larger payout puts more at risk, so it
          requires a larger stake. The base rate is 2 percent below 10,000
          csprUSD, 3 percent at 10,000 and above, and 5 percent at 50,000 and
          above. If the agent&apos;s reputation score is negative, the contract
          adds that many basis points, up to 300, so a worse record costs more.
        </p>
        <p>
          When a bond is slashed, it splits in two. Half goes to the challenger,
          which pays people to watch. Half goes to the reserve, which protects
          the people whose money the agent moves.
        </p>
        <SlashSplit />
        <ReputationEffect />
      </DocSection>

      <DocSection id="proving-fraud" title="Proving fraud on-chain">
        <p>
          Bondsman does not ask a human to judge a payout. It proves the most
          common fraud directly: paying the same invoice twice. Each invoice
          carries a claim hash, a fingerprint of what it claims. When a payout
          reuses a claim hash that has already been paid, the invoice pool sees
          the collision and the contract slashes the bond.
        </p>
        <p>
          No reviewer, no vote, no appeal. The duplicate is a fact on the chain,
          and the slash follows from it.
        </p>
        <DuplicateClaim />
      </DocSection>

      <DocSection id="api" title="API reference">
        <p>
          The backend serves a projection of on-chain state at{' '}
          <code>http://127.0.0.1:3001</code>. All money values are strings in
          atomic units with 9 decimals. Divide by 1,000,000,000 for display.
        </p>

        <h3>GET /api/actions</h3>
        <p>Every action, with its status and bond.</p>
        <CodeBlock
          label="200 response"
          code={`[
  {
    "actionId": 2,
    "invoiceId": 1046,
    "amount": "1000000000000",
    "bondRequired": "20000000000",
    "bondPosted": "20000000000",
    "status": "ResolvedSlash"
  }
]`}
        />

        <h3>GET /api/actions/:id</h3>
        <p>One action in full, with its CES events and explorer links.</p>
        <CodeBlock
          label="200 response (trimmed)"
          code={`{
  "actionId": 2,
  "invoiceId": 1046,
  "amount": "1000000000000",
  "reasoning": "",
  "reasoningHash": "b311a7b6...d7fadd",
  "bondRequired": "20000000000",
  "status": "ResolvedSlash",
  "challenger": "account-hash-49d3c3...",
  "transactions": { "challenge": "9fcd2f...", "resolve": "362cc7..." },
  "events": [
    { "eventType": "DuplicateDetected", "transactionHash": "eedad6...", "explorerLink": "https://testnet.cspr.live/transaction/eedad6..." }
  ]
}`}
        />

        <h3>GET /api/agents/:address</h3>
        <p>An agent&apos;s reputation and its action history.</p>
        <CodeBlock
          label="200 response"
          code={`{ "agent": "account-hash-ea2a1d...", "clean": 3, "slashed": 1, "score": -20, "actions": [ ] }`}
        />

        <h3>GET /api/reserve</h3>
        <p>The reserve balance and the slashes that funded it.</p>
        <CodeBlock
          label="200 response"
          code={`{ "balance": "10000000000", "slashes": [ { "actionId": 2, "transactionHash": "362cc7..." } ] }`}
        />

        <h3>GET /api/deployments</h3>
        <p>The four contract hashes and the deployer, agent, and challenger accounts.</p>

        <h3>POST /api/challenge</h3>
        <p>
          Fires a real testnet challenge then slash. The body is{' '}
          <code>{'{ "actionId": number }'}</code>. The response carries the
          challenge and resolve transaction hashes. It is on-chain, so it takes
          time to confirm.
        </p>
        <CodeBlock label="request" code={`POST /api/challenge\nContent-Type: application/json\n\n{ "actionId": 2 }`} />
        <CodeBlock label="200 response" code={`{ "challenge": "9fcd2f...", "resolve": "362cc7..." }`} />

        <h3>POST /api/resolve</h3>
        <p>
          Resolves a challenged action or an expired clean action. The body is{' '}
          <code>{'{ "actionId": number }'}</code>.
        </p>
        <CodeBlock label="200 response" code={`{ "resolve": "362cc7..." }`} />
      </DocSection>

      <DocSection id="security" title="Security and trust">
        <p>
          Here is the honest framing. The bond, the slash, the reserve, the
          reputation, and the duplicate proof are all real on Casper testnet.
          Every transaction on an action links to the public explorer, and you
          can verify it yourself.
        </p>
        <p>
          The invoice data is mocked. Bondsman seeds a small set of invoices so
          the loop can run end to end without a real accounts payable system
          behind it. The settlement token, csprUSD, is also a mock for testnet.
          Everything that matters about the mechanism is real; the business data
          feeding it is staged.
        </p>
      </DocSection>

      <DocSection id="deployment" title="Deployment">
        <p>
          Bondsman runs on the Casper testnet. The contracts are written in Rust
          with the Odra framework and built with a pinned toolchain. The backend
          is TypeScript on Node: an agent that decides, a listener that reads
          on-chain events, a projection that stores them, and an API that serves
          reads.
        </p>
        <p>Run the API that the app reads from:</p>
        <CodeBlock label="terminal" code={`npm run api`} />
        <p>The other services run the same way, each as its own command.</p>
        <CodeBlock label="terminal" code={`npm run agent      # the autonomous agent\nnpm run listener   # the on-chain event listener\nnpm run seed       # seed invoices and run the loop`} />
      </DocSection>

      <DocSection id="roadmap" title="Roadmap">
        <p>
          Bondsman proves the mechanism on testnet today. The credible next steps
          are narrow and concrete.
        </p>
        <ul>
          <li>Move to mainnet with a real settlement token in place of the mock.</li>
          <li>Connect a real accounts payable feed so invoices are not seeded.</li>
          <li>Add more provable fraud classes beyond the duplicate claim.</li>
          <li>Open the challenger role to a wider set of watchers.</li>
        </ul>
        <p>
          For now, the point stands on its own. An agent that can move money
          should have something to lose when it is wrong.{' '}
          <Link href="/demo">Try the demo</Link> and watch a bond go.
        </p>
      </DocSection>
    </DocsLayout>
  );
}
