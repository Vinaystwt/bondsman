import { describe, expect, it } from 'vitest';
import { demoInvoices } from '../../src/shared/invoices.js';

describe('demoInvoices', () => {
  it('gives the fresh duplicate pair one 50,000 csprUSD claim while clean differs', () => {
    const first = demoInvoices.find((invoice) => invoice.id === 2045);
    const duplicate = demoInvoices.find(
      (invoice) => invoice.id === 2046,
    );
    const clean = demoInvoices.find((invoice) => invoice.id === 2047);
    expect(demoInvoices.map((invoice) => invoice.amount)).toEqual([
      '50000000000000',
      '50000000000000',
      '50000000000000',
    ]);
    expect(first?.claimHash).toBe(duplicate?.claimHash);
    expect(clean?.claimHash).not.toBe(first?.claimHash);
  });
});
