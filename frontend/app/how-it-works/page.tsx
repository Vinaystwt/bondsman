import type { Metadata } from 'next';
import Link from 'next/link';
import Appear from '@/components/ui/Appear';
import { Label } from '@/components/ui/Primitives';
import Term from '@/components/ui/Term';
import LifecycleDiagram from '@/components/diagrams/LifecycleDiagram';
import AgentDecision from '@/components/diagrams/AgentDecision';
import SlashSplit from '@/components/diagrams/SlashSplit';
import DuplicateClaim from '@/components/diagrams/DuplicateClaim';
import ReputationEffect from '@/components/diagrams/ReputationEffect';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'The deep mechanic: the risk-weighted bond, the contract-proven slash, and the reputation effect, in plain language.',
};

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Appear className="text-center">
        <Label>How it works</Label>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          The mechanism, in full
        </h1>
        <p className="mx-auto mt-4 max-w-prose leading-relaxed text-muted">
          Bondsman is one rule made concrete: an agent must stake capital before
          it can move money, and loses the stake when it is wrong. Here is exactly
          how that plays out.
        </p>
      </Appear>

      {/* Lifecycle */}
      <Section
        label="The lifecycle"
        title="One path, two endings"
        body={
          <>
            <p>
              An action begins when the agent commits its decision and the hash
              of its reasoning. It then locks a <Term name="bond">bond</Term>,
              executes the payout, and enters a{' '}
              <Term name="challenge window">challenge window</Term>. From there it
              ends one of two ways.
            </p>
            <p>
              If no challenge holds, the window closes and the bond returns in
              full. If a challenge proves the payout was wrong, the contract
              slashes the bond. The action held up, or it did not. There is no
              middle state.
            </p>
          </>
        }
        diagram={<LifecycleDiagram />}
      />

      {/* Agent */}
      <Section
        label="The decision"
        title="A confident mistake is the point"
        body={
          <>
            <p>
              The agent reads an invoice and checks it against a plain policy:
              delivery confirmed, amount positive, due date reached. It writes a
              short reason and commits the reason&apos;s hash on-chain with the
              action, so the decision cannot be quietly changed later.
            </p>
            <p>
              The agent can be articulate and still be wrong. That is precisely
              why it must have something at stake. The bond does not assume the
              agent is careless; it assumes the agent can be confidently mistaken.
            </p>
          </>
        }
        diagram={<AgentDecision />}
      />

      {/* Risk-weighted bond */}
      <Section
        label="The bond"
        title="Sized to the risk"
        body={
          <>
            <p>
              The bond scales with the payout. Below 10,000 csprUSD the rate is 2
              percent. At 10,000 it steps to 3 percent, and at 50,000 to 5
              percent. A larger payout puts more at risk, so it costs more to act
              on.
            </p>
            <p>
              The agent&apos;s record adjusts it further. While the{' '}
              <Term name="reputation">reputation</Term> score is negative, the
              contract adds that many basis points, up to 300. A clean history
              keeps bonds low; a slash makes the next action more expensive.
            </p>
          </>
        }
        diagram={<ReputationEffect />}
      />

      {/* Slash, proven */}
      <Section
        label="The proof"
        title="The contract proves the fraud"
        body={
          <>
            <p>
              No human judges a payout. The most common fraud, paying the same
              invoice twice, is proven directly. Each invoice carries a{' '}
              <Term name="claim hash">claim hash</Term>. When a payout reuses a
              hash that was already paid, the invoice pool sees the collision and
              the slash follows. It is a fact on the chain, not a verdict.
            </p>
          </>
        }
        diagram={<DuplicateClaim />}
      />

      {/* Split */}
      <Section
        label="The slash"
        title="Where the bond goes"
        body={
          <>
            <p>
              A slashed bond splits in half. One half goes to whoever caught the
              wrong payout, which pays people to watch. The other half goes to a{' '}
              <Term name="reserve">reserve</Term> that protects the people whose
              money the agent moves. Nothing else funds the reserve, so its
              balance measures fraud caught.
            </p>
          </>
        }
        diagram={<SlashSplit />}
      />

      <Appear className="mt-20 rounded-md border border-rule bg-surface p-8 text-center">
        <h2 className="font-display text-2xl font-semibold text-bone">
          Now watch it happen
        </h2>
        <p className="mx-auto mt-3 max-w-prose text-sm leading-relaxed text-muted">
          The demo runs the whole loop on Casper testnet. Read the full reference
          in the docs if you want every detail.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/demo"
            className="rounded-md border border-copper bg-copper/15 px-6 py-3 font-medium text-copper transition-colors hover:bg-copper/25"
          >
            Try the demo
          </Link>
          <Link
            href="/docs"
            className="rounded-md border border-rule px-6 py-3 text-bone transition-colors hover:border-copper/50"
          >
            Read the docs
          </Link>
        </div>
      </Appear>
    </div>
  );
}

function Section({
  label,
  title,
  body,
  diagram,
}: {
  label: string;
  title: string;
  body: React.ReactNode;
  diagram: React.ReactNode;
}) {
  return (
    <section className="mt-20 border-t border-rule pt-14">
      <Appear className="mx-auto max-w-2xl text-center">
        <Label>{label}</Label>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">{title}</h2>
        <div className="prose-docs mt-5 space-y-4 text-left">{body}</div>
      </Appear>
      <Appear delay={0.1} className="mx-auto mt-10 max-w-3xl">
        {diagram}
      </Appear>
    </section>
  );
}
