// Money arrives as strings in atomic units with 9 decimals.
// 2500000000000 -> 2,500 csprUSD. Always format for display, never raw.

const DECIMALS = 9n;
const SCALE = 10n ** DECIMALS;

export function toCsprUsd(atomic: string | bigint): number {
  const value = typeof atomic === 'string' ? BigInt(atomic || '0') : atomic;
  const whole = value / SCALE;
  const frac = value % SCALE;
  return Number(whole) + Number(frac) / Number(SCALE);
}

/** Display amount with thousands separators, trimming trailing zeros. */
export function formatAmount(atomic: string | bigint): string {
  const n = toCsprUsd(atomic);
  const maximumFractionDigits = n < 1 ? 4 : 2;
  return n.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

/** Amount with the csprUSD suffix. */
export function formatMoney(atomic: string | bigint): string {
  return `${formatAmount(atomic)} csprUSD`;
}

/** Truncate a hash for display: first 8 and last 6, joined by an ellipsis. */
export function truncateHash(hash: string): string {
  const clean = stripPrefix(hash);
  if (clean.length <= 18) return clean;
  return `${clean.slice(0, 8)}…${clean.slice(-6)}`;
}

/** Strip a leading hash- or account-hash- prefix for explorer links. */
export function stripPrefix(value: string): string {
  return value.replace(/^account-hash-/, '').replace(/^hash-/, '');
}

export function txExplorer(hash: string): string {
  return `https://testnet.cspr.live/transaction/${stripPrefix(hash)}`;
}

export function contractExplorer(hash: string): string {
  return `https://testnet.cspr.live/contract/${stripPrefix(hash)}`;
}

/** Certificate-style serial number for an action id, e.g. No. 0002. */
export function serial(actionId: number): string {
  return `No. ${String(actionId).padStart(4, '0')}`;
}

/** Human label for each lifecycle status. Plain words, no dashes. */
export const STATUS_LABEL: Record<string, string> = {
  Initiated: 'Initiated',
  Bonded: 'Bonded',
  Executed: 'Executed',
  Challenged: 'Challenged',
  ResolvedSlash: 'Bond slashed',
  ResolvedRefund: 'Bond refunded',
};

/** Parse the JSON blob carried on a CES event. Returns a flat record. */
export function parseEventData(data: string): Record<string, unknown> {
  try {
    return JSON.parse(data) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function formatWindowEnd(ms: number): string {
  // Format in UTC so server and client render identically (no hydration drift).
  try {
    const s = new Date(ms).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
    return `${s} UTC`;
  } catch {
    return String(ms);
  }
}
