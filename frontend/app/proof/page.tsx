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
import LiveQuoteProbe from '@/components/proof/LiveQuoteProbe';
import QuoteSingleUseCheck from '@/components/proof/QuoteSingleUseCheck';
import ReplayTimeline from '@/components/proof/ReplayTimeline';
import BondEconomicsCard from '@/components/proof/BondEconomicsCard';
import ReceiptTamperLab from '@/components/proof/ReceiptTamperLab';
import {
  DeliveryContradictionPanel,
  EconomicPanel,
  PaymentPanel,
  PaidQuotePanel,
} from '@/components/proof/PanelGrid';
import WhatIsReal from '@/components/proof/WhatIsReal';
import CopyHash from '@/components/ui/CopyHash';
import { formatWcspr, truncateHash, txExplorer } from '@/lib/format';

export const metadata: Metadata = {
  title: 'Proof Console',
  description:
    'Verify a complete bonded agent action on Casper. Live x402 probe, canonical Action 27 replay, quote single use test and a receipt tamper lab against the real verifier.',
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

  return (
    <Container className="space-y-14 py-14 lg:py-20">
      <SectionHeader
        eyebrow="Proof Console"
        title="Verify a complete bonded agent action"
        lede="Run a real payment probe, inspect settled Casper evidence, test single use protection and try to break the signed receipt. Every hash opens on the Casper testnet explorer."
      />

      <HealthBanner state={state} />

      {/* Sequence overview */}
      <section aria-label="Proof console guided sequence" className="grid gap-4 lg:grid-cols-3">
        <StepCard step={1} label="Request payment terms" body="Live x402 probe returns the real WCSPR settlement instrument." />
        <StepCard step={2} label="Inspect settlement" body="See the settled WCSPR payment for the canonical action." />
        <StepCard step={3} label="Verify quote consumption" body="Read only check that the paid quote will not accept a second submission." />
        <StepCard step={4} label="Replay the bonded action" body="Approver posted the bond, executed the payout and consumed the paid quote." />
        <StepCard step={5} label="Inspect the contradiction" body="Buyer signed delivery attestation arrived after execution." />
        <StepCard step={6} label="Watchdog challenge" body="The independent watchdog submitted the challenge with the signed evidence." />
        <StepCard step={7} label="Slash economics" body="Bond slashed. Challenger reward and reserve credit set on chain." />
        <StepCard step={8} label="Verify the receipt" body="Signed portable receipt verified against the public verifier." />
        <StepCard step={9} label="Tamper the receipt" body="Modify a field client side and watch the real verifier reject it." />
      </section>

      {/* 1. Live probe */}
      <LiveQuoteProbe />

      {/* 2. Settlement summary */}
      <section className="rounded-md border border-rule bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <Label>Step 2 · Settlement snapshot</Label>
            <h3 className="mt-1 text-lg font-semibold text-bone">
              Historical Casper testnet settlement for Action No. {actionId.padStart(4, '0')}
            </h3>
          </div>
          <StatusPill tone="info">REAL HISTORICAL CASPER TRANSACTION</StatusPill>
        </div>
        {proof.payment ? (
          <dl className="mt-5 grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Settlement amount">
              <span className="font-mono text-bone">
                {formatWcspr(proof.payment.paymentAmount)}
              </span>
            </Field>
            <Field label="Settlement transaction">
              <CopyHash
                value={proof.payment.settlementTransaction}
                href={txExplorer(proof.payment.settlementTransaction)}
                label={truncateHash(proof.payment.settlementTransaction)}
              />
            </Field>
            <Field label="Network">{proof.payment.network}</Field>
            <Field label="Facilitator">{proof.payment.facilitator}</Field>
            <Field label="Pay to account">
              <CopyHash
                value={proof.payment.payTo}
                label={truncateHash(proof.payment.payTo)}
              />
            </Field>
            <Field label="Payer">
              <CopyHash
                value={proof.payment.payer}
                label={truncateHash(proof.payment.payer)}
              />
            </Field>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-muted">Payment record unavailable.</p>
        )}
      </section>

      {/* 3. Quote single use */}
      {quoteHash && <QuoteSingleUseCheck quoteHash={quoteHash} actionId={actionId} />}

      {/* 4-7. Guided timeline */}
      <ReplayTimeline replay={replay} />

      {/* Bond economics */}
      <BondEconomicsCard
        economics={bondEconomics}
        policySnapshot={proof.paidQuote?.policySnapshot}
        actionId={actionId}
      />

      {/* Deep evidence */}
      <section aria-label="Evidence explorer">
        <div className="flex items-baseline justify-between">
          <div>
            <Label>Evidence explorer</Label>
            <h3 className="mt-1 text-lg font-semibold text-bone">
              Every panel opens directly against the backend record
            </h3>
          </div>
        </div>
        <PanelGrid cols={2} className="mt-5" gap="lg">
          <PaymentPanel payment={proof.payment} />
          <PaidQuotePanel
            quote={proof.paidQuote}
            consumedActionId={actionId}
          />
          <DeliveryContradictionPanel proof={proof} />
          <EconomicPanel proof={proof} />
        </PanelGrid>
      </section>

      {/* 8-9. Receipt lab */}
      {receipt && (
        <ReceiptTamperLab
          receipt={receipt}
          initialVerification={initialVerification}
        />
      )}

      <WhatIsReal />
    </Container>
  );
}

function StepCard({
  step,
  label,
  body,
}: {
  step: number;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-md border border-rule bg-surface/60 p-4">
      <div className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full border border-accent/40 bg-accent/10 font-mono text-xs text-accent">
          {step}
        </span>
        <p className="text-sm font-semibold text-bone">{label}</p>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">{body}</p>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="serial text-[0.6rem] text-muted">{label}</dt>
      <dd className="mt-1 text-sm text-bone break-all">{children}</dd>
    </div>
  );
}
