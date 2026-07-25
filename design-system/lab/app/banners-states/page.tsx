// Banners, empty/loading/error/degraded states lab (Task 21): `Banner`
// (design-system/lab/components/Banner.tsx) in its 3 tones, `Skeleton`
// (design-system/lab/components/Skeleton.tsx) in its 4 shapes, 4 distinct
// empty states, and 3 distinct error-state presentations (inline /
// per-stage-card / full-page). Phase 2's degraded-backend banner (Part1 §7,
// "the frontend must never lie about degraded backend") and every route's
// loading state reuse these two components directly.
//
// PRINCIPLES.md Principle 5 ("Motion stops at the edge of trouble") is the
// organising constraint for the error/degraded half of this page: every
// example below that renders error or degraded data is a static frame with
// zero `transition-*`/`animate-*` classes. In particular, the retry
// affordances in the error-state section deliberately do NOT reuse
// `Button.tsx` — Principle 5's own "Rules out" list bans "any hover ...
// motion applied to a component that is currently rendering stale,
// disconnected, or error data, even if that motion is otherwise standard
// for that component type when healthy," and `Button.tsx` carries a
// `transition-[box-shadow,color,background-color,border-color,transform]`
// class plus a hover ring for every variant. `StaticControl` below is a
// deliberately inert substitute — same visual weight, no transition, no
// hover state, focus-visible outline only (a required a11y affordance, not
// an animation) — used only inside frames that are currently showing error
// data. `Button` itself is reused normally in the (non-degraded) empty-state
// section, where ordinary interactive motion is unproblematic.
//
// Tone-to-token mapping (see Banner.tsx's own header comment for the full
// reasoning): `error` is `--destructive`, never `--consequential` — a
// degraded backend or a failed request is not the slash moment (Principle
// 3). No `--accent` anywhere on this page. No `rounded-*` class.

import type { ReactNode } from 'react';
import { Banner } from '../../components/Banner';
import { Skeleton, type SkeletonShape } from '../../components/Skeleton';
import { Button } from '../../components/Button';
import { Field } from '../../components/Field';
import { HashPill } from '../../components/HashPill';

const SKELETON_SHAPES: SkeletonShape[] = ['table', 'timeline', 'tile', 'inline'];

// The one static, non-transitioning control used inside error/degraded
// frames (see header comment). Not exported — this page is the only place
// that needs a motion-free retry affordance, so it stays local rather than
// becoming a fourth component this task wasn't asked to produce.
function StaticControl({ children }: { children: ReactNode }) {
  return (
    <button
      type="button"
      className="border border-boundary bg-surface-raised px-3 py-1 text-body font-sans text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {children}
    </button>
  );
}

export default function BannersStatesPage() {
  return (
    <main className="flex flex-col gap-10">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Banners, empty, loading, error, degraded states</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>Banner</code> (
        <code>design-system/lab/components/Banner.tsx</code>) and{' '}
        <code>Skeleton</code> (
        <code>design-system/lab/components/Skeleton.tsx</code>), followed by
        four distinct empty states and three distinct error-state
        presentations. Everything past the Skeleton section that is showing
        degraded or error data renders as a static frame — no shimmer, no
        spinner, no hover motion — per PRINCIPLES.md Principle 5.
      </p>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2>Banner tones</h2>
        <p style={{ maxWidth: '72ch' }}>
          <code>info</code> is <code>role=&quot;status&quot;</code> (polite);{' '}
          <code>degraded</code> and <code>error</code> are both{' '}
          <code>role=&quot;alert&quot;</code> (assertive) — a quietly degraded
          backend is still something the user must not miss. The degraded
          example below carries the Part1 §22 &quot;as of&quot; annotation
          for stale data, in a monospace, tabular-figure treatment (Principle
          1: a timestamp the user could check against the real clock is a
          data value, not prose). None of the three has a transition or
          animation class — read <code>Banner.tsx</code> itself to confirm.
        </p>
        <div className="flex flex-col gap-3">
          <Banner tone="info">
            Verifier registry updated — 3 new adapters are available for
            selection on the template picker.
          </Banner>
          <Banner tone="degraded">
            Backend is degraded — serving the last known policy snapshot
            instead of a live quote.{' '}
            <span className="font-mono text-data tabular-nums text-muted">
              As of 14:32:07 UTC
            </span>
            .
          </Banner>
          <Banner tone="error">
            Settlement submission failed — the network rejected the
            transaction. No funds moved.
          </Banner>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2>Skeleton shapes</h2>
        <p style={{ maxWidth: '72ch' }}>
          All 4 <code>shape</code> values. Each bar carries{' '}
          <code>motion-safe:animate-pulse motion-reduce:animate-none</code> —
          try your OS&apos;s reduce-motion setting against this section; the
          bars go static but stay in place (a loading state, not an error
          state, so the content is withheld, not the layout).
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SKELETON_SHAPES.map((shape) => (
            <div key={shape} className="flex flex-col items-start gap-2">
              <span className="text-data font-mono text-muted">{shape}</span>
              <Skeleton shape={shape} />
            </div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-3">
        <h2>Empty states</h2>
        <p style={{ maxWidth: '72ch' }}>
          Four distinct empty states, deliberately not four copies of one
          generic &quot;no data&quot; card (Principle 4: this system reaches
          for a table/list/divider pattern before a repeated card, and that
          discipline applies to empty states too). Each uses a different
          construction suited to what is actually missing.
        </p>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* 1. Recent actions list — filled container, CTA to the one
              action that resolves the emptiness. */}
          <div className="flex flex-col items-start gap-3 border border-boundary bg-surface-raised p-6">
            <span className="text-body font-sans text-ink">No actions yet</span>
            <p className="text-body font-sans text-muted" style={{ maxWidth: '40ch' }}>
              Actions you create will appear here, newest first, each labelled
              by its current lifecycle state.
            </p>
            <Button variant="secondary">Start a new action</Button>
          </div>

          {/* 2. Verifier input — the /verify route before anything has been
              pasted in. A waiting state, not a failure, so it reuses Field
              plainly with ordinary (healthy) control styling. */}
          <div className="flex flex-col gap-3 border border-boundary bg-surface-raised p-6">
            <Field
              id="verify-empty"
              label="Receipt hash or action ID"
              help="Paste a settlement receipt hash or an action ID to check it against Casper. Nothing has been submitted yet."
            >
              <input
                id="verify-empty"
                name="verify-empty"
                type="text"
                placeholder="0x7f3a91…c92e"
                aria-describedby="verify-empty-help"
                className="w-full max-w-xs border border-boundary bg-surface-raised px-3 py-2 font-mono text-data text-ink placeholder:text-muted transition-[border-color,box-shadow] duration-short ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              />
            </Field>
          </div>

          {/* 3. Unknown action ID — a legitimate "nothing here" result for a
              specific, named ID, not a system failure. Link-only recovery,
              no CTA button, no fill emphasis beyond the standard container. */}
          <div className="flex flex-col items-start gap-2 border border-boundary bg-surface-raised p-6">
            <span className="font-mono text-data tabular-nums text-muted">
              /app/actions/999
            </span>
            <span className="text-body font-sans text-ink">
              No action found with this ID
            </span>
            <p className="text-body font-sans text-muted" style={{ maxWidth: '40ch' }}>
              This ID doesn&apos;t match any action on this account. Check the
              ID, or return to the action list.
            </p>
            <a
              href="/"
              className="text-body font-sans text-ink underline underline-offset-4"
            >
              Back to actions
            </a>
          </div>

          {/* 4. Build downloads — the /build section (Principle 2 names this
              as one of the few places a construction signal genuinely
              matters). Nothing has been built yet, so this is the Blueprint
              construction itself: outline only, no fill — a drawing of a
              thing, not the thing. */}
          <div className="flex flex-col items-start gap-2 border border-boundary bg-transparent p-6">
            <span className="text-body font-sans text-ink">
              No build artifacts yet
            </span>
            <p className="text-body font-sans text-muted" style={{ maxWidth: '40ch' }}>
              This template hasn&apos;t produced a downloadable build. Once a
              build completes, its artifacts will list here for download.
            </p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      <section className="flex flex-col gap-4">
        <h2>Error state variants</h2>
        <p style={{ maxWidth: '72ch' }}>
          Three distinct error presentations — inline, per-stage-card, and
          full-page — none sharing a single layout. Every retry control below
          is the static <code>StaticControl</code> defined at the top of this
          file, not <code>Button</code>: Principle 5 suppresses hover motion
          on any component currently rendering error data, and{' '}
          <code>Button.tsx</code>&apos;s hover/active states carry a
          transition even in its <code>secondary</code> variant.
        </p>

        {/* Inline error — a single value that failed to load, in the middle
            of otherwise-normal prose. */}
        <div className="flex flex-col gap-2">
          <h3 className="text-body font-sans font-medium text-ink">
            Inline
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-body font-sans text-ink">
            Current bond quote:
            <span role="alert" className="text-destructive">
              Unavailable — request failed.
            </span>
            <StaticControl>Retry</StaticControl>
          </p>
        </div>

        {/* Per-stage-card error — one stage of an action's timeline fails
            while its neighbours remain healthy; the surrounding stages are
            untouched (static as well — no ambient motion elsewhere on the
            page bleeds into this list). */}
        <div className="flex flex-col gap-2">
          <h3 className="text-body font-sans font-medium text-ink">
            Per-stage-card
          </h3>
          <ol className="flex flex-col gap-3 border border-boundary bg-surface-raised p-4">
            <li className="flex items-center gap-3 border-b border-boundary pb-3">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 bg-positive" />
              <span className="text-body font-sans text-ink">
                Bonded — funds posted on-chain
              </span>
            </li>
            <li
              role="alert"
              className="flex items-start gap-3 border-l-4 border-destructive bg-destructive/10 p-3"
            >
              <span aria-hidden className="mt-1 h-2.5 w-2.5 shrink-0 bg-destructive" />
              <div className="flex flex-col gap-1">
                <span className="text-body font-sans text-ink">
                  Evidence window — verifier response unavailable
                </span>
                <span className="text-body font-sans text-muted">
                  The on-chain verifier could not be reached. This stage will
                  retry automatically once connectivity returns.
                </span>
                <span>
                  <StaticControl>Retry now</StaticControl>
                </span>
              </div>
            </li>
            <li className="flex items-center gap-3 pt-1 opacity-40">
              <span aria-hidden className="h-2.5 w-2.5 shrink-0 bg-muted" />
              <span className="text-body font-sans text-muted">
                Resolved — pending
              </span>
            </li>
          </ol>
        </div>

        {/* Full-page error — a takeover frame for when the whole route
            failed to load, not just one value or one stage. */}
        <div className="flex flex-col gap-2">
          <h3 className="text-body font-sans font-medium text-ink">
            Full-page
          </h3>
          <div
            role="alert"
            className="flex flex-col items-center gap-3 border border-boundary bg-surface-raised p-10 text-center"
          >
            <span className="text-subhead font-sans text-ink">
              This page couldn&apos;t load
            </span>
            <p className="text-body font-sans text-muted" style={{ maxWidth: '48ch' }}>
              We couldn&apos;t reach the Bondsman backend to load{' '}
              <HashPill hash="0x9c2f47a1b6d834e0f2c918a5b3d7e6f0140c9b2e" /> —
              your wallet and any posted bonds are unaffected. This is a
              display failure only.
            </p>
            <StaticControl>Retry</StaticControl>
          </div>
        </div>
      </section>
    </main>
  );
}
