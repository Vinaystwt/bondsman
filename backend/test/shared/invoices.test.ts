import { describe, expect, it } from 'vitest';
import { demoInvoices } from '../../src/shared/invoices.js';

describe('demoInvoices', () => {
  it('gives 1045 and 1046 one claim while the clean invoice differs', () => {
    const first = demoInvoices.find((invoice) => invoice.id === 1045);
    const duplicate = demoInvoices.find(
      (invoice) => invoice.id === 1046,
    );
    const clean = demoInvoices.find((invoice) => invoice.id === 1047);
    expect(first?.claimHash).toBe(duplicate?.claimHash);
    expect(clean?.claimHash).not.toBe(first?.claimHash);
  });
});
