import { Label } from '@/components/ui/Primitives';
import CopyHash from '@/components/ui/CopyHash';
import Money from '@/components/ui/Money';
import MoneyCountUp from '@/components/ui/MoneyCountUp';
import {
  accountExplorer,
  contractPackageExplorer,
  formatIsoUtc,
  formatWcspr,
  truncateHash,
  txExplorer,
} from '@/lib/format';
import type { CanonicalProof } from '@/lib/types';

interface Row {
  label: string;
  value: React.ReactNode;
}

function Rows({ rows }: { rows: Row[] }) {
  return (
    <dl className="mt-4 space-y-2.5 text-sm">
      {rows.map((r) => (
        <div
          key={r.label}
          className="grid grid-cols-[10.5rem_1fr] items-baseline gap-3 border-t border-rule pt-2 first:border-t-0 first:pt-0"
        >
          <dt className="serial text-[0.6rem] text-muted">{r.label}</dt>
          <dd className="text-sm text-bone break-all">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-rule bg-surface p-5">
      <Label>{title}</Label>
      {children}
    </section>
  );
}

export function PaymentPanel({ payment }: { payment: CanonicalProof['payment'] }) {
  if (!payment) return null;
  const rows: Row[] = [
    { label: 'Protocol', value: `${payment.protocol} · ${payment.scheme}` },
    { label: 'Network', value: payment.network },
    { label: 'Asset', value: payment.asset },
    {
      label: 'Asset package',
      value: (
        <CopyHash
          value={payment.assetPackage}
          href={contractPackageExplorer(payment.assetPackage)}
          label={truncateHash(payment.assetPackage)}
        />
      ),
    },
    { label: 'Amount', value: formatWcspr(payment.paymentAmount) },
    {
      label: 'Payer',
      value: (
        <CopyHash
          value={payment.payer}
          href={accountExplorer(payment.payer)}
          label={truncateHash(payment.payer)}
        />
      ),
    },
    {
      label: 'Recipient',
      value: (
        <CopyHash
          value={payment.payTo}
          href={accountExplorer(payment.payTo)}
          label={truncateHash(payment.payTo)}
        />
      ),
    },
    { label: 'Facilitator', value: payment.facilitator },
    {
      label: 'Settlement tx',
      value: (
        <CopyHash
          value={payment.settlementTransaction}
          href={txExplorer(payment.settlementTransaction)}
          label={truncateHash(payment.settlementTransaction)}
        />
      ),
    },
  ];
  return (
    <Panel title="Payment · x402 settlement">
      <Rows rows={rows} />
    </Panel>
  );
}

export function PaidQuotePanel({
  quote,
  consumedActionId,
}: {
  quote: CanonicalProof['paidQuote'];
  consumedActionId: string;
}) {
  if (!quote) return null;
  const rows: Row[] = [
    {
      label: 'Quote hash',
      value: <CopyHash value={quote.quoteHash} label={truncateHash(quote.quoteHash)} />,
    },
    { label: 'Action type', value: quote.actionType },
    { label: 'Fault class', value: quote.faultClass },
    { label: 'Verifier', value: quote.verifier },
    {
      label: 'Principal',
      value: (
        <span className="font-mono text-bone">
          <Money atomic={quote.principalAmount} />
        </span>
      ),
    },
    {
      label: 'Required bond',
      value: (
        <span className="font-mono text-bone">
          <Money atomic={quote.requiredBond} />
        </span>
      ),
    },
    { label: 'Challenge window', value: `${quote.challengeWindow}s` },
    { label: 'Issued', value: formatIsoUtc(quote.issuedAt) },
    { label: 'Consumed', value: formatIsoUtc(quote.consumedAt) },
    { label: 'Consumed by action', value: `No. ${consumedActionId.padStart(4, '0')}` },
    { label: 'Status', value: quote.status },
  ];
  return (
    <Panel title="Paid quote">
      <Rows rows={rows} />
    </Panel>
  );
}

export function DeliveryContradictionPanel({
  proof,
}: {
  proof: CanonicalProof;
}) {
  const a = proof.deliveryAttestation;
  const rows: Row[] = [
    { label: 'Fault class', value: proof.faultCondition.class },
    { label: 'Verifier module', value: proof.faultCondition.verifierModule },
    {
      label: 'Evidence root',
      value: (
        <CopyHash
          value={proof.faultCondition.evidenceRoot}
          label={truncateHash(proof.faultCondition.evidenceRoot)}
        />
      ),
    },
    { label: 'Verification', value: proof.faultCondition.verificationDetails },
  ];
  if (a) {
    rows.push(
      { label: 'Event', value: a.eventType },
      {
        label: 'Buyer public key',
        value: (
          <span className="font-mono text-xs text-bone/90 break-all">
            {a.buyerPublicKey}
          </span>
        ),
      },
      { label: 'Occurred', value: formatIsoUtc(a.occurredAt) },
      { label: 'Received', value: formatIsoUtc(a.receivedAt) },
      {
        label: 'Signature',
        value: a.signatureVerified ? (
          <span className="text-accent">verified on chain</span>
        ) : (
          <span className="text-slash">not verified</span>
        ),
      },
    );
  }
  return (
    <Panel title="Delivery contradiction">
      <Rows rows={rows} />
    </Panel>
  );
}

export function EconomicPanel({ proof }: { proof: CanonicalProof }) {
  const e = proof.economicImpact;
  const rows: Row[] = [
    {
      label: 'Bond',
      value: (
        <span className="font-mono text-slash tabular">
          <MoneyCountUp atomic={proof.bond} />
          <span className="ml-1 text-[0.72em] text-muted">csprUSD</span>
        </span>
      ),
    },
    {
      label: 'Challenger reward',
      value: (
        <div>
          <span className="font-mono text-bone tabular">
            <MoneyCountUp atomic={e.challengerReward} />
            <span className="ml-1 text-[0.72em] text-muted">csprUSD</span>
          </span>{' '}
          <span className="text-xs text-muted">({e.challengerRewardSource})</span>
        </div>
      ),
    },
    {
      label: 'Reserve credit',
      value: (
        <div>
          <span className="font-mono text-bone tabular">
            <MoneyCountUp atomic={e.reserveCredit} />
            <span className="ml-1 text-[0.72em] text-muted">csprUSD</span>
          </span>{' '}
          <span className="text-xs text-muted">({e.reserveCreditSource})</span>
        </div>
      ),
    },
    {
      label: 'Current reserve',
      value: (
        <span className="font-mono text-bone tabular">
          <MoneyCountUp atomic={e.currentReserveSnapshot} />
          <span className="ml-1 text-[0.72em] text-muted">csprUSD</span>
        </span>
      ),
    },
    {
      label: 'Reputation before',
      value: e.reputationBefore ?? <span className="text-muted">not recorded</span>,
    },
    {
      label: 'Reputation delta',
      value: (
        <div>
          <span className="font-mono text-bone">{e.reputationDelta}</span>{' '}
          <span className="text-xs text-muted">({e.reputationDeltaSource})</span>
        </div>
      ),
    },
    {
      label: 'Reputation after',
      value: e.reputationAfter ?? <span className="text-muted">not recorded</span>,
    },
  ];
  return (
    <Panel title="Economic resolution">
      <Rows rows={rows} />
    </Panel>
  );
}
