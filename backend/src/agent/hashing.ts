import { blake2b } from '@noble/hashes/blake2b.js';

export function blake2b256(value: string | Uint8Array): Buffer {
  const input =
    typeof value === 'string' ? new TextEncoder().encode(value) : value;
  return Buffer.from(blake2b(input, { dkLen: 32 }));
}

export function claimInput(
  debtor: string,
  invoiceNumber: string,
): string {
  return `${debtor.length}:${debtor}|${invoiceNumber.length}:${invoiceNumber}`;
}

export function claimHash(
  debtor: string,
  invoiceNumber: string,
): Buffer {
  return blake2b256(claimInput(debtor, invoiceNumber));
}
