// Action lifecycle lab (Task 18): the 6 named lifecycle states from Part2
// deliverable 14 (Initiated, Bonded, Executed, Challenged, ResolvedSlash,
// ResolvedRefund) as a state legend, each with its own marker treatment and
// one-line copy -- distinct from Task 14's `TimelineNode` (components/
// TimelineNode.tsx), which renders one action's actual 7-node sequence
// progress (done/current/upcoming). This page is the reference legend of
// what each of the 6 named states *means* and looks like on its own, not one
// action's position within a sequence.
//
// Marker treatment per state (documented per state below): distinguished by
// fill (outline vs solid, Principle 2's "filled = real" rule), a live pulse
// (Principle 2's activity signal), and the one legitimate non-slash use of
// `--warning` (a non-fatal caution register, same as WalletStateCard's
// `rejected`/`account-changed` variants) for `Challenged`. Neither resolved
// marker uses `--consequential`: this task's brief is explicit that
// `BondValueBlock` (rendered further down this page) is "the ONE component
// where `--consequential` genuinely belongs" for this task, so the marker
// legend keeps both resolved states in plain ink, differing only by label --
// the real, genuine slash-vs-refund colour distinction (Principle 3) fires
// exactly once below, in `BondValueBlock`'s own slashed-figure column, on
// Action 27's real numbers. No `--accent` anywhere on this page. No
// `rounded-*` class anywhere.

import { BondValueBlock } from '../../components/BondValueBlock';

type LifecycleState =
  | 'Initiated'
  | 'Bonded'
  | 'Executed'
  | 'Challenged'
  | 'ResolvedSlash'
  | 'ResolvedRefund';

type MarkerTreatment = 'outline' | 'filled' | 'filled-live' | 'filled-caution' | 'split';

const ORDER: LifecycleState[] = [
  'Initiated',
  'Bonded',
  'Executed',
  'Challenged',
  'ResolvedSlash',
  'ResolvedRefund',
];

const MARKER: Record<LifecycleState, MarkerTreatment> = {
  Initiated: 'outline',
  Bonded: 'filled',
  Executed: 'filled-live',
  Challenged: 'filled-caution',
  ResolvedSlash: 'split',
  ResolvedRefund: 'split',
};

const COPY: Record<LifecycleState, string> = {
  Initiated: 'Action created; policy has priced the bond, but nothing is posted yet.',
  Bonded: 'Bond posted on-chain -- funds are now locked against this action.',
  Executed: 'Action executed; the evidence/challenge window is open.',
  Challenged: 'A watchdog has disputed the outcome; verifier review is pending.',
  ResolvedSlash: 'Verifier confirmed a fault -- the bond has split into slash and reward.',
  ResolvedRefund: 'Verifier confirmed a clean pass -- the bond has split back to the payer.',
};

// A small square marker, never a circle (this system has zero curve
// commands -- see page.tsx's own `StatusDot` in app/data-display/page.tsx).
// `outline` = not yet real (Initiated, no funds committed -- Principle 2's
// "a blueprint is a drawing of a thing, not the thing"). `filled` = real and
// settled (Bonded -- funds now genuinely posted). `filled-live` adds the
// same `animate-pulse` TimelineNode.tsx uses for its own `current` node --
// Executed opens a still-ongoing evidence/challenge window, Principle 2's
// "Live content carries a ... affordance ... because it is still changing."
// `filled-caution` steps to `--warning`, the system's dedicated "non-fatal
// caution" role (tokens.css), matching WalletStateCard's own caution
// variants -- a challenge is a real dispute, but not yet a resolved outcome.
// `split` is a two-piece marker with a visible gap between the pieces,
// reusing Principle 3's own split motif ("the block splits open along that
// same gap geometry. The split itself means 'resolved.'") for *both*
// resolved states in identical plain ink -- see the file header for why
// colour is deliberately withheld here.
function LifecycleMarker({ treatment }: { treatment: MarkerTreatment }) {
  if (treatment === 'split') {
    return (
      <span aria-hidden className="flex h-3 w-6 items-center gap-1">
        <span className="h-3 w-2.5 bg-ink" />
        <span className="h-3 w-2.5 bg-ink" />
      </span>
    );
  }
  const CLASS: Record<Exclude<MarkerTreatment, 'split'>, string> = {
    outline: 'h-3 w-3 border-2 border-muted',
    filled: 'h-3 w-3 bg-ink',
    'filled-live': 'h-3 w-3 bg-ink animate-pulse',
    'filled-caution': 'h-3 w-3 bg-warning',
  };
  return <span aria-hidden className={CLASS[treatment]} />;
}

export default function LifecyclePage() {
  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Action lifecycle</h1>
      <p style={{ maxWidth: '72ch' }}>
        The 6 named action-lifecycle states (Part2 deliverable 14), each with
        its own marker treatment and one-line copy, followed by{' '}
        <code>BondValueBlock</code> (
        <code>design-system/lab/components/BondValueBlock.tsx</code>) in its
        three possible renderings -- posted-only, a slash resolution, and a
        refund resolution -- using Action 27&apos;s real figures throughout
        (Part1 §11: <code>Posted 2,800</code> / <code>Slashed 2,520</code> /{' '}
        <code>Reward 280</code>).
      </p>

      <section className="flex flex-col gap-3">
        <h2>Lifecycle state markers</h2>
        <ol className="flex flex-col gap-4">
          {ORDER.map((state) => (
            <li
              key={state}
              data-state={state}
              className="flex items-start gap-3 border-b border-boundary pb-4 last:border-b-0"
            >
              <span className="flex h-6 items-center">
                <LifecycleMarker treatment={MARKER[state]} />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-sans font-medium text-ink">{state}</span>
                <span className="text-body font-sans text-muted">{COPY[state]}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Bond value block -- posted (in flight)</h2>
        <p style={{ maxWidth: '72ch' }}>
          No <code>resolution</code>: the bond is still a single sealed block
          -- nothing has split yet.
        </p>
        <div style={{ maxWidth: '32rem' }}>
          <BondValueBlock posted={2800} asset="csprUSD" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Bond value block -- ResolvedSlash (Action 27)</h2>
        <p style={{ maxWidth: '72ch' }}>
          Action 27&apos;s real resolution figures. Only{' '}
          <code>Slashed to reserve</code> takes <code>--consequential</code>,
          because <code>slashed &gt; 0</code> here -- reward and posted stay
          plain ink.
        </p>
        <BondValueBlock
          posted={2800}
          asset="csprUSD"
          resolution={{ slashed: 2520, reward: 280, refund: 0 }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2>Bond value block -- ResolvedRefund</h2>
        <p style={{ maxWidth: '72ch' }}>
          Same split geometry, same posted amount, plain ink throughout --{' '}
          <code>slashed</code> is <code>0</code> here, so the reserve figure
          reads <code>--muted</code>, never <code>--consequential</code>.
        </p>
        <BondValueBlock
          posted={2800}
          asset="csprUSD"
          resolution={{ slashed: 0, reward: 0, refund: 2800 }}
        />
      </section>
    </main>
  );
}
