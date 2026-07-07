import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import DocsLayout from '@/components/docs/DocsLayout';
import DocSection from '@/components/docs/DocSection';
import CodeBlock from '@/components/docs/CodeBlock';
import ContractTable from '@/components/docs/ContractTable';
import Diagram from '@/components/Diagram';
import Roadmap from '@/components/Roadmap';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'How Bondsman works, end to end: the lifecycle, the contracts, the economics, and the roadmap.',
};

export default async function DocsPage() {
  const deploymentsRes = await safeGet(() => api.deployments());

  return (
    <DocsLayout>
      <header className="mb-4">
        <Label>Documentation</Label>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight text-bone">
          Bondsman, end to end
        </h1>
        <p className="mt-3 max-w-prose leading-relaxed text-muted">
          Everything Bondsman does, in plain language, with the real contracts,
          real transactions, and production roadmap. Read top to bottom, or jump
          to a section.
        </p>
      </header>

      <DocSection id="thesis" title="Problem and thesis">
        <p>
          An agent can approve a payout in milliseconds. Today it risks nothing
          when it is wrong. Software is starting to move money on its own, and
          when it makes a confident mistake, the loss lands on someone else.
        </p>
        <p>
          Bondsman is a notary for money. It makes an agent stake real capital
          before it can move funds, and takes that stake when the agent is wrong.
          The rule is <strong>no bond, no action</strong>. Issuance puts assets on
          chain. Bondsman decides what happens when an agent moving those assets
          is wrong.
        </p>
        <p>
          Every slash here is a real transaction you can open on the explorer.
          Accountability that never executes is a simulation.
        </p>
      </DocSection>

      <DocSection id="how-it-works" title="How it works">
        <p>
          Every action is bonded, executed, then open to challenge. On the clean
          path, no challenge holds, the window closes, and the bond returns in
          full. On the slash path, a challenge proves the payout wrong and the
          contract takes the bond.
        </p>
        <Diagram
          name="lifecycle"
          alt="Intent, bond, execute, challenge window, then a refund on the clean path or a slash on the wrong path."
        />
        <h3>The two-agent economy</h3>
        <p>
          One agent approves payouts. A deterministic watchdog service monitors
          them and challenges duplicates on its own. The agent approves, the
          watchdog catches it, the contract settles, and no human is in the loop.
        </p>
        <Diagram
          name="agent-economy"
          alt="The approver agent pays a duplicate. The deterministic watchdog detects it, challenges, and the contract slashes the bond and pays the watchdog."
        />
      </DocSection>

      <DocSection id="contracts" title="Contracts">
        <p>
          Four contracts run Bondsman. The controller owns the lifecycle and calls
          the others. The bond vault holds and releases or slashes the stake. The
          invoice pool approves payouts and detects duplicate claims. The csprUSD
          token settles value and uses a fixture implementation on testnet.
        </p>
        <Diagram
          name="architecture"
          alt="The four contracts and the backend services, with the chain as the source of truth and the app reading a projection."
        />
        {deploymentsRes.reachable ? (
          <ContractTable deployment={deploymentsRes.data} />
        ) : (
          <p>
            The contract addresses load from the running backend. Start it with{' '}
            <code>npm run api</code> to see the live table.
          </p>
        )}
      </DocSection>

      <DocSection id="lifecycle" title="Lifecycle and transactions">
        <p>
          Each step of an action produces a real transaction on Casper testnet.
          The action detail screen links every one to the explorer.
        </p>
        <ul>
          <li>Initiate: the agent commits the decision and the reasoning hash.</li>
          <li>Approve: the invoice pool approves the payout.</li>
          <li>Post bond: the bond vault locks the stake.</li>
          <li>Execute: the payout clears to the vendor.</li>
          <li>Challenge: a challenger flags the action inside its window.</li>
          <li>Resolve: the contract releases the bond, or slashes it.</li>
        </ul>
        <p>
          When a bond is slashed, it splits in half: one half to the challenger,
          one half to the reserve.
        </p>
        <Diagram
          name="slash-split"
          alt="A slashed bond splits in half: one half to the challenger, one half to the reserve."
          className="max-w-xl"
        />
        <p>
          The proof is a deterministic on-chain collision. Two invoices that share
          one claim hash are the same claim, and paying both is a duplicate the
          contract can prove with no oracle and no human.
        </p>
        <Diagram
          name="duplicate-proof"
          alt="Two invoices share one claim hash. The contract detects the collision and slashes, with no human in the path."
        />
      </DocSection>

      <DocSection id="faq" title="Economics and security">
        <Faq q="Why not just check for duplicates before paying?">
          <p>
            Optimistic verification puts the cost only on disputed actions, not
            every payout, and the challenger is paid from the slash, so
            verification is self funding. The duplicate is one member of a fault
            class whose proof arrives after payout: delivery that never happened,
            fraud surfaced by later attestations, claims resubmitted under
            different identifiers that only collide after normalization. It is the
            demo member because it is provable on chain with zero oracle trust.
            And even a perfect agent needs bonding, because depositors cannot
            verify perfection in advance. Delegating capital requires collateral,
            which is true of humans too.
          </p>
        </Faq>
        <Faq q="Does the agent see everything?">
          <p>
            The agent sees what a real payout agent sees, per invoice, because the
            paid-claims registry is the pool&apos;s private state and duplicates
            arrive across time and venues. Bondsman exists because what the agent
            sees is not everything.
          </p>
        </Faq>
        <Faq q="Can an agent farm reputation then defect?">
          <p>
            No. The bond floor is set by the amount tier. Reputation can only add a
            premium above it, never a discount below it, so a large action requires
            the tier bond regardless of history.
          </p>
        </Faq>
        <Faq q="What about Sybil resets?">
          <p>
            A fresh identity gets no discount, so a slash costs the full bond and
            reputation is upside only. Starting over buys nothing.
          </p>
        </Faq>
        <Faq q="Can a challenger grief?">
          <p>
            No. Slashing requires a deterministic on-chain collision proof, so a
            false challenge wins nothing and costs gas.
          </p>
        </Faq>
        <Faq q="Is the one-click challenge custodial?">
          <p>
            It is backend signed for demo convenience. The wallet path exists and
            anyone can construct the challenge deploy directly and sign it
            themselves.
          </p>
          <CodeBlock
            label="casper-client"
            code={`casper-client put-deploy \\
  --node-address https://node.testnet.casper.network/rpc \\
  --chain-name casper-test \\
  --secret-key ./my_key.pem \\
  --session-hash <controller-contract-hash> \\
  --session-entry-point challenge \\
  --payment-amount 3000000000 \\
  --session-arg "action_id:u64='<actionId>'"`}
          />
        </Faq>
        <Faq q="Why 30 minutes?">
          <p>
            Challenge windows are pool policy per risk class. 30 minutes is a demo
            constant, not a fixed rule.
          </p>
        </Faq>
        <Faq q="Is x402 settlement live?">
          <p>
            The Casper x402 facilitator supports testnet, but the demo mock token
            lacks the settlement entry point the facilitator requires, so
            verification as a service payment runs as a labeled sandbox here. Real
            csprUSD implements what a facilitator needs. Production x402
            settlement is on the roadmap.
          </p>
        </Faq>
      </DocSection>

      <DocSection id="roadmap" title="Roadmap">
        <p>
          Built for operators of on-chain invoice financing and factoring pools,
          then real-world asset payout pools more broadly.
        </p>
        <div className="mt-6 max-w-2xl">
          <Roadmap />
        </div>
        <p className="mt-8">
          Want to see it run? <Link href="/demo">Try the demo</Link> and slash a
          real bond, or watch the approver and watchdog settle one without you.
        </p>
      </DocSection>
    </DocsLayout>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-rule py-5 first:border-t-0 first:pt-0">
      <h3 className="text-base font-semibold text-bone">{q}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </div>
  );
}
