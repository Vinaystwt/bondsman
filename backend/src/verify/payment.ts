export interface SandboxPayment {
  account: string;
  amount: string;
  signature: string;
}

export function parseSandboxPayment(
  header: string | undefined,
  network: string | undefined,
  expectedAmount: string,
): SandboxPayment {
  if (network !== 'casper') {
    throw new Error('payment network must be casper');
  }
  const match = header?.match(
    /^casper:(01[0-9a-f]{64}):(\d+):(sig_ed25519_[A-Za-z0-9_-]{16,})$/,
  );
  if (!match) throw new Error('invalid Casper sandbox payment');
  const [, account, amount, signature] = match;
  if (amount !== expectedAmount) {
    throw new Error('sandbox payment amount does not match');
  }
  return {
    account: account!,
    amount,
    signature: signature!,
  };
}

export function paymentRequired(
  payTo: string,
  amount: string,
) {
  return {
    mode: 'sandbox' as const,
    simulated: true as const,
    settled: false as const,
    network: 'casper' as const,
    amount,
    payTo,
    headerShape:
      'casper:<ed25519-public-key>:<amount>:sig_ed25519_<signature>',
  };
}
