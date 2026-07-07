import { PublicKey } from 'casper-js-sdk';

// Casper account hash format: prefixed with "account-hash-" when stored on chain.
// Wallet public key form: hex starting with 01 (Ed25519) or 02 (Secp256k1).

export function publicKeyToAccountHashHex(publicKeyHex: string): string {
  try {
    const pk = PublicKey.newPublicKey(publicKeyHex);
    return pk.accountHash().toHex().toLowerCase();
  } catch {
    return '';
  }
}

export function publicKeyToPrefixedAccountHash(publicKeyHex: string): string {
  const hex = publicKeyToAccountHashHex(publicKeyHex);
  return hex ? `account-hash-${hex}` : '';
}

export function normalizeAccountHash(value: string | null | undefined): string {
  if (!value) return '';
  return value.toLowerCase().replace(/^account-hash-/, '').replace(/^hash-/, '');
}

export function accountsMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return normalizeAccountHash(a) === normalizeAccountHash(b);
}
