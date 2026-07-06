import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  readActionEvidence,
  writeActionEvidence,
  clearLegacyEvidence,
} from '../../src/evidence/store.js';

describe('controller-scoped evidence', () => {
  it('never returns an action-id collision from another controller', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'bondsman-evidence-'));
    const oldController = `hash-${'1'.repeat(64)}`;
    const currentController = `hash-${'2'.repeat(64)}`;
    await writeActionEvidence(repository, oldController, {
      invoiceId: 10,
      actionId: 6,
      decision: 'approve',
      reasoning: 'old',
      reasoningHash: 'a'.repeat(64),
      confidence: 1,
      transactions: { execute: 'b'.repeat(64) },
    });

    expect(
      await readActionEvidence(repository, currentController, 6),
    ).toBeUndefined();
    expect(
      await readActionEvidence(repository, oldController, 6),
    ).toMatchObject({ controllerHash: oldController, actionId: 6 });
    await rm(repository, { recursive: true });
  });

  it('clears only the three unsafe unscoped evidence files', async () => {
    const repository = await mkdtemp(join(tmpdir(), 'bondsman-legacy-'));
    await mkdir(join(repository, '.data'));
    await Promise.all(
      ['agent-runs.json', 'seed-state.json', 'demo-state.json', 'keep.json'].map(
        (name) => writeFile(join(repository, '.data', name), '{}'),
      ),
    );
    await clearLegacyEvidence(repository);
    await expect(
      readFile(join(repository, '.data', 'agent-runs.json')),
    ).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(
      readFile(join(repository, '.data', 'keep.json'), 'utf8'),
    ).resolves.toBe('{}');
    await rm(repository, { recursive: true });
  });
});
