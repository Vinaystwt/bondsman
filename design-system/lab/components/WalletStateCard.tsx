// WalletStateCard: one card per WalletState, per design-system/TOKENS/tokens.css
// and Task 16's brief (Part1 §12/§16). The union below has ten members (the
// task's own title shorthand -- "9 distinct cards" -- undercounts by one
// against Part1 §12's actual table, which is reproduced verbatim here).
// `WalletState` is a closed union, not a generic "warning" catch-all --
// Phase 2's `/app/new` wallet stage renders exactly one of these ten variants
// per capability-check result, and the
// switch is exhaustive (TypeScript errors on an unhandled member) so a new
// state can't silently fall through to a shared default.
//
// Tone mapping is corrected from the brief's raw sample per Checkpoint A's
// accent/consequential rules:
// - `info`    -> `--boundary`     (neutral, not chromatic)
// - `blocking`-> `--destructive`  (a real blocking/error condition -- the
//                dedicated destructive-control token, never the slash-only
//                `--consequential` accent, which stays reserved exclusively
//                for the ResolvedSlash moment per PRINCIPLES.md Principle 3)
// - `success` -> `--positive`     (quiet, non-celebratory confirm)
// - `warning` -> `--warning`      (non-fatal caution only)
// No `--accent` anywhere. No `rounded-*` class -- borders are square per
// Task 11-14's convention (this system has zero curve commands).

import type { ReactNode } from 'react';

export type WalletState =
  | 'not-installed'
  | 'locked'
  | 'rejected'
  | 'connected-ed25519'
  | 'connected-unsupported-key'
  | 'account-changed'
  | 'wrong-network'
  | 'missing-typed-data'
  | 'missing-message-signing'
  | 'disconnected-mid-flow';

type Tone = 'info' | 'blocking' | 'success' | 'warning';

const COPY: Record<WalletState, { title: string; body: string; tone: Tone }> = {
  'not-installed': {
    title: 'Wallet not installed',
    body: 'Install a Casper wallet to continue, or continue in sandbox.',
    tone: 'info',
  },
  locked: {
    title: 'Unlock your wallet to continue',
    body: '',
    tone: 'info',
  },
  rejected: {
    title: 'Connection rejected',
    body: 'You can retry connecting.',
    tone: 'warning',
  },
  'connected-ed25519': {
    title: 'Connected — Ed25519',
    body: 'Key type and address confirmed.',
    tone: 'success',
  },
  'connected-unsupported-key': {
    title: 'Unsupported key type',
    body: "This account uses secp256k1. Bondsman's current verifier accepts Ed25519 only for P0. Switch account or continue in sandbox.",
    tone: 'blocking',
  },
  'account-changed': {
    title: 'Account changed mid-flow',
    body: 'Paid quotes are payer-bound and will not accept the new account for this action.',
    tone: 'warning',
  },
  'wrong-network': {
    title: 'Connected to mainnet',
    body: 'Switch to Casper testnet to continue.',
    tone: 'warning',
  },
  'missing-typed-data': {
    title: 'Typed-data signing unavailable',
    body: 'Payment cannot proceed.',
    tone: 'blocking',
  },
  'missing-message-signing': {
    title: 'Message signing unavailable',
    body: 'Authorisation cannot proceed.',
    tone: 'blocking',
  },
  'disconnected-mid-flow': {
    title: 'Wallet disconnected',
    body: 'Your action continues; the receipt is public.',
    tone: 'info',
  },
};

// `info` reads as a neutral hairline rule (`--boundary`), matching every
// other non-chromatic container edge in this system -- it is not treated as
// a fourth "quiet" chroma. `blocking` is the one tone that legitimately gets
// a dedicated chromatic token here, same reasoning as Button's `destructive`
// variant (TOKENS/tokens.css: "--destructive ... NEVER equal to
// --consequential").
const TONE_CLASSES: Record<Tone, string> = {
  info: 'border-boundary',
  blocking: 'border-destructive',
  success: 'border-positive',
  warning: 'border-warning',
};

export function WalletStateCard({
  variant,
  children,
}: {
  variant: WalletState;
  children?: ReactNode;
}) {
  const { title, body, tone } = COPY[variant];
  return (
    <div
      className={`flex flex-col gap-2 border-2 p-4 bg-surface-raised ${TONE_CLASSES[tone]}`}
      data-variant={variant}
      data-tone={tone}
    >
      <h3 className="text-subhead text-ink font-sans">{title}</h3>
      {body && <p className="text-body text-muted font-sans">{body}</p>}
      {children}
    </div>
  );
}
