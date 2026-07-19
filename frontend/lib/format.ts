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

/** Format a WCSPR base-unit amount. WCSPR uses 9 decimals like CSPR. */
export function formatWcspr(atomic: string | bigint): string {
  return `${formatAmount(atomic)} WCSPR`;
}

/** Format a raw base-unit amount without a token suffix. */
export function formatBase(atomic: string | bigint): string {
  return formatAmount(atomic);
}

/** Convert a Casper testnet ISO or Date to a short UTC display. */
export function formatIsoUtc(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const s = d.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
    });
    return `${s} UTC`;
  } catch {
    return String(iso);
  }
}

/** Truncate a hash for display: first 8 and last 6, joined by an ellipsis. */
export function truncateHash(hash: string): string {
  const clean = stripPrefix(hash);
  if (clean.length <= 18) return clean;
  return `${clean.slice(0, 8)}…${clean.slice(-6)}`;
}

/** Strip a leading hash- or account-hash- prefix for explorer links. */
export function stripPrefix(value: string): string {
  if (!value) return '';
  return value.replace(/^account-hash-/, '').replace(/^hash-/, '');
}

export function txExplorer(hash: string): string {
  return `https://testnet.cspr.live/transaction/${stripPrefix(hash)}`;
}

export function contractExplorer(hash: string): string {
  return `https://testnet.cspr.live/contract/${stripPrefix(hash)}`;
}

export function contractPackageExplorer(hash: string): string {
  return `https://testnet.cspr.live/contract-package/${stripPrefix(hash)}`;
}

export function accountExplorer(value: string): string {
  const clean = stripPrefix(value);
  // Public keys start with 01 or 02, are 66 chars; account hashes are 64.
  const type = clean.length === 66 ? 'account' : 'account';
  return `https://testnet.cspr.live/${type}/${clean}`;
}

/** Certificate-style serial number for an action id, e.g. No. 0002. */
export function serial(actionId: number): string {
  return `No. ${String(actionId).padStart(4, '0')}`;
}

export const STATUS_LABEL: Record<string, string> = {
  Initiated: 'Initiated',
  Bonded: 'Bonded',
  Executed: 'Executed',
  Challengeable: 'Challengeable',
  Expired: 'Expired',
  Challenged: 'Challenged',
  ResolvedSlash: 'Resolved Slash',
  ResolvedRefund: 'Resolved Clean',
};

export function resolveDisplayStatus(
  status: string,
  windowEnd: number,
  challenger: string | null,
): string {
  if (status === 'Executed' && !challenger && windowEnd > Date.now()) return 'Challengeable';
  if (status === 'Executed' && !challenger && windowEnd <= Date.now()) return 'Expired';
  return status;
}

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
