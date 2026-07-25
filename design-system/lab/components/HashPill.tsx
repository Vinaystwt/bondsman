'use client';

// HashPill: the truncated identifier chip for hashes, addresses, and tx-ids,
// per RESPONSIVE.md §3's "Identifier monospace values" rule. Reused verbatim
// by Task 14's transaction rows and Phase 2's monitor/receipt pages (per
// Task 13's brief).
//
// Truncation follows RESPONSIVE.md §3 exactly, not the Task 13 brief's
// looser `hash.length > 14` sample:
//   - <= 20 characters: render in full, inline, no truncation.
//   - > 20 characters (every real hash/address/tx-id in this system --
//     a 42-character verifier address, a 66-character settlement tx hash,
//     etc.): truncate to `0x` + first 6 hex characters + `…` + last 4 hex
//     characters (e.g. `0x7f3a91…c92e`), regardless of whether the input
//     already carries a `0x` prefix -- the truncated *display* form always
//     starts with one, per the spec's own example. This holds at every
//     tier, including desktop: "truncation here is a legibility and
//     scan-ability rule, not a mobile-only space-saving hack ... a hash
//     pill does not 'expand' into the full string at wider viewports."
// The copy control always copies the untruncated `hash` value, never the
// truncated display string, so the pill is never the vehicle for
// verification (RESPONSIVE.md §3).
//
// Deviation from the brief's sample, documented the same way Button.tsx/
// Field.tsx document theirs: the brief used `rounded border`. This system
// has zero curve commands (tokens.css: "Border-radius is 0 everywhere ...
// Corners are cut (chamfered), not rounded") and Task 11/12 both avoid
// `rounded-*` utilities entirely even though `--radius` resolves to `0px`,
// so this component follows the same convention and uses a plain `border`
// with no `rounded` class at all.
//
// No `--accent` anywhere: the pill's chrome is `--boundary`/`--ink`/
// `--muted`, matching Button.tsx's "ink weight, rules, motion -- never a
// third colour" rule. The external-link affordance reuses the same
// muted-to-ink hover step as CopyControl rather than introducing a link
// colour.

import { CopyControl } from './CopyControl';

const TRUNCATION_THRESHOLD = 20; // RESPONSIVE.md §3

function formatHash(hash: string): { display: string; truncated: boolean } {
  if (hash.length <= TRUNCATION_THRESHOLD) {
    return { display: hash, truncated: false };
  }
  const hex = hash.startsWith('0x') ? hash.slice(2) : hash;
  return { display: `0x${hex.slice(0, 6)}…${hex.slice(-4)}`, truncated: true };
}

export function HashPill({ hash, href }: { hash: string; href?: string }) {
  const { display, truncated } = formatHash(hash);

  return (
    <span
      className="inline-flex items-center gap-1 border border-boundary bg-surface-raised px-2 py-0.5 font-mono text-mono text-ink"
      title={truncated ? hash : undefined}
    >
      {display}
      <CopyControl value={hash} />
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          aria-label="View on cspr.live"
          className="text-muted transition-colors duration-short ease-standard hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          ↗
        </a>
      )}
    </span>
  );
}
