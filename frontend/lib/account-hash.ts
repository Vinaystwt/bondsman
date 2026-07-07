import { PublicKey } from 'casper-js-sdk';

// Casper account hash format: prefixed with "account-hash-" when stored on chain.
// Wallet public key form: hex starting with 01 (Ed25519) or 02 (Secp256k1).
// Pulls in casper-js-sdk (~50kB); import this module dynamically, not
// statically, from any route that does not already need the SDK.

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
