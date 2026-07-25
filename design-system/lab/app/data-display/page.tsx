// Data display atoms lab: HashPill (short truntacted + long/full-value
// wrap), CopyControl (button + inline variants), badge, tag, tooltip, status
// dot, plus (Task 14) TransactionRow, TimelineNode, and the three tables +
// full lifecycle timeline built from them.
//
// HashPill, CopyControl, TransactionRow, and TimelineNode are imported from
// components/ (Task 13's two reusable files plus Task 14's two, all reused
// verbatim by Phase 2's `/app/actions/[id]` monitor and receipt pages per
// each task's brief). Badge, Tag, Tooltip, and StatusDot are not in either
// task's "Create" file list, so they stay page-local here, in the same
// spirit as forms/page.tsx's local `Caption`/`*Demo` helpers -- simple
// presentational pieces that later tasks are free to lift into components/
// if a real reuse need shows up, rather than speculatively exporting a shape
// no one has asked for yet.
//
// No `--accent` anywhere on this page: every affordance below reads through
// `--ink`/`--boundary`/`--muted`, the quiet `--positive` role, or (for the
// one destructive-adjacent example) `--destructive` -- never `--accent`. No
// `rounded-*` class appears anywhere, matching Task 11/12's convention of
// using plain `border` even though `--radius` itself resolves to `0px`.
//
// `--consequential` (reserved exclusively for the slash moment, PRINCIPLES.md
// Principle 3) appears exactly once on this page, in the "Slash economics"
// figure and the matching outcome badge inside the Task 14 tables below --
// the genuine ResolvedSlash context for Action 27, Part1's canonical
// example. It does not appear on Action 26's refund, Action 28's still-open
// row, the verifier registry, or anywhere in the lifecycle timeline (whose
// `complete`/`current`/`upcoming` states read through `--positive`/`--ink`/
// `--muted` only, per Task 14's own brief: "Timeline 'current' state ...
// ink-weight or --positive, not accent").

import type { ReactNode } from 'react';
import { HashPill } from '../../components/HashPill';
import { CopyControl } from '../../components/CopyControl';
import { TransactionRow } from '../../components/TransactionRow';
import { TimelineNode } from '../../components/TimelineNode';

// ---- Sample identifiers -------------------------------------------------
// Lengths deliberately mirror RESPONSIVE.md §3's own examples: a short
// verifier-tier code (<= 20 chars, never truncated), a 42-character deployed
// verifier address, and a 66-character settlement tx hash (both > 20 chars,
// both truncate to the fixed 6+4 form).
const SHORT_CODE = '0xA1B2C3'; // 8 characters -- renders in full, no truncation
const VERIFIER_ADDRESS = '0x71C7656EC7ab88b098defB751B7401B5f6d8976'; // 42 characters
const SETTLEMENT_TX_HASH =
  '0x7f3a91d4c8e0b2a6f159d3c7e8b4a0f2d6c9e1b3a5f7d9c1e3b5a7f9d1c3e5b7'; // 66 characters

// ---- Task 14 sample data --------------------------------------------------
// Action 27 is Part1's canonical example throughout this design system:
// ResolvedSlash, `Posted 2,800` / `Slashed 2,520 to reserve` / `Reward 280 to
// challenger` (PRINCIPLES.md Principle 1, RESPONSIVE.md §3). The transaction
// hashes below are real-shaped (64 hex characters, the length of a Casper
// deploy hash) but are deterministic sample values, not live chain data --
// `SETTLEMENT_TX_HASH` above (already the page's own example) is reused
// verbatim as Action 27's ResolvedSlash settlement tx, and `VERIFIER_ADDRESS`
// above is reused as the `uptime-verifier` registry row, so the ledger and
// registry tables below read as one continuous example rather than
// introducing disconnected new hashes for their own sake.
const BOND_TX_HASH = '1abf6c665a43977c714738bf12b272b56d0f42a10c0a991c0c5a83d877b08fe3';
const EXEC_TX_HASH = 'e1641b933d082997f16599d29947111411a46694e604a09a5a03adf8c33412fb';
const EVIDENCE_TX_HASH = 'cb5a7019d575b7a60d274d83eaf27bff50d2de9c47cf01f96d142322fe69b9b3';
const CHALLENGE_TX_HASH = 'e5192e9fc4c499bf18e3c4093fc2988212c76ba4bde51db78c6a6322eaa1f51f';
const RECEIPT_HASH = 'e04a0a3297737934fcad42686d488b07238c0fce2f6d18174a515f03c7ef29ef';

const LATENCY_VERIFIER_ADDRESS = '0x5a475d43ceb3af17c9b7e8a1112b8d946a2d9318';
const DELIVERY_VERIFIER_ADDRESS = '0x230ad4fbbb92dd27f3e68bdca2618783b603d176';

const ACTION_26_SETTLEMENT_HASH =
  '0xb36cb8b5b530ce49a228c2a7d30149ccc77168b226d0e8ca556e352d580aa5e9';
const ACTION_28_LATEST_HASH =
  '0x2723af3f35e7c8022ab18a245f9e3c35b529a8076464a36fe59b73800c29c434';

// ---- Full-value hash block ----------------------------------------------
// RESPONSIVE.md §3: "where a screen does show a full hash, it wraps inside
// its own monospace block at a fixed 40 characters per line (breaking only
// at hex-pair boundaries, never mid-byte) rather than overflowing or
// shrinking type size, and still carries the copy control." This is a
// distinct, explicitly-opted-into rendering (e.g. a future /proof/27) --
// HashPill itself never expands into this form, per the same section
// ("a hash pill does not 'expand' into the full string at wider viewports").
//
// Every line renders exactly 40 displayed characters: the first line is
// `0x` + 38 hex characters (40 displayed characters total), every
// subsequent line is 40 hex characters. 38 and 40 are both even, so every
// break lands on a hex-pair (byte) boundary, never mid-byte, and no line's
// character count ever varies -- which is what keeps the block from
// overflowing a narrow mobile viewport without shrinking the type size or
// relying on a horizontal-scroll escape hatch.
const FULL_HASH_FIRST_LINE_HEX_CHARS = 38;
const FULL_HASH_LINE_CHARS = 40;

function chunkFullHash(hash: string): string[] {
  const hex = hash.startsWith('0x') ? hash.slice(2) : hash;
  const lines = [`0x${hex.slice(0, FULL_HASH_FIRST_LINE_HEX_CHARS)}`];
  for (let i = FULL_HASH_FIRST_LINE_HEX_CHARS; i < hex.length; i += FULL_HASH_LINE_CHARS) {
    lines.push(hex.slice(i, i + FULL_HASH_LINE_CHARS));
  }
  return lines;
}

function FullHashBlock({ hash }: { hash: string }) {
  const lines = chunkFullHash(hash);
  return (
    <div className="flex max-w-full flex-col items-start gap-2">
      <div className="max-w-full border border-boundary bg-surface-raised p-2 font-mono text-mono text-ink">
        {lines.map((line, i) => (
          <div key={i} className="[overflow-wrap:anywhere]">
            {line}
          </div>
        ))}
      </div>
      <CopyControl value={hash} variant="button" />
    </div>
  );
}

// ---- Badge ---------------------------------------------------------------
// A static, non-interactive label for a settled fact about an item (e.g. a
// policy's status). Small-caps annotation register (VISUAL_LANGUAGE.md /
// RESPONSIVE.md §3's caption rule, <= 40 characters, single line, never
// wraps) rather than body prose. `tone="positive"` was Task 13's one
// non-neutral variant -- tokens.css's own `--positive` comment ("quiet,
// non-celebratory... a passed check, not a fanfare") is exactly the register
// a status label like "Verified" needs, so it steps to that ink-adjacent
// green rather than `--accent`.
//
// Task 14 adds `tone="consequential"`, used at exactly one call site below:
// the "ResolvedSlash" outcome badge in the recent-actions table, for Action
// 27 -- the one genuine slash on this page (PRINCIPLES.md Principle 3:
// "if it appears anywhere on screen, real economic slashing happened").
// Every other outcome on this page (Action 26's refund, Action 28's still-
// open row) stays on `neutral`/`positive`, never this tone.
type BadgeTone = 'neutral' | 'positive' | 'consequential';

const BADGE_TONE_CLASS: Record<BadgeTone, string> = {
  neutral: 'border-boundary text-ink',
  positive: 'border-positive text-positive',
  consequential: 'border-consequential text-consequential',
};

function Badge({ tone = 'neutral', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={[
        'inline-flex items-center border bg-surface-raised px-2 py-0.5 text-data font-sans uppercase tracking-wide',
        BADGE_TONE_CLASS[tone],
      ].join(' ')}
      style={{ fontSize: '0.7rem' }}
    >
      {children}
    </span>
  );
}

// ---- Tag ------------------------------------------------------------------
// A plain-weight identifier/category chip -- deliberately distinct from
// Badge: body-case text (not small-caps annotation), used to label a thing
// (a policy category, a verifier kind) rather than announce a status. Same
// ink/boundary chrome as everything else on this page; no accent.
function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center border border-boundary bg-surface px-2 py-0.5 text-body text-ink font-sans">
      {children}
    </span>
  );
}

// ---- Tooltip ---------------------------------------------------------------
// Pure-CSS tooltip (no JS/state needed, so no `use client`): a `group`
// wrapper reveals an absolutely-positioned label on `:hover` and, for
// keyboard users, on `:focus-within` of the trigger inside it. The trigger
// itself must be a real focusable element for `focus-within` to fire, so
// call sites pass a `<button>`/link/interactive child, never a plain span.
function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-10 mt-2 -translate-x-1/2 whitespace-nowrap border border-ink bg-ink px-2 py-1 text-data text-surface-raised opacity-0 transition-opacity duration-short ease-standard group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {label}
      </span>
    </span>
  );
}

// ---- Status dot -------------------------------------------------------------
// A small solid square, not a circle: this system has zero curve commands
// (tokens.css: "Corners are cut (chamfered), not rounded") and Task 11/12
// avoid `rounded-*` entirely, so a literal round "dot" would be the one
// uncut curve on the page. `live` reads through `--positive` -- the brief's
// instruction is explicit that an active/live state must stay "quiet, not
// celebratory... not accent, not consequential (reserved for slash only)",
// which is exactly what tokens.css's own comment on `--positive` describes.
// `inert` steps down to `--muted`, the same neutral ramp Button.tsx's
// disabled state and Field.tsx's help text already use for "this is present
// but not active."
type StatusDotTone = 'live' | 'inert';

const STATUS_DOT_CLASS: Record<StatusDotTone, string> = {
  live: 'bg-positive',
  inert: 'bg-muted',
};

function StatusDot({ tone, label }: { tone: StatusDotTone; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-body text-ink font-sans">
      <span aria-hidden className={['h-2 w-2', STATUS_DOT_CLASS[tone]].join(' ')} />
      {label}
    </span>
  );
}

// ---- Table header cell (Task 14) ------------------------------------------
// Shared by all three tables below. Small-caps annotation register (same
// uppercase/tracking treatment as Badge, RESPONSIVE.md §3's caption rule --
// each header word is well under the 40-character cap), muted so the ink-
// weight budget stays with the data rows themselves.
function Th({ children }: { children: ReactNode }) {
  return (
    <th
      className="border-b border-boundary py-2 pr-4 text-left font-sans text-muted uppercase tracking-wide"
      style={{ fontSize: '0.7rem' }}
    >
      {children}
    </th>
  );
}

export default function DataDisplayPage() {
  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Data display</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>HashPill</code> and <code>CopyControl</code> (
        <code>design-system/lab/components/</code>) plus four page-local atoms --
        badge, tag, tooltip, status dot. Truncation follows{' '}
        <code>RESPONSIVE.md</code> §3&apos;s identifier-monospace rule exactly:
        &le; 20 characters render in full; &gt; 20 characters truncate to{' '}
        <code>0x</code> + 6 hex characters + <code>…</code> + 4 hex characters,
        paired with a copy control that always copies the untruncated value. No
        <code> --accent</code> is used anywhere on this page.
      </p>

      <section className="flex flex-col gap-3">
        <h2>Hash pill -- short form (&le; 20 chars, no truncation)</h2>
        <p style={{ maxWidth: '72ch' }}>
          A short verifier-tier code is rendered in full; a copy control is still
          offered but is not mandatory at this length per <code>RESPONSIVE.md</code>.
        </p>
        <HashPill hash={SHORT_CODE} />
      </section>

      <section className="flex flex-col gap-3">
        <h2>Hash pill -- truncated form (&gt; 20 chars)</h2>
        <p style={{ maxWidth: '72ch' }}>
          Both examples exceed the 20-character threshold and truncate to the
          fixed <code>0x</code> + 6 + <code>…</code> + 4 form, at every viewport
          width -- this is a legibility rule, not a mobile-only space saver, so
          the same markup below never changes at wider viewports.
        </p>
        <div className="flex flex-col items-start gap-3">
          <div className="flex flex-col gap-1">
            <HashPill hash={VERIFIER_ADDRESS} />
            <span className="text-data text-muted font-sans" style={{ fontSize: '0.75rem' }}>
              42-character verifier address, no link
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <HashPill hash={SETTLEMENT_TX_HASH} href="https://cspr.live/deploy/example" />
            <span className="text-data text-muted font-sans" style={{ fontSize: '0.75rem' }}>
              66-character settlement tx hash, with cspr.live link
            </span>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Hash pill -- long/full-value form (mobile-width wrap)</h2>
        <p style={{ maxWidth: '72ch' }}>
          A distinct, explicitly-opted-into rendering (<code>RESPONSIVE.md</code>{' '}
          §3) for screens whose whole point is an inspectable full hash -- the
          hash pill above never expands into this form. Each line is a fixed 40
          displayed characters, breaking only at hex-pair boundaries, so this
          block never overflows its container even at the narrowest mobile
          width and never shrinks its type size to fit.
        </p>
        <FullHashBlock hash={SETTLEMENT_TX_HASH} />
      </section>

      <section className="flex flex-col gap-3">
        <h2>Copy control -- button and inline variants</h2>
        <p style={{ maxWidth: '72ch' }}>
          <code>inline</code> (the default, used inside <code>HashPill</code>)
          sits flush against surrounding monospace text with no box of its own.{' '}
          <code>button</code> is a standalone control with its own border, for
          use next to a plain identifier with no pill around it. Both use{' '}
          <code>--positive</code>, never <code>--accent</code>, for the brief
          &quot;copied&quot; confirmation.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <span className="inline-flex items-center gap-2 font-mono text-mono text-ink">
            {SHORT_CODE}
            <CopyControl value={SHORT_CODE} variant="inline" />
          </span>
          <CopyControl value={SHORT_CODE} variant="button" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Badge</h2>
        <p style={{ maxWidth: '72ch' }}>
          Small-caps status label for a settled fact about an item. Neutral by
          default; <code>positive</code> steps to the quiet, non-celebratory{' '}
          <code>--positive</code> role for a state like &quot;verified&quot; --
          never <code>--accent</code>, never <code>--consequential</code>.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Draft</Badge>
          <Badge tone="positive">Verified</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Tag</h2>
        <p style={{ maxWidth: '72ch' }}>
          Body-weight identifier/category chip -- labels a thing, not a status,
          so it stays un-uppercased and reads as content rather than chrome.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Tag>uptime-verifier</Tag>
          <Tag>policy-a</Tag>
          <Tag>7-day window</Tag>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Tooltip</h2>
        <p style={{ maxWidth: '72ch' }}>
          Pure CSS, no JS: reveals on real <code>:hover</code> and, for keyboard
          users, on <code>:focus-within</code> of the trigger. Try tabbing to
          the button below instead of hovering it.
        </p>
        <Tooltip label="Copies the untruncated hash to your clipboard">
          <button
            type="button"
            className="border border-boundary bg-surface-raised px-2 py-1 text-body text-ink font-sans focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Hover or focus me
          </button>
        </Tooltip>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Status dot</h2>
        <p style={{ maxWidth: '72ch' }}>
          A solid square, not a circle -- this system has zero curve commands,
          so a round dot would be the one uncut curve on the page.{' '}
          <code>live</code> uses the quiet <code>--positive</code> role (never{' '}
          <code>--accent</code>, never the slash-only <code>--consequential</code>
          );
          <code> inert</code> steps down to <code>--muted</code>.
        </p>
        <div className="flex flex-wrap items-center gap-6">
          <StatusDot tone="live" label="Verifier live" />
          <StatusDot tone="inert" label="Verifier inactive" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Transaction ledger -- Action 27</h2>
        <p style={{ maxWidth: '72ch' }}>
          <code>TransactionRow</code> (<code>design-system/lab/components/</code>)
          renders one on-chain event per row, using <code>HashPill</code> for the
          hash column. This is Action 27&apos;s full ledger, Part1&apos;s canonical
          example: a <code>ResolvedSlash</code> outcome. Its slash economics, per
          Principle 1 and <code>RESPONSIVE.md</code> §3, are auditable tabular
          figures that are never truncated -- only the slashed portion below
          takes the <code>--consequential</code> accent (Principle 3); the
          posted and reward figures stay in plain ink.
        </p>
        <p className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <span className="text-data font-mono tabular-nums text-ink">Posted 2,800</span>
          <span className="text-data font-mono tabular-nums text-consequential">
            Slashed 2,520 to reserve
          </span>
          <span className="text-data font-mono tabular-nums text-ink">
            Reward 280 to challenger
          </span>
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Type</Th>
              <Th>Hash</Th>
              <Th>Block</Th>
              <Th>Timestamp</Th>
            </tr>
          </thead>
          <tbody>
            <TransactionRow
              type="Bonded"
              hash={BOND_TX_HASH}
              block={4812203}
              timestamp="21 Mar 2026, 09:12 UTC"
              cspLiveHref={`https://cspr.live/deploy/${BOND_TX_HASH}`}
            />
            <TransactionRow
              type="Executed"
              hash={EXEC_TX_HASH}
              block={4812207}
              timestamp="21 Mar 2026, 09:14 UTC"
              cspLiveHref={`https://cspr.live/deploy/${EXEC_TX_HASH}`}
            />
            <TransactionRow
              type="Evidence submitted"
              hash={EVIDENCE_TX_HASH}
              block={4813950}
              timestamp="24 Mar 2026, 16:41 UTC"
              cspLiveHref={`https://cspr.live/deploy/${EVIDENCE_TX_HASH}`}
            />
            <TransactionRow
              type="Challenged"
              hash={CHALLENGE_TX_HASH}
              block={4814102}
              timestamp="25 Mar 2026, 08:03 UTC"
              cspLiveHref={`https://cspr.live/deploy/${CHALLENGE_TX_HASH}`}
            />
            <TransactionRow
              type="ResolvedSlash"
              hash={SETTLEMENT_TX_HASH}
              block={4815677}
              timestamp="27 Mar 2026, 19:22 UTC"
              cspLiveHref={`https://cspr.live/deploy/${SETTLEMENT_TX_HASH}`}
            />
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Verifier registry</h2>
        <p style={{ maxWidth: '72ch' }}>
          Deployed verifiers, each a 42-character address (
          <code>RESPONSIVE.md</code> §3&apos;s own example length) truncated
          through <code>HashPill</code>. <code>uptime-verifier</code> reuses the
          same address already shown above in the truncated-form example, so
          this table and that one describe the same deployed contract.
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Verifier</Th>
              <Th>Address</Th>
              <Th>Status</Th>
              <Th>Bonds checked</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-boundary">
              <td className="py-2 pr-4">
                <Tag>uptime-verifier</Tag>
              </td>
              <td className="py-2 pr-4">
                <HashPill hash={VERIFIER_ADDRESS} />
              </td>
              <td className="py-2 pr-4">
                <StatusDot tone="live" label="Live" />
              </td>
              <td className="py-2 text-data font-mono tabular-nums text-muted">
                1,204
              </td>
            </tr>
            <tr className="border-b border-boundary">
              <td className="py-2 pr-4">
                <Tag>latency-verifier</Tag>
              </td>
              <td className="py-2 pr-4">
                <HashPill hash={LATENCY_VERIFIER_ADDRESS} />
              </td>
              <td className="py-2 pr-4">
                <StatusDot tone="live" label="Live" />
              </td>
              <td className="py-2 text-data font-mono tabular-nums text-muted">892</td>
            </tr>
            <tr className="border-b border-boundary">
              <td className="py-2 pr-4">
                <Tag>delivery-verifier</Tag>
              </td>
              <td className="py-2 pr-4">
                <HashPill hash={DELIVERY_VERIFIER_ADDRESS} />
              </td>
              <td className="py-2 pr-4">
                <StatusDot tone="inert" label="Inactive" />
              </td>
              <td className="py-2 text-data font-mono tabular-nums text-muted">356</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Recent actions</h2>
        <p style={{ maxWidth: '72ch' }}>
          Three settled/in-progress actions around Action 27. Outcome uses{' '}
          <code>Badge</code>; <code>tone=&quot;consequential&quot;</code> appears
          exactly once, on Action 27&apos;s own <code>ResolvedSlash</code> row --
          Action 26&apos;s refund and Action 28&apos;s still-open row stay on{' '}
          <code>positive</code>/<code>neutral</code>.
        </p>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th>Action</Th>
              <Th>Outcome</Th>
              <Th>Amounts</Th>
              <Th>Latest tx</Th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-boundary">
              <td className="py-2 pr-4 text-mono tabular-nums font-mono text-ink">#26</td>
              <td className="py-2 pr-4">
                <Badge tone="positive">ResolvedRefund</Badge>
              </td>
              <td className="py-2 pr-4 text-data font-mono tabular-nums text-ink">
                Posted 1,400
              </td>
              <td className="py-2">
                <HashPill
                  hash={ACTION_26_SETTLEMENT_HASH}
                  href={`https://cspr.live/deploy/${ACTION_26_SETTLEMENT_HASH}`}
                />
              </td>
            </tr>
            <tr className="border-b border-boundary">
              <td className="py-2 pr-4 text-mono tabular-nums font-mono text-ink">#27</td>
              <td className="py-2 pr-4">
                <Badge tone="consequential">ResolvedSlash</Badge>
              </td>
              <td className="py-2 pr-4 text-data font-mono tabular-nums text-ink">
                Slashed 2,520 &middot; Reward 280
              </td>
              <td className="py-2">
                <HashPill
                  hash={SETTLEMENT_TX_HASH}
                  href={`https://cspr.live/deploy/${SETTLEMENT_TX_HASH}`}
                />
              </td>
            </tr>
            <tr className="border-b border-boundary">
              <td className="py-2 pr-4 text-mono tabular-nums font-mono text-ink">#28</td>
              <td className="py-2 pr-4">
                <Badge>Evidence window</Badge>
              </td>
              <td className="py-2 pr-4 text-data font-mono tabular-nums text-ink">
                Posted 3,200
              </td>
              <td className="py-2">
                <HashPill
                  hash={ACTION_28_LATEST_HASH}
                  href={`https://cspr.live/deploy/${ACTION_28_LATEST_HASH}`}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Lifecycle timeline -- Action 27</h2>
        <p style={{ maxWidth: '72ch' }}>
          <code>TimelineNode</code> (<code>design-system/lab/components/</code>)
          rendered in the exact 7-node order Part1 §22 specifies. Action 27 is
          fully resolved, so every node below is <code>complete</code>; the
          hashes attached to <code>Bonded</code> through <code>Receipt
          sealed</code> are the same transactions shown in the ledger table
          above.
        </p>
        <ol className="flex flex-col">
          <TimelineNode label="Initiated" status="complete" />
          <TimelineNode label="Bonded" status="complete" hash={BOND_TX_HASH} />
          <TimelineNode label="Executed" status="complete" hash={EXEC_TX_HASH} />
          <TimelineNode
            label="Evidence window"
            status="complete"
            hash={EVIDENCE_TX_HASH}
          />
          <TimelineNode label="Challenged" status="complete" hash={CHALLENGE_TX_HASH} />
          <TimelineNode
            label="ResolvedSlash"
            status="complete"
            hash={SETTLEMENT_TX_HASH}
          />
          <TimelineNode label="Receipt sealed" status="complete" hash={RECEIPT_HASH} />
        </ol>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Timeline node -- status states</h2>
        <p style={{ maxWidth: '72ch' }}>
          The same three statuses on a still-open action (Action 28), isolated
          to show all three side by side: <code>complete</code> reads through
          the quiet <code>--positive</code> role, <code>current</code> is a
          pulsing <code>--ink</code> marker (ink weight plus motion, never{' '}
          <code>--accent</code>), and <code>upcoming</code> steps down to{' '}
          <code>--muted</code> at reduced opacity.
        </p>
        <ol className="flex flex-col">
          <TimelineNode label="Executed" status="complete" />
          <TimelineNode label="Evidence window" status="current" />
          <TimelineNode label="Receipt sealed" status="upcoming" />
        </ol>
      </section>
    </main>
  );
}
