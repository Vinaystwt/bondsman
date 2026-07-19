export type BondRelation =
  | 'exact_match'
  | 'overcollateralized'
  | 'undercollateralized'
  | 'unavailable';

export interface BondEconomicRelation {
  quotedMinimumBond: string | null;
  actualPostedBond: string | null;
  bondRelation: BondRelation;
  bondDifference: string | null;
  minimumSatisfied: boolean;
  exactMatch: boolean;
}

function parseAmount(value: string | null | undefined): bigint | null {
  if (!value || !/^\d+$/.test(value)) return null;
  return BigInt(value);
}

export function bondEconomicRelation(input: {
  quotedMinimumBond?: string | null | undefined;
  actualPostedBond?: string | null | undefined;
}): BondEconomicRelation {
  const quoted = parseAmount(input.quotedMinimumBond);
  const actual = parseAmount(input.actualPostedBond);
  if (quoted === null || actual === null) {
    return {
      quotedMinimumBond: input.quotedMinimumBond ?? null,
      actualPostedBond: input.actualPostedBond ?? null,
      bondRelation: 'unavailable',
      bondDifference: null,
      minimumSatisfied: false,
      exactMatch: false,
    };
  }
  const difference = actual - quoted;
  return {
    quotedMinimumBond: quoted.toString(),
    actualPostedBond: actual.toString(),
    bondRelation: difference === 0n
      ? 'exact_match'
      : difference > 0n
        ? 'overcollateralized'
        : 'undercollateralized',
    bondDifference: difference.toString(),
    minimumSatisfied: actual >= quoted,
    exactMatch: actual === quoted,
  };
}
