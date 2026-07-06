import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  persistAgentRun,
  type AgentRun,
} from '../../src/agent/runner.js';

describe('persistAgentRun', () => {
  it('replaces stale evidence when a fresh controller reuses an action id', async () => {
    const repository = await mkdtemp(
      join(tmpdir(), 'bondsman-runner-'),
    );
    const run = (invoiceId: number): AgentRun => ({
      invoiceId,
      actionId: 0,
      decision: 'approve',
      reasoning: `Invoice ${invoiceId}`,
      reasoningHash: 'a'.repeat(64),
      confidence: 1,
      transactions: {},
    });

    const controller = `hash-${'1'.repeat(64)}`;
    await persistAgentRun(repository, controller, run(100));
    await persistAgentRun(repository, controller, run(200));

    const saved = JSON.parse(
      await readFile(
        join(repository, '.evidence', '1'.repeat(64), '0.json'),
        'utf8',
      ),
    ) as { controllerHash: string; run: AgentRun };
    expect(saved.controllerHash).toBe(controller);
    expect(saved.run.invoiceId).toBe(200);
    await rm(repository, { recursive: true });
  });
});
