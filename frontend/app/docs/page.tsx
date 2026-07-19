import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import DocsLayout from '@/components/docs/DocsLayout';
import DocSection from '@/components/docs/DocSection';
import CodeBlock from '@/components/docs/CodeBlock';
import ContractTable from '@/components/docs/ContractTable';
import Diagram from '@/components/Diagram';
import { Label } from '@/components/ui/Primitives';

export const metadata: Metadata = {
  title: 'Documentation',
  description:
    'How Bondsman works, end to end: the lifecycle, the contracts, the surfaces, and the economics.',
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
          real transactions, and every surface a user, operator, or builder
          touches. Read top to bottom, or jump to a section.
        </p>
      </header>

      <DocSection id="quickstart" title="Read the proof in three minutes">
        <p>
          The fastest path for a judge or reviewer. No local setup, no wallet
          required.
        </p>
        <ol className="list-decimal space-y-2 pl-5">
          <li>
            Open the <Link href="/proof">Proof Center</Link>. It leads with the
            canonical action, No. 0027: a real x402 settlement, a paid quote, a
            bonded action, a signed delivery contradiction, an autonomous
            watchdog challenge and a slashed bond.
          </li>
          <li>
            Follow every transaction to{' '}
            <code>testnet.cspr.live</code> from the chronological rail. The
            numbers on chain match the numbers on the page.
          </li>
          <li>
            Copy or download the portable receipt. Reverify the signature at
            <code className="mx-1 rounded bg-surface px-1 py-0.5 text-bone">
              /api/receipt/27/verify
            </code>
            or in any Ed25519 verifier.
          </li>
          <li>
            Open <Link href="/two-agents">Two agents</Link> to watch the same
            approver and watchdog loop against the deterministic duplicate-claim
            test vector.
          </li>
          <li>
            Read <Link href="/build">Integrate</Link> for the A2A discovery,
            x402 payment, paid quote and bonded submit flow. MCP is also
            available:
          </li>
        </ol>
        <CodeBlock
          label="npm"
          code={`npm install -g @vinaystwt/bondsman-mcp
bondsman-mcp`}
        />
      </DocSection>

      <DocSection id="thesis" title="Problem and thesis">
        <p>
          Autonomous financial agents already move money on their own. When one
          is wrong, the loss lands on someone downstream. An HTTP 200 is not
          accountability.
        </p>
        <p>
          Bondsman is bonded execution infrastructure for autonomous finance. It
          makes an agent post a risk-priced slashable bond before any
          consequential action. Verified faults slash the bond, reward the
          watchdog, credit the protection reserve and reduce agent reputation.
          The rule is <strong>no bond, no action</strong>.
        </p>
        <p>
          Every slash here is a real Casper testnet transaction. Delivery
          contradiction is the flagship delayed-evidence fault class. Duplicate
          claim is the deterministic test vector.
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
        <Faq q="Why bond every action instead of verifying up front?">
          <p>
            Optimistic verification puts the cost only on disputed actions, not
            every payout, and the challenger is paid from the slash, so
            verification is self funding. The largest fault class is the one
            whose proof arrives after payout: delivery that never happened,
            fraud surfaced by later attestations, claims resubmitted under
            different identifiers that only collide after normalization. Even
            a perfect agent needs bonding, because depositors cannot verify
            perfection in advance. Delegating capital requires collateral,
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
            Yes. The quote endpoint uses real x402 settlement with WCSPR on
            Casper testnet through the CSPR.cloud facilitator. The canonical
            proof shows the actual settlement transaction, the paid quote hash,
            the consuming action and the resolved slash. Every paid action
            submission now requires an Ed25519 authorization from the same
            Casper account that paid for the quote.
          </p>
        </Faq>
      </DocSection>

      <DocSection id="surfaces" title="Product surfaces">
        <p>
          A user in the product can act, understand what they act on, and come
          back to their own record. Every surface points to on-chain evidence.
        </p>
        <h3>Arena</h3>
        <p>
          The <Link href="/app/arena">Arena</Link> shows a single case card: a
          bonded payout in its challenge window. Two paths coexist. The primary
          path signs the challenge with a Casper Wallet, and the reward goes to
          the connected account. The fallback path is signed by a backend key
          for judges without a funded wallet, and it says so.
        </p>
        <h3>Docket</h3>
        <p>
          The <Link href="/app/actions">Docket</Link> lists every bonded action.
          Filter by status: challengeable, challenged, slashed, refunded. Each
          row opens a full detail page with the lifecycle, the invoice, the
          agent&apos;s reasoning, the reasoning hash you can locally verify,
          the slash split, and every on-chain transaction.
        </p>
        <h3>My Ledger</h3>
        <p>
          The <Link href="/app/ledger">Ledger</Link> is the connected wallet&apos;s
          record: challenges signed, rewards earned, a derived hunter score.
          Derived client-side from the actions list filtered by challenger. Not
          on-chain reputation; the contract tracks agents.
        </p>
        <h3>Agents</h3>
        <p>
          <Link href="/app/agents">Agents</Link> lists every on-chain account
          that has acted. Two are core: the approver (model-driven, posts bonds)
          and the watchdog (deterministic, catches duplicates). Each profile
          shows clean, slashed, and score from the contract&apos;s reputation.
        </p>
        <h3>Two-agent economy</h3>
        <p>
          <Link href="/two-agents">Two agents</Link> is the standalone showcase:
          the approver approves, the watchdog catches, the contract settles.
          Both are real Casper accounts. One button triggers a live end-to-end
          run.
        </p>
        <h3>Invoice pool</h3>
        <p>
          <Link href="/rwa">Invoice pool</Link> presents the real-world use case:
          an invoice-financing pool at risk of paying the same claim twice. The
          claim hash is the fingerprint the contract uses to prove a duplicate.
        </p>
        <h3>Integrate</h3>
        <p>
          <Link href="/build">Integrate</Link> shows how any autonomous agent
          discovers Bondsman through the A2A agent card, pays for a quote via
          x402, submits a bonded action with a payer-signed authorization and
          verifies the portable receipt. MCP is also available for MCP-native
          agents.
        </p>
        <p className="mt-8">
          Want the settled evidence? <Link href="/proof">Open the canonical
          proof</Link> for Action No. 0027.
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
