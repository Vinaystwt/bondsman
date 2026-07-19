import { Label } from '@/components/ui/Primitives';
import CopyHash from '@/components/ui/CopyHash';
import Money from '@/components/ui/Money';
import {
  formatIsoUtc,
  formatWcspr,
  truncateHash,
  txExplorer,
} from '@/lib/format';
import type { CanonicalProof, PortableReceipt } from '@/lib/types';

interface Step {
  label: string;
  actor: string;
  when: string | null;
  detail: React.ReactNode;
  tx?: string | null;
  evidenceRoot?: string;
  slash?: boolean;
}

interface Props {
  proof: CanonicalProof;
  receipt: PortableReceipt | null;
  receiptValid: boolean | null;
}

export default function CanonicalTimeline({ proof, receipt, receiptValid }: Props) {
  const initiate = proof.timeline.find((s) => s.stage === 'initiate');
  const bondStage = proof.timeline.find((s) => s.stage === 'bond_posted');
  const execute = proof.timeline.find((s) => s.stage === 'execute');
  const evidence = proof.timeline.find((s) => s.stage === 'evidence_arrived');
  const challenge = proof.timeline.find((s) => s.stage === 'challenge');
  const resolve = proof.timeline.find((s) => s.stage === 'resolve');

  const steps: Step[] = [
    {
      label: 'x402 payment settled',
      actor: 'external agent',
      when: null,
      detail: proof.payment ? (
        <p>
          <span className="font-mono">{formatWcspr(proof.payment.paymentAmount)}</span>{' '}
          on {proof.payment.network} through{' '}
          <span className="font-mono text-bone">{proof.payment.facilitator}</span>.
        </p>
      ) : (
        'x402 settlement details unavailable.'
      ),
      tx: proof.payment?.settlementTransaction ?? null,
    },
    {
      label: 'Paid quote issued',
      actor: 'bondsman gate',
      when: proof.paidQuote?.issuedAt ?? null,
      detail: proof.paidQuote ? (
        <p>
          Verifier {' '}
          <span className="font-mono text-bone">{proof.paidQuote.verifier}</span>{' '}
          issued a single-use quote for a{' '}
          <span className="font-mono text-bone">{proof.paidQuote.actionType}</span>{' '}
          bounded by a{' '}
          <span className="font-mono text-bone">
            {proof.paidQuote.challengeWindow}s
          </span>{' '}
          challenge window.
        </p>
      ) : (
        'Paid quote unavailable.'
      ),
    },
    {
      label: 'Paid quote consumed',
      actor: 'approver',
      when: proof.paidQuote?.consumedAt ?? null,
      detail: proof.paidQuote?.consumedActionId ? (
        <p>
          Consumed by action{' '}
          <span className="font-mono text-bone">
            No. {String(proof.paidQuote.consumedActionId).padStart(4, '0')}
          </span>
          . Quote status{' '}
          <span className="font-mono text-bone">{proof.paidQuote.status}</span>.
        </p>
      ) : (
        'Quote consumption not recorded.'
      ),
    },
    {
      label: 'Action initiated',
      actor: 'approver',
      when: initiate?.at ?? null,
      detail: (
        <p>
          The approver committed the action and the reasoning hash on chain.
          Value at risk{' '}
          <span className="font-mono text-bone">
            <Money atomic={proof.valueAtRisk} />
          </span>
          .
        </p>
      ),
      tx: initiate?.txHash ?? null,
    },
    {
      label: 'Bond posted',
      actor: 'approver',
      when: bondStage?.at ?? null,
      detail: (
        <p>
          Risk-priced bond of{' '}
          <span className="font-mono text-bone">
            <Money atomic={proof.bond} />
          </span>{' '}
          locked in the bond vault.
        </p>
      ),
      tx: bondStage?.txHash ?? null,
    },
    {
      label: 'Payout executed',
      actor: 'approver',
      when: execute?.at ?? null,
      detail: (
        <p>
          The contract released the payout for the invoice action. The
          challenge window opened.
        </p>
      ),
      tx: execute?.txHash ?? null,
    },
    {
      label: 'Signed contradiction arrived',
      actor: 'buyer signer',
      when: evidence?.at ?? null,
      detail: proof.deliveryAttestation ? (
        <div className="space-y-1">
          <p>
            Event{' '}
            <span className="font-mono text-bone">
              {proof.deliveryAttestation.eventType}
            </span>
            {'. '}Signed by the buyer key and verified by the on-chain verifier.
          </p>
          <p className="text-xs text-muted">
            Occurred {formatIsoUtc(proof.deliveryAttestation.occurredAt)} · Received{' '}
            {formatIsoUtc(proof.deliveryAttestation.receivedAt)}
          </p>
        </div>
      ) : (
        'Delivery contradiction unavailable.'
      ),
      evidenceRoot: proof.deliveryAttestation?.evidenceRoot ?? proof.faultCondition.evidenceRoot,
    },
    {
      label: 'Watchdog challenged',
      actor: 'watchdog',
      when: challenge?.at ?? null,
      detail: (
        <p>
          The independent watchdog observed the signed contradiction, matched
          the executed action, and submitted the challenge. The challenge did
          not require an operator instruction.
        </p>
      ),
      tx: challenge?.txHash ?? null,
    },
    {
      label: 'Contract resolved',
      actor: 'controller',
      when: resolve?.at ?? null,
      detail: (
        <p>
          The controller verified the signed contradiction against the
          executed action, then routed the resolution.
        </p>
      ),
      tx: resolve?.txHash ?? null,
    },
    {
      label: 'Bond slashed',
      actor: 'controller',
      when: null,
      detail: (
        <p>
          Bond of{' '}
          <span className="font-mono text-slash">
            <Money atomic={proof.bond} />
          </span>{' '}
          split. Challenger paid{' '}
          <span className="font-mono text-bone">
            <Money atomic={proof.economicImpact.challengerReward} />
          </span>
          . Reserve credited{' '}
          <span className="font-mono text-bone">
            <Money atomic={proof.economicImpact.reserveCredit} />
          </span>
          .
        </p>
      ),
      tx: proof.economicImpact.resolutionEventTransaction,
      slash: true,
    },
    {
      label: 'Portable receipt issued and verified',
      actor: 'receipt signer',
      when: receipt?.issuedAt ?? null,
      detail: (
        <p>
          Receipt schema{' '}
          <span className="font-mono text-bone">
            {receipt?.schemaId ?? 'bondsman.portable-receipt.golden-path.v2'}
          </span>
          .{' '}
          {receiptValid === true
            ? 'Signature verified by /api/receipt/27/verify.'
            : receiptValid === false
            ? 'Signature failed verification.'
            : 'Signature verification unavailable.'}
        </p>
      ),
    },
  ];

  return (
    <section aria-label="Chronological proof rail" className="space-y-3">
      <div>
        <Label>Chronological rail</Label>
        <p className="mt-1 text-sm text-muted">
          Eleven steps from payment to portable receipt. Each linked transaction
          opens on the Casper testnet explorer.
        </p>
      </div>
      <ol className="relative space-y-4 border-l border-rule pl-6">
        {steps.map((s, i) => (
          <li key={i} className="relative">
            <span
              aria-hidden="true"
              className={`absolute -left-[27px] top-2 grid h-3 w-3 place-items-center rounded-full border ${
                s.slash
                  ? 'border-slash bg-ink'
                  : 'border-accent bg-ink'
              }`}
            >
              <span
                className={`h-1 w-1 rounded-full ${
                  s.slash ? 'bg-slash' : 'bg-accent'
                }`}
              />
            </span>
            <div className="rounded-md border border-rule bg-surface px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="serial text-[0.58rem] text-muted">
                    Step {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-sm font-semibold text-bone">{s.label}</h3>
                  <span className="text-[0.68rem] uppercase tracking-wider text-muted">
                    {s.actor}
                  </span>
                </div>
                {s.when && (
                  <span className="text-xs text-muted">
                    {formatIsoUtc(s.when)}
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm leading-relaxed text-muted">
                {s.detail}
              </div>
              {(s.tx || s.evidenceRoot) && (
                <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-rule pt-2 text-xs">
                  {s.tx && (
                    <span className="flex items-center gap-1.5 text-muted">
                      Transaction
                      <CopyHash
                        value={s.tx}
                        href={txExplorer(s.tx)}
                        label={truncateHash(s.tx)}
                      />
                    </span>
                  )}
                  {s.evidenceRoot && (
                    <span className="flex items-center gap-1.5 text-muted">
                      Evidence root
                      <CopyHash
                        value={s.evidenceRoot}
                        label={truncateHash(s.evidenceRoot)}
                      />
                    </span>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
