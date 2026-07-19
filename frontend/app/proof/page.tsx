import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import { Label } from '@/components/ui/Primitives';
import ExecRail from '@/components/proof/ExecRail';
import CanonicalSummary from '@/components/proof/CanonicalSummary';
import CanonicalTimeline from '@/components/proof/CanonicalTimeline';
import {
  PaymentPanel,
  PaidQuotePanel,
  DeliveryContradictionPanel,
  EconomicPanel,
} from '@/components/proof/PanelGrid';
import ReceiptPanel from '@/components/proof/ReceiptPanel';
import WhatIsReal from '@/components/proof/WhatIsReal';
import Money from '@/components/ui/Money';
import CopyHash from '@/components/ui/CopyHash';
import { truncateHash, txExplorer } from '@/lib/format';
import type { CanonicalProof } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Proof Center',
  description:
    'The canonical Bondsman proof: an external x402 payment, a bonded action, a delayed delivery contradiction, an autonomous watchdog challenge, and a portable receipt anyone can verify.',
};

export const revalidate = 30;

export default async function ProofCenterPage() {
  const canonicalRes = await safeGet(() => api.canonicalProof());

  if (!canonicalRes.reachable) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-16">
        <BackendDown />
      </div>
    );
  }

  const canonical = canonicalRes.data;
  const actionId = canonical.actionId;

  const [featuredRes, receiptRes, verifyRes] = await Promise.all([
    safeGet(() => api.featuredProofs()),
    safeGet(() => api.receipt(actionId)),
    safeGet(() => api.receiptVerify(actionId)),
  ]);

  const featured = featuredRes.reachable ? featuredRes.data : [];
  const receipt = receiptRes.reachable ? receiptRes.data : null;
  const verification = verifyRes.reachable ? verifyRes.data : null;

  const supporting = featured.filter((p) => p.actionId !== actionId);

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-6 py-16">
      <header className="max-w-3xl space-y-4">
        <Label>Proof Center</Label>
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Action No. {actionId.padStart(4, '0')}, from payment to portable
          receipt.
        </h1>
        <p className="text-lg leading-relaxed text-muted">
          Bondsman&apos;s canonical production proof. An external agent settled
          x402, bought a paid quote, and consumed it as a bonded action. Delayed
          delivery evidence arrived. The watchdog challenged. The contract took
          the bond.
        </p>
        <ExecRail className="pt-4" />
      </header>

      <CanonicalSummary
        proof={canonical}
        receiptValid={verification?.valid ?? null}
      />

      <CanonicalTimeline
        proof={canonical}
        receipt={receipt}
        receiptValid={verification?.valid ?? null}
      />

      <section className="grid gap-4 lg:grid-cols-2">
        <PaymentPanel payment={canonical.payment} />
        <PaidQuotePanel
          quote={canonical.paidQuote}
          consumedActionId={actionId}
        />
        <DeliveryContradictionPanel proof={canonical} />
        <EconomicPanel proof={canonical} />
      </section>

      <ReceiptPanel
        receipt={receipt}
        verification={verification}
        actionId={actionId}
      />

      <WhatIsReal />

      {supporting.length > 0 && (
        <section aria-label="Supporting proofs" className="space-y-4">
          <div>
            <Label>Supporting evidence</Label>
            <h2 className="mt-1 text-2xl font-semibold text-bone">
              Other proofs Bondsman has settled
            </h2>
            <p className="mt-2 text-sm text-muted">
              Additional canonical proofs. Duplicate-claim slashes and clean
              refunds complete the picture, but the delivery contradiction above
              is the flagship delayed-evidence fault class.
            </p>
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {supporting.slice(0, 6).map((p) => (
              <SupportingCard key={p.actionId} proof={p} />
            ))}
          </ul>
        </section>
      )}

      <section aria-label="Next" className="rounded-md border border-rule bg-surface p-6">
        <Label>Next</Label>
        <div className="mt-3 flex flex-wrap gap-3 text-sm">
          <Link
            href="/build"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Integrate your agent
          </Link>
          <Link
            href="/how-it-works"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Read the full mechanic
          </Link>
          <Link
            href="/docs"
            className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
          >
            Open the documentation
          </Link>
        </div>
      </section>
    </div>
  );
}

function SupportingCard({ proof }: { proof: CanonicalProof }) {
  const resolveTx =
    proof.timeline.find((s) => s.stage === 'resolve')?.txHash ?? null;
  return (
    <li className="rounded-md border border-rule bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="serial text-[0.6rem] text-muted">
          No. {proof.actionId.padStart(4, '0')}
        </span>
        <span
          className={`serial rounded border px-2 py-0.5 text-[0.55rem] ${
            proof.outcome === 'SLASHED'
              ? 'border-slash/40 bg-slash/10 text-slash'
              : 'border-accent/30 bg-accent/10 text-accent'
          }`}
        >
          {proof.outcome}
        </span>
      </div>
      <p className="mt-2 text-sm text-bone">{proof.oneLine}</p>
      <dl className="mt-3 space-y-1.5 border-t border-rule pt-2 text-xs text-muted">
        <div className="flex items-center justify-between">
          <dt>Fault class</dt>
          <dd className="text-bone">{proof.faultClass}</dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Value at risk</dt>
          <dd className="font-mono text-bone">
            <Money atomic={proof.valueAtRisk} />
          </dd>
        </div>
        <div className="flex items-center justify-between">
          <dt>Bond</dt>
          <dd className="font-mono text-bone">
            <Money atomic={proof.bond} />
          </dd>
        </div>
        {resolveTx && (
          <div className="flex items-center justify-between">
            <dt>Resolve tx</dt>
            <dd>
              <CopyHash
                value={resolveTx}
                href={txExplorer(resolveTx)}
                label={truncateHash(resolveTx)}
              />
            </dd>
          </div>
        )}
      </dl>
      <Link
        href={`/app/actions/${proof.actionId}`}
        className="mt-3 inline-block text-xs text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
      >
        Open the action detail
      </Link>
    </li>
  );
}
