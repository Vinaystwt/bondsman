// ReceiptPanel: the five terminal states of an on-chain receipt check,
// per Task 19's brief -- Phase 2's `/verify` route (Part1 §13) is a thin
// wrapper around this component, dispatching on the same closed
// `ReceiptStatus` union below.
//
// Tone mapping is corrected from the brief's raw sample per Checkpoint A's
// accent/consequential rules (design-system/TOKENS/tokens.css):
// - `valid`               -> `--positive`     (quiet, non-celebratory pass)
// - `malformed`           -> `--destructive`  (a verification check failing
// - `tampered`            -> `--destructive`     is an error condition about
// - `signature-failure`   -> `--destructive`     the receipt, never the
//                                                 slash-resolution moment --
//                            `--consequential` stays reserved exclusively
//                            for ResolvedSlash per PRINCIPLES.md Principle 3,
//                            and is not used anywhere in this component)
// - `unavailable`         -> `--warning`      (non-fatal: local checks
//                            already passed, only the live cross-check
//                            couldn't run)
// Each of the three destructive states gets its own header text -- they are
// not collapsed into one generic "rejected" label, matching WalletStateCard's
// "closed union, not a generic catch-all" precedent (components/WalletStateCard.tsx).
//
// The tampered case reuses `HashPill` (Task 13, components/HashPill.tsx)
// verbatim for the before/after diff pair rather than re-truncating the
// quote id inline, per this task's brief ("Read HashPill.tsx -- reuse it for
// the tampered-field diff display").
//
// No `--accent` anywhere. No `rounded-*` class -- borders are square per
// Task 11-18's convention (this system has zero curve commands).

import { HashPill } from './HashPill';

export type ReceiptStatus =
  | 'valid'
  | 'malformed'
  | 'tampered'
  | 'signature-failure'
  | 'unavailable';

type Tone = 'positive' | 'destructive' | 'warning';

const HEADER: Record<ReceiptStatus, { text: string; tone: Tone }> = {
  valid: { text: 'Receipt valid', tone: 'positive' },
  malformed: { text: 'Receipt rejected — malformed', tone: 'destructive' },
  tampered: { text: 'Receipt rejected — tampered field', tone: 'destructive' },
  'signature-failure': {
    text: 'Receipt rejected — signature failure',
    tone: 'destructive',
  },
  unavailable: {
    text: 'Local checks passed, live verification unavailable',
    tone: 'warning',
  },
};

const TONE_CLASSES: Record<Tone, string> = {
  positive: 'text-positive border-positive',
  destructive: 'text-destructive border-destructive',
  warning: 'text-warning border-warning',
};

export function ReceiptPanel({
  status,
  tamperedField,
  expected,
  actual,
}: {
  status: ReceiptStatus;
  tamperedField?: string;
  /** The value the receipt's signed payload attests to, for the tampered diff. */
  expected?: string;
  /** The value actually found on the (tampered) receipt being checked. */
  actual?: string;
}) {
  const { text, tone } = HEADER[status];

  return (
    <div
      className={`flex flex-col gap-3 border-2 bg-surface-raised p-4 ${TONE_CLASSES[tone]}`}
      data-status={status}
      data-tone={tone}
    >
      <h3 className="text-subhead text-ink font-sans">{text}</h3>

      {status === 'tampered' && tamperedField && (
        <div className="flex flex-col gap-2">
          <p className="text-data text-muted font-mono">
            Field: {tamperedField}
          </p>
          {expected && actual && (
            <dl className="flex flex-col gap-1 border-l-2 border-destructive pl-3">
              <div className="flex items-baseline gap-2">
                <dt className="text-body text-muted font-sans">Signed:</dt>
                <dd>
                  <HashPill hash={expected} />
                </dd>
              </div>
              <div className="flex items-baseline gap-2">
                <dt className="text-body text-destructive font-sans">
                  Found:
                </dt>
                <dd>
                  <HashPill hash={actual} />
                </dd>
              </div>
            </dl>
          )}
        </div>
      )}
    </div>
  );
}
