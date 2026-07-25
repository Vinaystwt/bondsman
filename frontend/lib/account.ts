// Pure string helpers for Casper account hashes. No casper-js-sdk dependency,
// so this stays cheap to import from any route (Ledger, Leaderboard, agent
// cards). For deriving an account hash from a public key, see
// account-hash.ts, which pulls in casper-js-sdk and should be dynamically
// imported.

export function normalizeAccountHash(value: string | null | undefined): string {
  if (!value) return '';
  return value.toLowerCase().replace(/^account-hash-/, '').replace(/^hash-/, '');
}

export function accountsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeAccountHash(a) === normalizeAccountHash(b);
}
