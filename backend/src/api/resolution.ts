import { join } from 'node:path';
import {
  publicFallbackConfig,
  type BondsmanConfig,
} from '../config/env.js';
import { callContract } from '../casper/odra-cli.js';
import { activeContracts, v2Enabled } from '../casper/contracts.js';
import {
  directBytes,
  directCallContract,
  directString,
  directU64,
} from '../casper/direct-call.js';
import { SignerQueue } from '../casper/signer-queue.js';
import { mergeActionTransactions } from '../evidence/store.js';
import type { Deployment } from '../shared/deployment.js';

export interface ResolutionService {
  challenge(actionId: number): Promise<string>;
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
  deployment: Deployment,
  reconcile?: () => Promise<void>,
): ResolutionService {
  const signerPath = join(
    repositoryPath,
    '.keys/challenger.pem',
  );
  const queue = new SignerQueue();
  const contracts = activeContracts(deployment);
  const controllerHash = deployment.contracts.controller.contractHash;
  const call = (entrypoint: string, actionId: number) => {
    if (v2Enabled(deployment)) {
      return directCallContract({
        config: publicFallbackConfig(config),
        signerPath,
        packageHash: deployment.contracts.controller.packageHash,
        entryPoint: entrypoint,
        args: {
          action_id: directU64(actionId),
          ...(entrypoint === 'challenge_action'
            ? {
                fault_class: directString('duplicate_claim'),
                evidence: directBytes(Buffer.from([0])),
              }
            : {}),
        },
      } as never);
    }
    return callContract({
      repository: repositoryPath,
      config,
      signerPath,
      contract: contracts.controller,
      entrypoint,
      arguments: [
        '--action_id',
        String(actionId),
        ...(v2Enabled(deployment) && entrypoint === 'challenge_action'
          ? [
              '--fault_class',
              'duplicate_claim',
              '--evidence',
              '0',
            ]
          : []),
      ],
    });
  };
  return {
    challenge: (actionId) =>
      queue.run(async () => call('challenge_action', actionId)),
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
