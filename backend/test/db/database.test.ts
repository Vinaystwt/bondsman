import { describe, expect, it } from 'vitest';
import { openDatabase } from '../../src/db/database.js';
import { Repository } from '../../src/db/repositories.js';

describe('database projection', () => {
  it('migrates and idempotently upserts events and actions', () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    repository.upsertAction({
      actionId: 3,
      invoiceId: 1045,
      agent: 'account-hash-agent',
      amount: '100',
      claimHash: 'aa',
      reasoning: 'Delivered',
      reasoningHash: 'bb',
      bondRequired: '2',
      bondPosted: '2',
      windowEnd: 123,
      status: 'Executed',
      challenger: null,
      transactions: { execute: 'cc' },
    });
    const event = {
      contract: 'BondsmanController',
      eventIndex: 1,
      eventType: 'ActionExecuted',
      actionId: 3,
      data: '{}',
      transactionHash: null,
    };
    repository.upsertEvent(event);
    repository.upsertEvent(event);

    expect(repository.listActions()).toHaveLength(1);
    expect(repository.eventsForAction(3)).toHaveLength(1);
    database.close();
  });

  it('selects only expired clean actions', () => {
    const database = openDatabase(':memory:');
    const repository = new Repository(database);
    for (const [actionId, status, windowEnd] of [
      [1, 'Executed', 100],
      [2, 'Challenged', 100],
      [3, 'Executed', 300],
    ] as const) {
      repository.upsertAction({
        actionId,
        invoiceId: actionId,
        agent: 'agent',
        amount: '1',
        claimHash: 'aa',
        reasoning: '',
        reasoningHash: 'bb',
        bondRequired: '1',
        bondPosted: '1',
        windowEnd,
        status,
        challenger: null,
        transactions: {},
      });
    }
    expect(repository.expiredCleanActions(200)).toEqual([1]);
    database.close();
  });
});
