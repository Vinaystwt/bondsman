// Skeleton: the one loading-placeholder primitive for the four content
// shapes this system's routes actually load -- a table (ledger/verifier
// registry rows), a timeline (the 7-node action lifecycle column), a tile
// (a single panel-sized block, e.g. the AI/policy panels), and an inline
// run (a short in-line value, e.g. a hash or figure still resolving).
//
// Two deviations from Task 21's brief sample, in the same spirit as every
// prior task's documented deviation (HashPill.tsx, ReceiptPanel.tsx):
//
// 1. No `rounded` class. The brief's sample used `rounded bg-surface-raised
//    ...`. This system has zero curve commands anywhere (tokens.css:
//    "Border-radius is 0 everywhere ... Corners are cut (chamfered), not
//    rounded") and every other component task (11-20) has dropped `rounded`
//    entirely even where `--radius` resolves to `0px` (see HashPill.tsx's
//    own note on this), so this component follows the same convention.
//
// 2. Placeholder fill token. The brief used `bg-surface-raised` -- the same
//    solid white fill Principle 2 reserves for "content that is real and
//    settled ... matching the logo mark's own construction." A skeleton is
//    the opposite of that: it is explicitly standing in for content that has
//    NOT arrived yet, so painting it in the "real, settled" fill would send
//    exactly the wrong structural signal. It uses a translucent `--boundary`
//    tint instead (`bg-boundary/20`) -- the same hairline/rule colour this
//    system already uses for "not yet the real thing" (WalletStateCard's
//    inert treatments, LifecycleMarker's `outline` state), just as a fill
//    rather than a stroke.
//
// Each shape is composed from more than one bar so it actually resembles the
// content it stands in for (a table has a header + row bars; a timeline has
// nodes + connecting rail, echoing TimelineNode.tsx's own rail construction)
// rather than a single undifferentiated rectangle -- but the public surface
// stays exactly the brief's `{ shape }` prop.
//
// Motion: `motion-safe:animate-pulse motion-reduce:animate-none` on every
// bar, exactly as the brief specifies -- a loading state is not an error/
// degraded state (Principle 5 governs those, see Banner.tsx), so the shimmer
// is allowed, gated only on the viewer's own `prefers-reduced-motion`
// setting rather than suppressed unconditionally.
//
// No `--accent` anywhere. `aria-hidden` on every node: a skeleton has no
// content of its own to announce: the real loading state should be
// communicated by the surrounding region (e.g. an `aria-busy` container or a
// `Banner` once a fetch actually fails), not by this placeholder.

export type SkeletonShape = 'table' | 'timeline' | 'tile' | 'inline';

const PULSE = 'bg-boundary/20 motion-safe:animate-pulse motion-reduce:animate-none';

export function Skeleton({ shape }: { shape: SkeletonShape }) {
  if (shape === 'table') {
    return (
      <div aria-hidden data-shape="table" className="flex w-full flex-col gap-2">
        <div className={`h-3 w-1/3 ${PULSE}`} />
        <div className={`h-8 w-full ${PULSE}`} />
        <div className={`h-8 w-full ${PULSE}`} />
        <div className={`h-8 w-full ${PULSE}`} />
        <div className={`h-8 w-5/6 ${PULSE}`} />
      </div>
    );
  }

  if (shape === 'timeline') {
    return (
      <div aria-hidden data-shape="timeline" className="flex h-64 w-24 flex-col items-center gap-1 py-1">
        <div className={`h-2.5 w-2.5 shrink-0 ${PULSE}`} />
        <div className={`w-px flex-1 ${PULSE}`} />
        <div className={`h-2.5 w-2.5 shrink-0 ${PULSE}`} />
        <div className={`w-px flex-1 ${PULSE}`} />
        <div className={`h-2.5 w-2.5 shrink-0 ${PULSE}`} />
        <div className={`w-px flex-1 ${PULSE}`} />
        <div className={`h-2.5 w-2.5 shrink-0 ${PULSE}`} />
      </div>
    );
  }

  if (shape === 'tile') {
    return <div aria-hidden data-shape="tile" className={`h-24 w-full ${PULSE}`} />;
  }

  return <div aria-hidden data-shape="inline" className={`h-4 w-24 ${PULSE}`} />;
}
