import { PublicKey } from '../casper/sdk.js';
import {
  transactionFinality,
  verifyChallengeIntent,
  type TransactionFinality,
} from '../casper/transactions.js';
import type {
  ActionRecord,
  EventRecord,
} from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import { ApiError } from './errors.js';

export interface WalletChallengeRepository {
  action(actionId: number): Partial<ActionRecord> | undefined;
  eventsForAction(actionId: number): EventRecord[];
}

interface ChainAction {
  status: string;
  challenger: string;
  bondPosted: string;
}

interface WalletChallengeOptions {
  deployment: Deployment;
  repository: WalletChallengeRepository;
  getTransaction(hash: string): Promise<unknown>;
  readAction(actionId: number): Promise<ChainAction>;
  resolve(
    actionId: number,
    evidence?: Record<string, string>,
  ): Promise<string>;
}

export interface WalletChallengeResult {
  success: true;
  actionId: number;
  challenger: string;
  challengerSource: 'external-wallet';
  reward: {
    total: string;
    challengerShare: string;
    reserveShare: string;
    token: 'csprUSD';
    decimals: 9;
  };
  transactions: {
    challenge: string;
    resolve: string;
  };
  finality: {
    challenge: true;
    resolve: true;
  };
  explorerLinks: {
    challenge: string;
    resolve: string;
  };
}

export interface WalletChallengeService {
  transactionStatus(hash: string): Promise<TransactionFinality>;
  resolveWalletChallenge(input: {
    actionId: number;
    challengeDeployHash: string;
  }): Promise<WalletChallengeResult>;
}

function normalizeAccount(value: string): string {
  const matched = value.match(
    /(?:Key::Account\(|account-hash-)([0-9a-f]{64})\)?/,
  )?.[1];
  return matched ? `account-hash-${matched}` : value;
}

function explorer(hash: string): string {
  return `https://testnet.cspr.live/transaction/${hash}`;
}

function splitFromEvents(
  repository: WalletChallengeRepository,
  actionId: number,
): { challengerShare: string; reserveShare: string } {
  const event = repository
    .eventsForAction(actionId)
    .find((candidate) => candidate.eventType === 'BondSlashed');
  if (!event) {
    throw new ApiError(
      500,
      'SLASH_EVIDENCE_UNAVAILABLE',
      'resolved slash event is unavailable after reconciliation',
    );
  }
  const fields = JSON.parse(event.data) as Record<string, unknown>;
  const challengerShare = String(fields.challenger_amount ?? '');
  const reserveShare = String(fields.pool_amount ?? '');
  if (
    !/^[0-9]+$/.test(challengerShare) ||
    !/^[0-9]+$/.test(reserveShare)
  ) {
    throw new ApiError(
      500,
      'SLASH_EVIDENCE_UNAVAILABLE',
      'resolved slash event has an invalid reward split',
    );
  }
  return { challengerShare, reserveShare };
}

export function createWalletChallengeService(
  options: WalletChallengeOptions,
): WalletChallengeService {
  const configuredAccounts = new Set(
    Object.values(options.deployment.accounts).map(
      (account) => `account-hash-${account.accountHash}`,
    ),
  );

  return {
    async transactionStatus(hash) {
      return transactionFinality(
        await options.getTransaction(hash),
        hash,
      );
    },

    async resolveWalletChallenge({
      actionId,
      challengeDeployHash,
    }) {
      const rawTransaction =
        await options.getTransaction(challengeDeployHash);
      const finality = transactionFinality(
        rawTransaction,
        challengeDeployHash,
      );
      if (!finality.final) {
        throw new ApiError(
          409,
          'CHALLENGE_NOT_FINAL',
          'challenge transaction is not final',
        );
      }
      if (!finality.success) {
        throw new ApiError(
          422,
          'CHALLENGE_FAILED',
          `challenge transaction failed: ${finality.error}`,
        );
      }

      let intent;
      try {
        intent = verifyChallengeIntent(rawTransaction, {
          hash: challengeDeployHash,
          actionId,
          chainName: options.deployment.chainName,
          controllerPackageHash:
            options.deployment.contracts.controller.packageHash,
          controllerContractHash:
            options.deployment.contracts.controller.contractHash,
        });
      } catch (error) {
        throw new ApiError(
          422,
          'INVALID_CHALLENGE_TRANSACTION',
          error instanceof Error ? error.message : String(error),
          { cause: error },
        );
      }

      const walletAccount =
        `account-hash-${PublicKey.fromHex(intent.publicKey)
          .accountHash()
          .toHex()}`;
      if (configuredAccounts.has(walletAccount)) {
        throw new ApiError(
          409,
          'NOT_EXTERNAL_WALLET',
          'challenge signer is a configured backend account',
        );
      }

      const chainAction = await options.readAction(actionId);
      const storedChallenger = normalizeAccount(
        chainAction.challenger,
      );
      if (storedChallenger !== walletAccount) {
        throw new ApiError(
          409,
          'CHALLENGER_MISMATCH',
          'stored on-chain challenger does not match the transaction signer',
        );
      }

      let resolveHash: string;
      if (chainAction.status === 'Challenged') {
        resolveHash = await options.resolve(actionId, {
          challenge: challengeDeployHash,
        });
      } else if (chainAction.status === 'ResolvedSlash') {
        const existing = options.repository.action(actionId);
        resolveHash = existing?.transactions?.resolve ?? '';
        if (!/^[0-9a-f]{64}$/.test(resolveHash)) {
          throw new ApiError(
            409,
            'RESOLVE_EVIDENCE_UNAVAILABLE',
            'action is already resolved but its resolve transaction is unavailable',
          );
        }
      } else {
        throw new ApiError(
          409,
          'ACTION_NOT_CHALLENGED',
          `action status is ${chainAction.status}, expected Challenged`,
        );
      }

      const projected = options.repository.action(actionId);
      if (
        projected?.status !== 'ResolvedSlash' ||
        projected.challenger !== walletAccount ||
        projected.challengerType !== 'external-wallet' ||
        projected.challengeSigning !== 'external-wallet'
      ) {
        throw new ApiError(
          500,
          'RECONCILIATION_MISMATCH',
          'resolved action projection does not preserve the external wallet challenger',
        );
      }
      const split = splitFromEvents(options.repository, actionId);
      const total = (
        BigInt(split.challengerShare) +
        BigInt(split.reserveShare)
      ).toString();
      if (total !== chainAction.bondPosted) {
        throw new ApiError(
          500,
          'REWARD_SPLIT_MISMATCH',
          'on-chain slash split does not equal the posted bond',
        );
      }

      return {
        success: true,
        actionId,
        challenger: walletAccount,
        challengerSource: 'external-wallet',
        reward: {
          total,
          challengerShare: split.challengerShare,
          reserveShare: split.reserveShare,
          token: 'csprUSD',
          decimals: 9,
        },
        transactions: {
          challenge: challengeDeployHash,
          resolve: resolveHash,
        },
        finality: {
          challenge: true,
          resolve: true,
        },
        explorerLinks: {
          challenge: explorer(challengeDeployHash),
          resolve: explorer(resolveHash),
        },
      };
    },
  };
}
