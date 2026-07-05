import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import type { Deployment } from '../../src/shared/deployment.js';
import { createToolHandlers } from '../../src/mcp/tools.js';

const hash = `hash-${'1'.repeat(64)}`;
const account = {
  publicKey: `01${'2'.repeat(64)}`,
  accountHash: '3'.repeat(64),
};
const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.cspr.cloud/rpc',
  contracts: {
    mockCsprUsd: { packageHash: hash, contractHash: hash },
    bondVault: { packageHash: hash, contractHash: hash },
    controller: { packageHash: hash, contractHash: hash },
    invoicePool: { packageHash: hash, contractHash: hash },
  },
  accounts: {
    deployer: account,
    agent: account,
    challenger: account,
    watchdog: account,
  },
} as Deployment;

describe('MCP tool handlers', () => {
  it('reads action, reputation, bond, deployments, and submits challenge', async () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    repository.upsertAction({
      actionId: 8,
      invoiceId: 2048,
      agent: 'account-hash-agent',
      amount: '50000000000000',
      claimHash: 'aa',
      reasoning: 'Delivered',
      reasoningHash: 'bb',
      bondRequired: '2500000000000',
      bondPosted: '2500000000000',
      windowEnd: 20_000,
      status: 'Executed',
      challenger: null,
      challengerType: null,
      reservedForManual: false,
      transactions: {},
    });
    repository.setReputation('account-hash-agent', 3, 1, 20);
    const getBondRequirement = vi
      .fn()
      .mockResolvedValue('2500000000000');
    const challengeAction = vi.fn().mockResolvedValue({
      challenge: 'a'.repeat(64),
      resolve: 'b'.repeat(64),
    });
    const tools = createToolHandlers({
      repository,
      deployment,
      getBondRequirement,
      challengeAction,
    });

    await expect(tools.get_action({ actionId: 8 })).resolves.toMatchObject({
      actionId: 8,
      status: 'Executed',
    });
    await expect(tools.list_actions({})).resolves.toHaveLength(1);
    await expect(
      tools.get_reputation({ agentAddress: 'account-hash-agent' }),
    ).resolves.toMatchObject({ clean: 3, slashed: 1, score: 20 });
    await expect(
      tools.get_bond_requirement({
        amount: '50000000000000',
        agentAddress: 'account-hash-agent',
      }),
    ).resolves.toEqual({
      amount: '50000000000000',
      agentAddress: 'account-hash-agent',
      bondRequired: '2500000000000',
    });
    await expect(tools.get_deployments({})).resolves.toBe(deployment);
    await expect(
      tools.challenge_action({ actionId: 8 }),
    ).resolves.toEqual({
      challenge: 'a'.repeat(64),
      resolve: 'b'.repeat(64),
    });
    expect(getBondRequirement).toHaveBeenCalledWith(
      '50000000000000',
      'account-hash-agent',
    );
    expect(challengeAction).toHaveBeenCalledWith(8);
    database.close();
  });

  it('rejects a missing action or reputation record', async () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    const tools = createToolHandlers({
      repository,
      deployment,
      getBondRequirement: async () => '0',
      challengeAction: async () => ({
        challenge: '',
        resolve: '',
      }),
    });

    await expect(tools.get_action({ actionId: 99 })).rejects.toThrow(
      'action not found',
    );
    await expect(
      tools.get_reputation({ agentAddress: 'missing' }),
    ).rejects.toThrow('reputation not found');
    database.close();
  });
});
