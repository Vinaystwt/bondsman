import { describe, expect, it } from 'vitest';
import {
  transactionFinality,
  verifyChallengeIntent,
} from '../../src/casper/transactions.js';

const hash = 'a'.repeat(64);
const packageHash = `hash-${'b'.repeat(64)}`;
const contractHash = `hash-${'c'.repeat(64)}`;
const publicKey = `01${'d'.repeat(64)}`;

function transaction(overrides: {
  error?: string | null;
  executionInfo?: unknown;
  chainName?: string;
  entryPoint?: string;
  actionId?: number;
  target?: string;
} = {}) {
  const executionInfo =
    'executionInfo' in overrides
      ? overrides.executionInfo
      : {
          execution_result: {
            Version2: {
              error_message: overrides.error ?? null,
            },
          },
          block_hash: 'e'.repeat(64),
          block_height: 42,
        };
  return {
    result: {
      transaction: {
        Version1: {
          hash,
          payload: {
            initiator_addr: { PublicKey: publicKey },
            chain_name: overrides.chainName ?? 'casper-test',
            fields: {
              args: {
                Named: [
                  [
                    'action_id',
                    {
                      cl_type: 'U64',
                      parsed: overrides.actionId ?? 14,
                    },
                  ],
                ],
              },
              entry_point: {
                Custom: overrides.entryPoint ?? 'challenge_action',
              },
              target: {
                Stored: {
                  id: {
                    ByPackageHash: {
                      addr:
                        overrides.target ??
                        packageHash.replace(/^hash-/, ''),
                      version: null,
                    },
                  },
                  runtime: 'VmCasperV1',
                },
              },
            },
          },
          approvals: [{ signer: publicKey, signature: 'sig' }],
        },
      },
      execution_info: executionInfo,
    },
  };
}

describe('transactionFinality', () => {
  it('reports a transaction without execution info as pending', () => {
    expect(
      transactionFinality(
        transaction({ executionInfo: null }),
        hash,
      ),
    ).toEqual({
      hash,
      status: 'pending',
      final: false,
      success: false,
      error: null,
    });
  });

  it('preserves a finalized execution failure reason', () => {
    expect(
      transactionFinality(
        transaction({ error: 'User error: 9' }),
        hash,
      ),
    ).toEqual({
      hash,
      status: 'failed',
      final: true,
      success: false,
      error: 'User error: 9',
    });
  });

  it('reports successful execution as final', () => {
    expect(transactionFinality(transaction(), hash)).toEqual({
      hash,
      status: 'success',
      final: true,
      success: true,
      error: null,
    });
  });
});

describe('verifyChallengeIntent', () => {
  const expected = {
    hash,
    actionId: 14,
    chainName: 'casper-test',
    controllerPackageHash: packageHash,
    controllerContractHash: contractHash,
  };

  it('extracts the signed initiator from an exact challenge call', () => {
    expect(
      verifyChallengeIntent(transaction(), expected),
    ).toEqual({
      hash,
      publicKey,
      actionId: 14,
      target: packageHash,
      entryPoint: 'challenge_action',
    });
  });

  it.each([
    [
      'chain',
      transaction({ chainName: 'casper' }),
      'wrong Casper chain',
    ],
    [
      'entrypoint',
      transaction({ entryPoint: 'resolve_action' }),
      'wrong controller entrypoint',
    ],
    [
      'action',
      transaction({ actionId: 15 }),
      'wrong action_id',
    ],
    [
      'target',
      transaction({ target: 'f'.repeat(64) }),
      'wrong controller target',
    ],
  ])('rejects a mismatched %s', (_name, raw, message) => {
    expect(() => verifyChallengeIntent(raw, expected)).toThrow(
      message,
    );
  });

  it('rejects an unfinalized transaction', () => {
    expect(() =>
      verifyChallengeIntent(
        transaction({ executionInfo: null }),
        expected,
      ),
    ).toThrow('challenge transaction is not final');
  });

  it('rejects a failed transaction with its chain reason', () => {
    expect(() =>
      verifyChallengeIntent(
        transaction({ error: 'User error: 9' }),
        expected,
      ),
    ).toThrow('User error: 9');
  });
});
