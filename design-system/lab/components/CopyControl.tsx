'use client';

// CopyControl: the single copy-to-clipboard control every long identifier in
// this system pairs with (RESPONSIVE.md §3: "> 20 characters ... pair it
// with an explicit copy-to-clipboard control that copies the untruncated
// value" -- "this is true at every tier, including desktop"). Reused
// verbatim by HashPill (components/HashPill.tsx) and, per Task 13's brief,
// by Task 14's transaction rows and Phase 2's monitor/receipt pages.
//
// Deviation from the Task 13 brief's sample, documented the same way
// Button.tsx/Field.tsx document theirs: the brief's sample used a bare
// `text-muted hover:text-ink` button with no distinct confirmation colour.
// This system reserves `--accent` for a genuine future need only (tokens.css:
// "NOT used in components 7-23") and reserves `--consequential` exclusively
// for the slash moment (PRINCIPLES.md Principle 3), so the "copied"
// confirmation below cannot reach for either. It steps to `--positive`
// instead -- tokens.css's own comment calls that role "quiet,
// non-celebratory," which is exactly the register a copy confirmation needs
// (a passed check, not a fanfare) -- falling back to `--ink`-weight text the
// rest of the time, never a third colour.
//
// `variant` is an addition beyond the brief's required `{ value: string }`
// shape, in the same spirit as Field.tsx's optional `id`: Task 13's own page
// brief asks for "button and inline variants" of this control, and the two
// real call sites need different affordances -- `inline` sits flush next to
// monospace text (HashPill's usage) with no box around it, `button` is a
// standalone control with its own border so it reads as a control in
// isolation (e.g. next to a plain identifier with no surrounding pill).
// Omitting `variant` still renders a correct control (`inline`, matching
// HashPill's existing usage).

import { useState } from 'react';

export type CopyControlVariant = 'inline' | 'button';

const BASE =
  'inline-flex items-center gap-1 font-mono transition-colors duration-short ease-standard ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink';

const VARIANT_CLASS: Record<CopyControlVariant, string> = {
  inline: 'text-mono',
  button: 'border border-boundary bg-surface-raised px-2 py-1 text-body',
};

export function CopyControl({
  value,
  variant = 'inline',
}: {
  value: string;
  variant?: CopyControlVariant;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const colorClass = copied ? 'text-positive' : 'text-muted hover:text-ink';

  return (
    <button
      type="button"
      aria-label={copied ? 'Copied to clipboard' : 'Copy to clipboard'}
      onClick={handleCopy}
      data-copied={copied || undefined}
      className={[BASE, VARIANT_CLASS[variant], colorClass].join(' ')}
    >
      <span aria-hidden>{copied ? '✓' : '⧉'}</span>
      {variant === 'button' && <span>{copied ? 'Copied' : 'Copy'}</span>}
    </button>
  );
}
