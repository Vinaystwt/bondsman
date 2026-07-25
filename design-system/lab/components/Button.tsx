'use client';

// Button primitive: 4 variants x 6 states, per design-system/TOKENS/tokens.css
// and the corrected color mapping agreed after Task 6/Checkpoint A (see
// design-system/lab/app/buttons/page.tsx's header comment for the full
// rationale). `--accent` is reserved and unused here — every state
// distinction below is carried by ink weight, rules (borders/underlines/
// outlines), and motion (short transitions, a 1px press translate), never by
// introducing a third colour. Only `destructive` uses a dedicated chromatic
// token (`--destructive`), per PRINCIPLES.md Principle 3's hard requirement
// that destructive controls get a separately-named colour, never the
// slash-only `--consequential` accent and never `--accent`.
//
// `state` is a controlled prop, not just a CSS pseudo-class: Task 12-16's
// interactive components follow this same variant+state shape so a reviewer
// can force-render any state (e.g. for the full matrix on /buttons) without
// needing a real mouse/keyboard. Real hover/active/focus-visible pseudo-class
// behaviour is wired in parallel via the same class values, so a button
// rendered with the default `state` is still genuinely interactive.

import type { ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'destructive';
export type ButtonVisualState = 'default' | 'hover' | 'active' | 'focus' | 'disabled' | 'loading';

const BASE =
  'inline-flex items-center justify-center gap-2 px-4 py-2 text-body font-sans ' +
  'transition-[box-shadow,color,background-color,border-color,transform] duration-short ease-standard ' +
  'select-none disabled:pointer-events-none';

// Default (resting) look per variant. `primary` is a solid ink fill (Principle
// 2's "filled = real, settled construction"); `secondary` is an ink-family
// outline on the raised surface, echoing the same filled/outline grammar
// Principle 2 already establishes for Live vs Blueprint content, just applied
// to emphasis rather than evidence class; `quiet` carries no border/fill at
// all, reading as the lowest-emphasis control; `destructive` is the one
// variant that legitimately uses a dedicated chromatic token.
const VARIANT_BASE: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-surface-raised border border-ink',
  secondary: 'bg-transparent text-ink border border-boundary',
  quiet: 'bg-transparent text-muted border border-transparent',
  destructive: 'bg-destructive text-surface-raised border border-destructive',
};

// Hover: a rule-weight change, never a colour change. Filled variants (primary,
// destructive) gain a thin inset ring in `--surface-raised` — a highlight
// traced just inside the edge of the existing fill, not a new hue. Outline/
// quiet variants gain ink weight instead (boundary -> ink border, muted ->
// ink text) plus an underline as a second, non-colour affordance.
const VARIANT_HOVER: Record<ButtonVariant, string> = {
  primary: 'ring-2 ring-inset ring-surface-raised',
  secondary: 'border-ink',
  quiet: 'text-ink underline underline-offset-4',
  destructive: 'ring-2 ring-inset ring-surface-raised',
};

// Active (pressed): hover's rule change plus a 1px press translate — motion
// carrying the state, per VISUAL_LANGUAGE.md's "ink weight, rules, and motion
// of the value, not a third colour."
const VARIANT_ACTIVE: Record<ButtonVariant, string> = {
  primary: 'ring-2 ring-inset ring-surface-raised translate-y-px',
  secondary: 'border-ink translate-y-px',
  quiet: 'text-ink underline underline-offset-4 translate-y-px',
  destructive: 'ring-2 ring-inset ring-surface-raised translate-y-px',
};

// Focus-visible: a real outline ring in `--ink`, offset from the control so it
// reads on every variant including the ink-filled ones. `--accent` is
// unavailable per the token contract's own comment (Task 6/Checkpoint A), so
// this is `--ink`, not a blue focus ring.
const FOCUS_RING = 'outline outline-2 outline-offset-2 outline-ink';

// Disabled/loading share the same muted, inert treatment: reduced opacity
// (ink weight turned down, not a colour swap) and a not-allowed cursor. No
// spinner/shimmer on loading — Principle 5 reserves suppressed motion for
// error/degraded states, but this system's restraint on ambient motion
// generally argues against a spinning affordance here too; loading is a
// static, legible label instead.
const INERT = 'opacity-40 cursor-not-allowed';

function prefixEach(classes: string, prefix: string): string {
  return classes
    .split(' ')
    .filter(Boolean)
    .map((c) => `${prefix}:${c}`)
    .join(' ');
}

function realInteractionClasses(variant: ButtonVariant): string {
  return [
    prefixEach(VARIANT_HOVER[variant], 'hover'),
    prefixEach(VARIANT_ACTIVE[variant], 'active'),
    prefixEach(FOCUS_RING, 'focus-visible'),
  ].join(' ');
}

function forcedStateClasses(variant: ButtonVariant, state: ButtonVisualState): string {
  switch (state) {
    case 'hover':
      return VARIANT_HOVER[variant];
    case 'active':
      return VARIANT_ACTIVE[variant];
    case 'focus':
      return FOCUS_RING;
    case 'disabled':
    case 'loading':
      return INERT;
    default:
      return '';
  }
}

export function Button({
  variant = 'primary',
  state = 'default',
  children,
}: {
  variant?: ButtonVariant;
  state?: ButtonVisualState;
  children: ReactNode;
}) {
  const disabled = state === 'disabled' || state === 'loading';

  const className = [
    BASE,
    VARIANT_BASE[variant],
    realInteractionClasses(variant),
    forcedStateClasses(variant, state),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      disabled={disabled}
      aria-busy={state === 'loading' || undefined}
      data-variant={variant}
      data-state={state}
      className={className}
    >
      {state === 'loading' ? 'Working…' : children}
    </button>
  );
}
