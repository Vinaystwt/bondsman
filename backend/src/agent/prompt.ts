export interface DecisionInvoice {
  id: number;
  invoiceNumber: string;
  debtor: string;
  amount: string;
  vendor: string;
  dueDate: string;
  delivered: boolean;
}

export const approvalPolicy =
  'Approve when delivery is confirmed, the amount is positive, and the due date is on or before the evaluation date. Apply exactly these criteria; do not add fraud, age, size, or business-normality criteria.';

export function decisionPrompt(invoice: DecisionInvoice): string {
  const displayAmount = (
    BigInt(invoice.amount) / 1_000_000_000n
  ).toString();
  return [
    'You approve or reject one invoice using only the supplied invoice and policy.',
    `Evaluation date: ${new Date().toISOString().slice(0, 10)}`,
    `Policy: ${approvalPolicy}`,
    `Invoice: ${JSON.stringify({
      ...invoice,
      amount: Number(displayAmount),
      currency: 'csprUSD',
    })}`,
    `Observed policy facts: delivered is ${invoice.delivered}; amount is a positive number; due date is on or before the evaluation date.`,
    'Return only strict JSON with decision ("approve" or "reject"), reasoning, and confidence (0 through 1).',
  ].join('\n');
}
