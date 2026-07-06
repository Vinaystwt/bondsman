import { describe, expect, it, vi } from 'vitest';
import { PrivateKey, KeyAlgorithm } from '../../src/casper/sdk.js';
import {
  createWalletChallengeService,
  type WalletChallengeRepository,
} from '../../src/api/wallet-challenge.js';
import type { Deployment } from '../../src/shared/deployment.js';

const hash = (character: string) => character.repeat(64);
const packageHash = `hash-${hash('a')}`;
const contractHash = `hash-${hash('b')}`;
const challengeHash = hash('c');
const resolveHash = hash('d');
const wallet = PrivateKey.generate(KeyAlgorithm.ED25519).publicKey;
const walletPublicKey = wallet.toHex();
const walletAccount = `account-hash-${wallet.accountHash().toHex()}`;

function account() {
  const key = PrivateKey.generate(KeyAlgorithm.ED25519).publicKey;
  return {
    publicKey: key.toHex(),
    accountHash: key.accountHash().toHex(),
  };
}

const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
  contracts: {
    mockCsprUsd: {
      packageHash: `hash-${hash('1')}`,
      contractHash: `hash-${hash('2')}`,
    },
    bondVault: {
      packageHash: `hash-${hash('3')}`,
      contractHash: `hash-${hash('4')}`,
    },
    controller: { packageHash, contractHash },
    invoicePool: {
      packageHash: `hash-${hash('5')}`,
      contractHash: `hash-${hash('6')}`,
    },
  },
  accounts: {
    deployer: account(),
    agent: account(),
    challenger: account(),
    watchdog: account(),
  },
} as Deployment;

function challengeTransaction(executionInfo: unknown = {
  execution_result: {
    Version2: { error_message: null },
  },
}) {
  return {
    result: {
      transaction: {
        Version1: {
          hash: challengeHash,
          payload: {
            initiator_addr: { PublicKey: walletPublicKey },
            chain_name: 'casper-test',
            fields: {
              args: {
                Named: [
                  [
                    'action_id',
                    { cl_type: 'U64', parsed: 21 },
                  ],
                ],
              },
              entry_point: { Custom: 'challenge_action' },
              target: {
                Stored: {
                  id: {
                    ByPackageHash: {
                      addr: packageHash.replace(/^hash-/, ''),
                      version: null,
                    },
                  },
                },
              },
            },
          },
          approvals: [{ signer: walletPublicKey }],
        },
      },
      execution_info: executionInfo,
    },
  };
}

function repository(): WalletChallengeRepository {
  return {
    action: vi.fn().mockReturnValue({
      actionId: 21,
      status: 'ResolvedSlash',
      challenger: walletAccount,
      challengeSigning: 'external-wallet',
      transactions: {
        challenge: challengeHash,
        resolve: resolveHash,
      },
    }),
    eventsForAction: vi.fn().mockReturnValue([
      {
        contract: 'BondVault',
        eventIndex: 1,
        eventType: 'BondSlashed',
        actionId: 21,
        data: JSON.stringify({
          challenger_amount: '200',
          pool_amount: '200',
        }),
        transactionHash: resolveHash,
      },
    ]),
  };
}

describe('wallet challenge resolution', () => {
  it('never resolves a challenge without final execution', async () => {
    const resolve = vi.fn();
    const service = createWalletChallengeService({
      deployment,
      repository: repository(),
      getTransaction: async () => challengeTransaction(null),
      readAction: async () => ({
        status: 'Challenged',
        challenger:
          `Key::Account(${wallet.accountHash().toHex()})`,
        bondPosted: '400',
      }),
      resolve,
    });

    await expect(
      service.resolveWalletChallenge({
        actionId: 21,
        challengeDeployHash: challengeHash,
      }),
    ).rejects.toMatchObject({ code: 'CHALLENGE_NOT_FINAL' });
    expect(resolve).not.toHaveBeenCalled();
  });

  it('resolves with the backend while preserving the external wallet recipient', async () => {
    const resolve = vi.fn().mockResolvedValue(resolveHash);
    const service = createWalletChallengeService({
      deployment,
      repository: repository(),
      getTransaction: async () => challengeTransaction(),
      readAction: async () => ({
        status: 'Challenged',
        challenger:
          `Key::Account(${wallet.accountHash().toHex()})`,
        bondPosted: '400',
      }),
      resolve,
    });

    await expect(
      service.resolveWalletChallenge({
        actionId: 21,
        challengeDeployHash: challengeHash,
      }),
    ).resolves.toEqual({
      success: true,
      actionId: 21,
      challenger: walletAccount,
      challengerSource: 'external-wallet',
      reward: {
        total: '400',
        challengerShare: '200',
        reserveShare: '200',
        token: 'csprUSD',
        decimals: 9,
      },
      transactions: {
        challenge: challengeHash,
        resolve: resolveHash,
      },
      finality: {
        challenge: true,
        resolve: true,
      },
      explorerLinks: {
        challenge:
          `https://testnet.cspr.live/transaction/${challengeHash}`,
        resolve:
          `https://testnet.cspr.live/transaction/${resolveHash}`,
      },
    });
    expect(resolve).toHaveBeenCalledWith(21, {
      challenge: challengeHash,
    });
  });
});
