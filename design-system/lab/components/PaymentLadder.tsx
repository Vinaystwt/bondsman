// PaymentLadder: renders the 6-position payment ladder Phase 2's `/app/new`
// payment stage drives directly off backend state (Part1 §20). `PaymentState`
// is a closed union -- one variant visually distinct per position -- and
// `ORDER`/`LABEL` are exhaustive over it, so a new state can't silently
// render as a blank row.
//
// Visual treatment per position, relative to `current`:
// - positions before `current` are DONE: muted + line-through.
// - positions after `current` are UPCOMING: muted + reduced opacity, no
//   strike (they haven't happened yet, so nothing to cross out).
// - the CURRENT position is emphasised by ink weight (`text-ink font-bold`),
//   never a colour -- this corrects the brief's sample, which used
//   `text-accent` for "current". `--accent` stays reserved/unused per
//   VISUAL_LANGUAGE.md and Task 16's precedent (WalletStateCard.tsx); ink
//   weight, not a third colour, is how "this one is active" gets said here.
// - ONLY `settled` gets the confirmed/success colour (`--positive`), and only
//   when it IS the current position -- rendering `settled` as a past (done)
//   or future (upcoming) position uses the same muted treatment as every
//   other non-current state. `settled` has no special status when it isn't
//   the live position.
//
// No `--accent` anywhere. No `rounded-*` class -- square borders/no curves,
// same convention as every other Task 7+ component.

export type PaymentState =
  | 'required'
  | 'payload-prepared'
  | 'signature-received'
  | 'settlement-pending'
  | 'settled'
  | 'quote-returned';

const ORDER: PaymentState[] = [
  'required',
  'payload-prepared',
  'signature-received',
  'settlement-pending',
  'settled',
  'quote-returned',
];

const LABEL: Record<PaymentState, string> = {
  required: 'Payment required',
  'payload-prepared': 'Payment payload prepared',
  'signature-received': 'Wallet signature received',
  'settlement-pending': 'Settlement pending',
  settled: 'Payment settled',
  'quote-returned': 'Paid quote returned',
};

type Position = 'done' | 'current' | 'confirmed' | 'upcoming';

export function PaymentLadder({ current }: { current: PaymentState }) {
  const currentIndex = ORDER.indexOf(current);

  return (
    <ol className="flex flex-col gap-2" data-current={current}>
      {ORDER.map((state, i) => {
        const isDone = i < currentIndex;
        const isCurrent = i === currentIndex;
        const isConfirmed = isCurrent && state === 'settled';

        const position: Position = isConfirmed
          ? 'confirmed'
          : isCurrent
            ? 'current'
            : isDone
              ? 'done'
              : 'upcoming';

        const TONE_CLASSES: Record<Position, string> = {
          confirmed: 'text-positive font-semibold',
          current: 'text-ink font-bold',
          done: 'text-muted line-through',
          upcoming: 'text-muted opacity-50',
        };

        return (
          <li
            key={state}
            data-state={state}
            data-position={position}
            className={`text-body font-sans ${TONE_CLASSES[position]}`}
          >
            {LABEL[state]}
          </li>
        );
      })}
    </ol>
  );
}
