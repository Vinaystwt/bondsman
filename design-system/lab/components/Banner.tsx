// Banner: the one banner primitive for info / degraded / error tone, reused
// verbatim wherever Phase 2 needs to tell the user the system itself is in a
// non-nominal state -- most notably the degraded-backend banner Part1 §7
// requires ("the frontend must never lie about degraded backend") and the
// unavailable/reconnecting banner Principle 5 names directly.
//
// Two corrections from Task 21's own brief sample, documented the same way
// every prior task's deviation has been (see HashPill.tsx, ReceiptPanel.tsx,
// Field.tsx):
//
// 1. Tone-to-token mapping. The brief's sample used `bg-consequential/10
//    border-consequential` for `error`. That is wrong under this project's
//    own rules: PRINCIPLES.md Principle 3 reserves `--consequential`
//    exclusively for the slashed portion of a resolved bond split -- "used
//    nowhere else in the entire system ... not on hover states," and its
//    "Rules out" list names this exact mistake by name: "a red 'error-style'
//    banner anywhere in the product that is not an actual slash." A degraded
//    backend or a failed request is never a slash event, so `error` and
//    `degraded` below use the separately-named `--destructive` / `--warning`
//    tokens instead (the same tokens Field.tsx and ReceiptPanel.tsx already
//    corrected to for the identical reason). `info` drops the brief's
//    `--boundary`-only text colour choice in favour of stating it plainly:
//    a filled `surface-raised` panel with a `boundary` rule and `ink` text,
//    matching every other filled/real container in this system (Principle 2).
//
// 2. `role`. The brief's sample only special-cased `error` as `alert`,
//    leaving `degraded` as `status`. This task's own brief corrects that:
//    both `degraded` and `error` are states the user must not miss (Part1
//    §7's "must never lie about degraded backend" applies just as much to a
//    quietly-degraded banner as to an outright error), so both get
//    `role="alert"` (assertive, per ARIA's live-region mapping for `alert`).
//    Only `info` -- a routine, non-urgent notice -- gets the polite
//    `role="status"`.
//
// Principle 5 ("Motion stops at the edge of trouble") applies to this
// component absolutely, not conditionally: "the instant the UI enters an
// error, degraded, unavailable, or disconnected state, all motion is
// suppressed ... no fade-in ... Degraded states render as static, fully
// legible frames." That is stronger than Skeleton.tsx's
// `motion-safe`/`motion-reduce` handling (which is a *loading*-state
// concern, gated only on the user's own reduced-motion preference) --
// a banner is never a loading state, so it carries zero `transition-*`,
// zero `animate-*`, and zero `motion-safe:`/`motion-reduce:` classes,
// unconditionally, regardless of the viewer's motion preference. Verify by
// reading `TONE_CLASSES`/`BASE` below: neither contains any of those
// utilities.
//
// No `--accent` anywhere. No `rounded-*` class -- this system has zero
// curve commands (tokens.css).

import type { ReactNode } from 'react';

export type BannerTone = 'info' | 'degraded' | 'error';

const BASE = 'flex items-start gap-2 border-l-4 p-3 text-body font-sans';

const TONE_CLASSES: Record<BannerTone, string> = {
  info: 'bg-surface-raised border-boundary text-ink',
  degraded: 'bg-warning/10 border-warning text-ink',
  error: 'bg-destructive/10 border-destructive text-ink',
};

// A short, tone-derived kicker word so the banner is legible from its own
// construction (bold lead word), not from colour alone -- the same
// colour-plus-text-redundancy discipline ReceiptPanel.tsx and
// WalletStateCard.tsx already follow for their own status headers. This is
// generated from `tone`, not a second prop, so every call site stays a
// one-line `{ tone, children }` per the brief's exact interface.
const KICKER: Record<BannerTone, string> = {
  info: 'Notice',
  degraded: 'Degraded',
  error: 'Error',
};

export function Banner({ tone, children }: { tone: BannerTone; children: ReactNode }) {
  return (
    <div
      role={tone === 'info' ? 'status' : 'alert'}
      data-tone={tone}
      className={[BASE, TONE_CLASSES[tone]].join(' ')}
    >
      <span className="font-medium">{KICKER[tone]}:</span>
      <span>{children}</span>
    </div>
  );
}
