const TOKEN_UNIT = 1_000_000_000n;

export type FaultClass = 'duplicate_claim' | 'delivery_contradiction';
export type ImplementationStatus = 'executable_now' | 'blueprint';
export type FormulaVersion = 'bond-policy-v1';

export interface BondPolicyInput {
  amount: string;
  supportedFaultClass: FaultClass;
  reputationScore?: number | null;
}

export interface BondPriceResult {
  authority: 'deterministic_policy';
  formulaVersion: FormulaVersion;
  riskTier: 'standard' | 'elevated' | 'high';
  estimatedMinimumBond: string;
  bondBasisPoints: number;
}

export interface BondPolicyResult extends BondPriceResult {
  faultClass: FaultClass;
  verifier: 'duplicate-claim-v2' | 'delivery-contradiction-v2';
  estimatedBond: string;
  challengeWindowSeconds: 1800;
  evidenceRequirements: string[];
  implementationStatus: ImplementationStatus;
  executableNow: boolean;
}

function positiveAmount(value: string): bigint {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error('amount must be a positive integer string');
  }
  return BigInt(value);
}

export function bondBasisPoints(input: {
  amount: string;
  reputationScore?: number | null;
}): number {
  const amount = positiveAmount(input.amount);
  const base =
    amount >= 50_000n * TOKEN_UNIT
      ? 500
      : amount >= 10_000n * TOKEN_UNIT
        ? 300
        : 200;
  const reputation = input.reputationScore ?? -20;
  const penalty = reputation < 0 ? Math.min(Math.abs(reputation), 300) : 0;
  return base + penalty;
}

export function riskTier(amount: string, bps: number): BondPolicyResult['riskTier'] {
  const value = positiveAmount(amount);
  if (value >= 50_000n * TOKEN_UNIT || bps >= 500) return 'high';
  if (value >= 10_000n * TOKEN_UNIT || bps >= 300) return 'elevated';
  return 'standard';
}

export function priceBond(input: {
  amount: string;
  reputationScore?: number | null;
}): BondPriceResult {
  const amount = positiveAmount(input.amount);
  const bps = bondBasisPoints(input);
  return {
    authority: 'deterministic_policy',
    formulaVersion: 'bond-policy-v1',
    riskTier: riskTier(input.amount, bps),
    estimatedMinimumBond: ((amount * BigInt(bps)) / 10_000n).toString(),
    bondBasisPoints: bps,
  };
}

export function policyFor(input: BondPolicyInput): BondPolicyResult {
  const price = priceBond(input);
  const verifier = input.supportedFaultClass === 'delivery_contradiction'
    ? 'delivery-contradiction-v2'
    : 'duplicate-claim-v2';
  return {
    ...price,
    faultClass: input.supportedFaultClass,
    verifier,
    estimatedBond: price.estimatedMinimumBond,
    challengeWindowSeconds: 1800,
    evidenceRequirements: input.supportedFaultClass === 'delivery_contradiction'
      ? ['buyer-signed delivery attestation bound to action id and invoice id']
      : ['paid-claim collision against InvoicePool claim registry'],
    implementationStatus: 'executable_now',
    executableNow: true,
  };
}

export function policyFormulaSummary(): string {
  return 'Base bond is 200 bps below 10,000 units, 300 bps from 10,000 units, and 500 bps from 50,000 units. Negative reputation adds up to 300 bps. Bond = amount * basis points / 10,000.';
}
