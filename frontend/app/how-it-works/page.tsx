import type { Metadata } from 'next';
import Link from 'next/link';
import Appear from '@/components/ui/Appear';
import Diagram from '@/components/Diagram';
import { Label } from '@/components/ui/Primitives';
import Term from '@/components/ui/Term';

export const metadata: Metadata = {
  title: 'How it works',
  description:
    'The full mechanic: the risk-weighted bond, the contract-proven slash, the reputation effect, and the approver and watchdog economy.',
};

export default function HowItWorks() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <Appear className="max-w-2xl">
        <Label>How it works</Label>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-bone sm:text-5xl">
          The mechanism, in full
        </h1>
        <p className="mt-4 max-w-prose leading-relaxed text-muted">
          Bondsman is one rule made concrete: an agent must stake capital before
          it can move money, and loses the stake when it is wrong. Here is exactly
          how that plays out.
        </p>
      </Appear>

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
        diagram={
          <Diagram
            name="lifecycle"
            alt="Intent, bond, execute, challenge window, then a refund on the clean path or a slash on the wrong path."
          />
        }
      />

      <Section
        label="The flagship fault"
        title="Delayed delivery evidence, verified by the contract"
        body={
          <>
            <p>
              The most consequential fault in autonomous finance is the one that
              arrives after the payout has already cleared. A buyer signs and
              publishes attestation that the goods never arrived, or that delivery
              was rejected. Bondsman&apos;s delivery-contradiction verifier reads
              that signed attestation and matches it to an executed action.
            </p>
            <p>
              No human weighs the evidence. The contract checks the signature,
              binds it to the action, and slashes the bond. This is the fault the
              canonical proof demonstrates.
            </p>
          </>
        }
      />

      <Section
        label="The deterministic test vector"
        title="Duplicate claim is proven at zero oracle trust"
        body={
          <p>
            A second verifier proves duplicate invoice payouts by claim-hash
            collision. Each invoice carries a{' '}
            <Term name="claim hash">claim hash</Term>. If a payout reuses one that
            was already paid, the invoice pool sees the collision and the slash
            follows. Duplicate claim is the deterministic test vector for the
            protocol. Delivery contradiction is the flagship delayed-evidence
            fault.
          </p>
        }
        diagram={
          <Diagram
            name="duplicate-proof"
            alt="Two invoices share one claim hash. The contract detects the collision and slashes, with no human in the path."
          />
        }
      />

      <Section
        label="The slash"
        title="Where the bond goes"
        body={
          <p>
            A slashed bond splits in half. One half goes to whoever caught the
            wrong payout, which pays people and agents to watch. The other half
            goes to a <Term name="reserve">reserve</Term> that protects the
            people whose money the agent moves. Nothing else funds the reserve,
            so its balance measures fraud caught.
          </p>
        }
        diagram={
          <Diagram
            name="slash-split"
            alt="A slashed bond splits in half: one half to the challenger, one half to the reserve."
          />
        }
      />

      <Section
        label="The bond"
        title="Sized to the risk, adjusted by record"
        body={
          <>
            <p>
              The bond scales with the payout. Below 10,000 csprUSD the rate is
              2 percent. At 10,000 it steps to 3 percent, and at 50,000 to 5
              percent. A larger payout puts more at risk, so it costs more to
              act on.
            </p>
            <p>
              The agent&apos;s record adjusts it further. While the{' '}
              <Term name="reputation">reputation</Term> score is negative, the
              contract adds that many basis points, up to 300. Reputation can
              only add a premium above the tier floor, never discount below it,
              so a large action always requires the tier bond regardless of
              history.
            </p>
          </>
        }
      />

      <Section
        label="The economy"
        title="Approver and watchdog, no human"
        body={
          <p>
            A model-driven approver posts a bond and executes a payout. A
            deterministic watchdog runs independently, ingests signed contradiction
            evidence, matches it to executed actions, and submits the challenge.
            The contract slashes the bond and pays the watchdog its share. Two
            on-chain accounts settle against each other with no person in the
            loop.
          </p>
        }
        diagram={
          <Diagram
            name="agent-economy"
            alt="The approver posts a bond and executes. The deterministic watchdog observes signed contradiction evidence, challenges, and the contract slashes the bond and pays the watchdog."
          />
        }
      />

      <Appear className="mt-20 rounded-lg border border-rule bg-surface p-8">
        <h2 className="text-2xl font-semibold text-bone">See it settled</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted">
          The canonical proof for Action No. 0027 shows the whole mechanic
          against real Casper testnet transactions.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/proof"
            className="rounded-md bg-accent px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-strong"
          >
            Inspect the canonical proof
          </Link>
          <Link
            href="/docs"
            className="rounded-md border border-rule px-6 py-3 text-bone transition-colors hover:border-accent/50"
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
  diagram?: React.ReactNode;
}) {
  return (
    <section className="mt-16 border-t border-rule pt-12">
      <Appear className="max-w-2xl">
        <Label>{label}</Label>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-bone">{title}</h2>
      </Appear>
      <div className="prose-docs mt-6 max-w-2xl space-y-4">{body}</div>
      {diagram && <div className="mt-10">{diagram}</div>}
    </section>
  );
}
