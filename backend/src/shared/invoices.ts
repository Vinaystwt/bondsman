import { claimHash } from '../agent/hashing.js';
import type { DecisionInvoice } from '../agent/prompt.js';

export interface SeedInvoice extends DecisionInvoice {
  claimHash: string;
}

const vendor =
  'account-hash-49d3c32b9e2c38a5b377387882e0926ca9d9d542da1cc739d1572e0a513aeab8';

function invoice(
  id: number,
  invoiceNumber: string,
): SeedInvoice {
  const debtor = 'Globex Manufacturing';
  return {
    id,
    invoiceNumber,
    debtor,
    amount: '1000000000000',
    vendor,
    dueDate: '2020-01-01',
    delivered: true,
    claimHash: claimHash(debtor, invoiceNumber).toString('hex'),
  };
}

export const demoInvoices: SeedInvoice[] = [
  invoice(1045, 'GBX-7781'),
  invoice(1046, 'GBX-7781'),
  invoice(1047, 'GBX-7782'),
];
