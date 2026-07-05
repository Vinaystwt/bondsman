import { actionDetail } from '../api/action-detail.js';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';

interface ToolDependencies {
  repository: Repository;
  deployment: Deployment;
  getBondRequirement: (
    amount: string,
    agentAddress: string,
  ) => Promise<string>;
  challengeAction: (
    actionId: number,
  ) => Promise<{ challenge: string; resolve: string }>;
  refresh?: () => Promise<void>;
}

export function createToolHandlers(dependencies: ToolDependencies) {
  return {
    async get_action({ actionId }: { actionId: number }) {
      await dependencies.refresh?.();
      const action = actionDetail(dependencies.repository, actionId);
      if (!action) throw new Error('action not found');
      return action;
    },
    async list_actions(_input: Record<string, never>) {
      await dependencies.refresh?.();
      return dependencies.repository.listActions();
    },
    async get_reputation({
      agentAddress,
    }: {
      agentAddress: string;
    }) {
      await dependencies.refresh?.();
      const reputation =
        dependencies.repository.reputation(agentAddress);
      if (!reputation) throw new Error('reputation not found');
      return reputation;
    },
    async get_bond_requirement({
      amount,
      agentAddress,
    }: {
      amount: string;
      agentAddress: string;
    }) {
      return {
        amount,
        agentAddress,
        bondRequired: await dependencies.getBondRequirement(
          amount,
          agentAddress,
        ),
      };
    },
    async get_deployments(_input: Record<string, never>) {
      return dependencies.deployment;
    },
    async challenge_action({ actionId }: { actionId: number }) {
      const result = await dependencies.challengeAction(actionId);
      await dependencies.refresh?.();
      return result;
    },
  };
}
