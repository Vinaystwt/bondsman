import { describe, expect, it, vi } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';
import { buildServer } from '../../src/api/server.js';
import type { Deployment } from '../../src/shared/deployment.js';

const hash = `hash-${'1'.repeat(64)}`;
const account = {
  publicKey: `01${'2'.repeat(64)}`,
  accountHash: '3'.repeat(64),
};
const deployment = {
  network: 'casper-test',
  chainName: 'casper-test',
  nodeRpcUrl: 'https://node.testnet.casper.network/rpc',
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
  },
} as Deployment;

function fixture() {
  const database = openDatabase(':memory:');
  const repository = new Repository(database);
  repository.upsertAction({
    actionId: 4,
    invoiceId: 1046,
    agent: `account-hash-${account.accountHash}`,
    amount: '100',
    claimHash: 'aa',
    reasoning: 'Delivered',
    reasoningHash: 'bb',
    bondRequired: '2',
    bondPosted: '2',
    windowEnd: 123,
    status: 'Executed',
    challenger: null,
    transactions: { execute: 'c'.repeat(64) },
  });
  repository.setReputation(
    `account-hash-${account.accountHash}`,
    1,
    0,
    10,
  );
  repository.setReserve('25');
  const resolution = {
    challengeAndResolve: vi
      .fn()
      .mockResolvedValue({
        challenge: 'a'.repeat(64),
        resolve: 'b'.repeat(64),
      }),
    resolve: vi.fn().mockResolvedValue('d'.repeat(64)),
  };
  return {
    database,
    repository,
    resolution,
    server: buildServer(repository, deployment, resolution),
  };
}

describe('REST routes', () => {
  it('serves actions, detail, agent, reserve, and deployment state', async () => {
    const context = fixture();
    for (const path of [
      '/api/actions',
      '/api/actions/4',
      `/api/agents/account-hash-${account.accountHash}`,
      '/api/reserve',
      '/api/deployments',
      '/api/invoices',
    ]) {
      const response = await context.server.inject(path);
      expect(response.statusCode, path).toBe(200);
    }
    expect(
      (
        await context.server.inject('/api/actions/4')
      ).json().explorerLinks.execute,
    ).toContain('testnet.cspr.live');
    await context.server.close();
    context.database.close();
  });

  it('sequences challenge then resolution and exposes manual resolution', async () => {
    const context = fixture();
    const challenged = await context.server.inject({
      method: 'POST',
      url: '/api/challenge',
      payload: { actionId: 4 },
    });
    expect(challenged.statusCode).toBe(200);
    expect(context.resolution.challengeAndResolve).toHaveBeenCalledWith(4);

    const resolved = await context.server.inject({
      method: 'POST',
      url: '/api/resolve',
      payload: { actionId: 4 },
    });
    expect(resolved.statusCode).toBe(200);
    expect(context.resolution.resolve).toHaveBeenCalledWith(4);
    await context.server.close();
    context.database.close();
  });
});
