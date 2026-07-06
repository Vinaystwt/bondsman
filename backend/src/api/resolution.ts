import { join } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';
import { callContract } from '../casper/odra-cli.js';
import { SignerQueue } from '../casper/signer-queue.js';
import { mergeActionTransactions } from '../evidence/store.js';

export interface ResolutionService {
  challengeAndResolve(
    actionId: number,
  ): Promise<{ challenge: string; resolve: string }>;
  resolve(
    actionId: number,
    evidence?: Record<string, string>,
  ): Promise<string>;
}

export function createResolutionService(
  repositoryPath: string,
  config: BondsmanConfig,
  controllerHash: string,
  reconcile?: () => Promise<void>,
): ResolutionService {
  const signerPath = join(
    repositoryPath,
    '.keys/challenger.pem',
  );
  const queue = new SignerQueue();
  const call = (entrypoint: string, actionId: number) =>
    callContract({
      repository: repositoryPath,
      config,
      signerPath,
      contract: 'BondsmanController',
      entrypoint,
      arguments: ['--action_id', String(actionId)],
    });
  return {
    challengeAndResolve: (actionId) =>
      queue.run(async () => {
        const challenge = await call('challenge_action', actionId);
        const resolve = await call('resolve_action', actionId);
        await mergeActionTransactions(
          repositoryPath,
          controllerHash,
          actionId,
          { challenge, resolve },
        );
        if (reconcile) await reconcile();
        return { challenge, resolve };
      }),
    resolve: (actionId, evidence = {}) =>
      queue.run(async () => {
        const resolve = await call('resolve_action', actionId);
        await mergeActionTransactions(
          repositoryPath,
          controllerHash,
          actionId,
          { ...evidence, resolve },
        );
        if (reconcile) await reconcile();
        return resolve;
      }),
  };
}
