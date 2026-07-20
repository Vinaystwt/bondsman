import { Label, StatusPill } from '@/components/ui/Primitives';
import CopyHash from '@/components/ui/CopyHash';
import {
  accountExplorer,
  formatIsoUtc,
  formatMoney,
  formatWcspr,
  truncateHash,
  txExplorer,
} from '@/lib/format';
import type { CanonicalReplay } from '@/lib/types';

interface Stage {
  step: number;
  eyebrow: string;
  title: string;
  body?: React.ReactNode;
  txHash?: string | null;
  amount?: string | null;
  actor?: string | null;
  evidenceLabel?: string | null;
}

const EV_LABEL_COPY: Record<string, string> = {
  LIVE_REQUEST: 'LIVE REQUEST',
  REAL_HISTORICAL_TRANSACTION: 'REAL HISTORICAL CASPER TRANSACTION',
  CANONICAL_REPLAY: 'CANONICAL REPLAY',
  CONTROLLED_TESTNET_FIXTURE: 'CONTROLLED TESTNET INPUT',
  SIGNED_PORTABLE_EVIDENCE: 'SIGNED PORTABLE EVIDENCE',
};

/**
 * The step by step canonical replay for Action 27. Every stage links the
 * relevant Casper testnet transaction and shows the evidence label the
 * backend attaches to that step. No stage is a mockup.
 */
export default function ReplayTimeline({ replay }: { replay: CanonicalReplay }) {
  const p = replay.proof;
  const labels = replay.evidenceLabels;
  const initiateTx = p.timeline.find((s) => s.stage === 'initiate')?.txHash ?? null;
  const bondPostedTx =
    p.timeline.find((s) => s.stage === 'bond_posted')?.txHash ?? null;
  const executeTx = p.timeline.find((s) => s.stage === 'execute')?.txHash ?? null;
  const challengeTx =
    p.timeline.find((s) => s.stage === 'challenge')?.txHash ?? null;
  const resolveTx = p.timeline.find((s) => s.stage === 'resolve')?.txHash ?? null;

  const stages: Stage[] = [
    {
      step: 2,
      eyebrow: 'Payment',
      title: 'x402 WCSPR payment settled',
      evidenceLabel: labels.payment,
      txHash: p.payment?.settlementTransaction ?? null,
      actor: p.payment?.payer ?? null,
      amount: p.payment ? formatWcspr(p.payment.paymentAmount) : null,
      body: p.payment ? (
        <p className="text-sm text-muted">
          Real historical settlement of {formatWcspr(p.payment.paymentAmount)}{' '}
          for a bonded action quote. Package {truncateHash(p.payment.assetPackage)}{' '}
          on {p.payment.network}.
        </p>
      ) : (
        <p className="text-sm text-muted">Payment record unavailable.</p>
      ),
    },
    {
      step: 4,
      eyebrow: 'Paid quote',
      title: 'Quote issued and consumed by Action 27',
      evidenceLabel: labels.quote,
      body: p.paidQuote ? (
        <p className="text-sm text-muted">
          Verifier {p.paidQuote.verifier}. Challenge window{' '}
          {p.paidQuote.challengeWindow}s. Quote hash{' '}
          <CopyHash
            value={p.paidQuote.quoteHash}
            label={truncateHash(p.paidQuote.quoteHash)}
          />{' '}
          consumed at {formatIsoUtc(p.paidQuote.consumedAt)}.
        </p>
      ) : null,
    },
    {
      step: 5,
      eyebrow: 'Bond posted',
      title: 'Approver posted overcollateralized bond',
      evidenceLabel: labels.action,
      txHash: bondPostedTx,
      actor: p.participants.approver.account,
      amount: formatMoney(p.bond),
      body: (
        <p className="text-sm text-muted">
          Casper controller required additional collateral over the quote
          minimum at initiation. The action was overcollateralized.
        </p>
      ),
    },
    {
      step: 6,
      eyebrow: 'Execute',
      title: 'Approver executed the invoice payout',
      evidenceLabel: labels.action,
      txHash: executeTx,
      actor: p.participants.approver.account,
      body: (
        <p className="text-sm text-muted">
          Principal at risk {formatMoney(p.valueAtRisk)} released after bond
          lock. Initiate transaction{' '}
          {initiateTx && (
            <CopyHash
              value={initiateTx}
              href={txExplorer(initiateTx)}
              label={truncateHash(initiateTx)}
            />
          )}
          .
        </p>
      ),
    },
    {
      step: 7,
      eyebrow: 'Delayed evidence',
      title: 'Buyer signed delivery contradiction arrived',
      evidenceLabel: labels.deliveryInput,
      body: p.deliveryAttestation ? (
        <p className="text-sm text-muted">
          Event {p.deliveryAttestation.eventType}. Received at{' '}
          {formatIsoUtc(p.deliveryAttestation.receivedAt)}. Evidence root{' '}
          <CopyHash
            value={p.deliveryAttestation.evidenceRoot}
            label={truncateHash(p.deliveryAttestation.evidenceRoot)}
          />
          . Signature{' '}
          {p.deliveryAttestation.signatureVerified ? (
            <span className="text-accent">verified on chain.</span>
          ) : (
            <span className="text-slash">not verified.</span>
          )}
        </p>
      ) : null,
    },
    {
      step: 8,
      eyebrow: 'Watchdog challenge',
      title: 'Autonomous watchdog challenged the action',
      evidenceLabel: labels.challenge,
      txHash: challengeTx,
      actor: p.participants.challenger.account,
      body: (
        <p className="text-sm text-muted">
          Independent {p.participants.challenger.role} challenger submitted the
          signed evidence to the controller.
        </p>
      ),
    },
    {
      step: 9,
      eyebrow: 'Resolution',
      title: 'Controller slashed the bond',
      evidenceLabel: labels.challenge,
      txHash: resolveTx,
      body: (
        <p className="text-sm text-muted">
          Bond {formatMoney(p.bond)}. Challenger reward{' '}
          {formatMoney(p.economicImpact.challengerReward)}. Reserve credit{' '}
          {formatMoney(p.economicImpact.reserveCredit)}. Reputation delta{' '}
          {p.economicImpact.reputationDelta} from {p.economicImpact.reputationDeltaSource}.
        </p>
      ),
    },
    {
      step: 10,
      eyebrow: 'Portable receipt',
      title: 'Bondsman signed a portable receipt',
      evidenceLabel: labels.receipt,
      body: (
        <p className="text-sm text-muted">
          Schema {replay.receipt.schemaId}. Signed with the receipt key.
          Reverify any time against POST /api/receipt/{p.actionId}/verify.
        </p>
      ),
    },
  ];

  return (
    <section className="rounded-md border border-rule bg-surface p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <Label>Canonical Action 27 replay</Label>
          <h3 className="mt-1 text-lg font-semibold text-bone">
            From x402 payment to signed portable receipt
          </h3>
        </div>
        <span className="serial text-[0.62rem] text-muted">
          Source {replay.source} · generated {formatIsoUtc(replay.generatedAt)}
        </span>
      </div>

      <ol className="mt-6 space-y-4">
        {stages.map((s) => (
          <li
            key={s.step}
            className="grid gap-4 rounded-md border border-rule bg-ink p-5 sm:grid-cols-[3.25rem_1fr]"
          >
            <div>
              <div className="grid h-9 w-9 place-items-center rounded-full border border-accent/40 bg-accent/10 font-mono text-sm text-accent">
                {s.step}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="serial text-[0.6rem] text-muted">{s.eyebrow}</p>
                  <p className="mt-1 text-base font-semibold text-bone">
                    {s.title}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {s.amount && (
                    <span className="font-mono text-sm text-bone tabular">
                      {s.amount}
                    </span>
                  )}
                  {s.evidenceLabel && (
                    <StatusPill tone="info">
                      {EV_LABEL_COPY[s.evidenceLabel] ?? s.evidenceLabel}
                    </StatusPill>
                  )}
                </div>
              </div>
              {s.body && <div className="mt-3">{s.body}</div>}
              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs">
                {s.txHash && (
                  <a
                    href={txExplorer(s.txHash)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
                  >
                    Open transaction {truncateHash(s.txHash)}
                  </a>
                )}
                {s.actor && (
                  <a
                    href={accountExplorer(s.actor)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted underline decoration-rule underline-offset-4 hover:text-bone"
                  >
                    Actor {truncateHash(s.actor)}
                  </a>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
