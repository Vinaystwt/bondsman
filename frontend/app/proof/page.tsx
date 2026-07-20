import type { Metadata } from 'next';
import { api, safeGet } from '@/lib/api';
import { BackendDown } from '@/components/ui/States';
import {
  Container,
  Label,
  PanelGrid,
  SectionHeader,
  StatusPill,
} from '@/components/ui/Primitives';
import HealthBanner, {
  resolveProofState,
} from '@/components/proof/HealthBanner';
import QuoteSingleUseCheck from '@/components/proof/QuoteSingleUseCheck';
import ReplayTimeline from '@/components/proof/ReplayTimeline';
import BondEconomicsCard from '@/components/proof/BondEconomicsCard';
import ReceiptPanel from '@/components/proof/ReceiptPanel';
import ReceiptTamperLab from '@/components/proof/ReceiptTamperLab';
import {
  DeliveryContradictionPanel,
  EconomicPanel,
  PaymentPanel,
  PaidQuotePanel,
} from '@/components/proof/PanelGrid';
import CopyHash from '@/components/ui/CopyHash';
import { formatMoney, truncateHash, txExplorer } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Proof',
  description:
    'Replay Action 27, a real historical Casper testnet slash with signed receipt verification.',
};

export const revalidate = 30;

type HealthResp = {
  ok?: boolean;
  publicExperience?: {
    proofConsoleReady?: boolean;
    canonicalReceiptValid?: boolean;
    liveQuoteProbeAvailable?: boolean;
    canonicalActionId?: number;
  };
};

export default async function ProofConsolePage() {
  const [healthRes, replayRes] = await Promise.all([
    safeGet(() => api.health() as unknown as Promise<HealthResp>),
    safeGet(() => api.canonicalReplay()),
  ]);

  if (!replayRes.reachable) {
    return (
      <Container className="py-16">
        <BackendDown />
      </Container>
    );
  }

  const replay = replayRes.data;
  const proof = replay.proof;
  const actionId = String(replay.actionId);
  const quoteHash = proof.paidQuote?.quoteHash ?? '';
  const receipt = replay.receipt;

  const [receiptVerifyRes] = await Promise.all([
    safeGet(() => api.receiptVerify(actionId)),
  ]);
  const initialVerification = receiptVerifyRes.reachable
    ? receiptVerifyRes.data
    : null;

  const healthData = healthRes.reachable ? healthRes.data : null;
  const publicExperience =
    (healthData?.publicExperience as unknown as
      | Parameters<typeof resolveProofState>[0]['publicExperience']
      | undefined) ?? null;

  const state = resolveProofState({
    healthOk: healthData ? Boolean(healthData.ok) : null,
    publicExperience: publicExperience ?? null,
    replaySource: replay.source,
  });

  const bondEconomics = proof.bondEconomics ?? {
    quotedMinimumBond: proof.paidQuote?.quotedMinimumBond ?? proof.bond,
    actualPostedBond: proof.bond,
    bondRelation: 'exact',
    bondDifference: '0',
    minimumSatisfied: true,
    exactMatch: true,
  };

  const settlementTx = proof.payment?.settlementTransaction ?? null;

  return (
    <Container className="space-y-12 py-14 lg:py-20">
      <SectionHeader
        eyebrow="REAL HISTORICAL CASPER TESTNET ACTION"
        title={`Action ${actionId} proof`}
        lede="Replay the paid quote, bond lock, execution, delayed evidence, watchdog challenge, slash and signed receipt without a wallet or a new transaction."
      />

      <HealthBanner state={state} />

      <section className="grid gap-5 rounded-md border border-rule bg-surface p-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <Label>Canonical outcome</Label>
          <h2 className="mt-2 text-2xl font-semibold text-bone">
            Bond slashed after buyer signed contradiction evidence
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">
            This is historical Action {actionId}. It is not a simulation, not a new payment and not a fresh backend sponsored action.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="fault">{proof.outcome}</StatusPill>
          <StatusPill tone="info">{proof.faultClass}</StatusPill>
        </div>
        <dl className="grid gap-4 border-t border-rule pt-5 text-sm sm:grid-cols-2 lg:col-span-2 lg:grid-cols-4">
          <SummaryField label="Principal">{formatMoney(proof.valueAtRisk)}</SummaryField>
          <SummaryField label="Bond">{formatMoney(proof.bond)}</SummaryField>
          <SummaryField label="Settlement">
            {settlementTx ? (
              <CopyHash
                value={settlementTx}
                href={txExplorer(settlementTx)}
                label={truncateHash(settlementTx)}
              />
            ) : (
              'not available'
            )}
          </SummaryField>
          <SummaryField label="Receipt">
            {initialVerification?.valid ? 'signature valid' : 'verification pending'}
          </SummaryField>
        </dl>
      </section>

      <section id="lifecycle" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Label>Replay control</Label>
            <h2 className="mt-1 text-xl font-semibold text-bone">
              Lifecycle rail
            </h2>
          </div>
          <a
            href="#receipt-verifier"
            className="rounded-md border border-rule px-4 py-2 text-sm text-bone transition-colors hover:border-accent/50"
          >
            Jump to receipt
          </a>
        </div>
        <ReplayTimeline replay={replay} />
      </section>

      <BondEconomicsCard
        economics={bondEconomics}
        policySnapshot={proof.paidQuote?.policySnapshot}
        actionId={actionId}
      />

      <details className="rounded-md border border-rule bg-surface p-5">
        <summary className="cursor-pointer list-none">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <Label>Advanced evidence</Label>
              <h2 className="mt-1 text-xl font-semibold text-bone">
                Payment, quote, contradiction and slash details
              </h2>
            </div>
            <StatusPill tone="info">Read only</StatusPill>
          </div>
        </summary>
        <div className="mt-5 space-y-6 border-t border-rule pt-5">
          {quoteHash && (
            <QuoteSingleUseCheck quoteHash={quoteHash} actionId={actionId} />
          )}
          <PanelGrid cols={2} gap="lg">
            <PaymentPanel payment={proof.payment} />
            <PaidQuotePanel
              quote={proof.paidQuote}
              consumedActionId={actionId}
            />
            <DeliveryContradictionPanel proof={proof} />
            <EconomicPanel proof={proof} />
          </PanelGrid>
        </div>
      </details>

      <section id="receipt-verifier">
        <ReceiptPanel
          receipt={receipt}
          verification={initialVerification}
          actionId={actionId}
        />
      </section>

      {receipt && (
        <ReceiptTamperLab
          receipt={receipt}
          initialVerification={initialVerification}
        />
      )}
    </Container>
  );
}

function SummaryField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="serial text-[0.6rem] text-muted">{label}</dt>
      <dd className="mt-1 break-all text-bone">{children}</dd>
    </div>
  );
}
