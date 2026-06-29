import { join } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';
import { callContract } from '../casper/odra-cli.js';

export interface ResolutionService {
  challengeAndResolve(
    actionId: number,
  ): Promise<{ challenge: string; resolve: string }>;
  resolve(actionId: number): Promise<string>;
}

export function createResolutionService(
  repositoryPath: string,
  config: BondsmanConfig,
): ResolutionService {
  const signerPath = join(
    repositoryPath,
    '.keys/challenger.pem',
  );
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
    async challengeAndResolve(actionId) {
      const challenge = await call('challenge_action', actionId);
      const resolve = await call('resolve_action', actionId);
      return { challenge, resolve };
    },
    resolve: (actionId) => call('resolve_action', actionId),
  };
}
