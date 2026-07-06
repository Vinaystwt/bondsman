import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { AgentRun } from '../agent/runner.js';

export interface ActionEvidence {
  controllerHash: string;
  actionId: number;
  run: AgentRun;
}

function controllerDirectoryName(controllerHash: string): string {
  const hash = controllerHash.replace(/^hash-/, '');
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw new Error('invalid controller hash for evidence');
  }
  return hash;
}

export function evidenceDirectory(
  repository: string,
  controllerHash: string,
): string {
  return join(
    repository,
    '.evidence',
    controllerDirectoryName(controllerHash),
  );
}

export function evidenceFile(
  repository: string,
  controllerHash: string,
  name: string,
): string {
  if (!/^[a-z0-9-]+\.json$/.test(name)) {
    throw new Error('invalid evidence file name');
  }
  return join(evidenceDirectory(repository, controllerHash), name);
}

export async function writeActionEvidence(
  repository: string,
  controllerHash: string,
  run: AgentRun,
): Promise<void> {
  if (run.actionId === undefined) return;
  const directory = evidenceDirectory(repository, controllerHash);
  const path = join(directory, `${run.actionId}.json`);
  await mkdir(directory, { recursive: true });
  const evidence: ActionEvidence = {
    controllerHash,
    actionId: run.actionId,
    run,
  };
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(evidence, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, path);
}

export async function readActionEvidence(
  repository: string,
  controllerHash: string,
  actionId: number,
): Promise<ActionEvidence | undefined> {
  const path = join(
    evidenceDirectory(repository, controllerHash),
    `${actionId}.json`,
  );
  try {
    const evidence = JSON.parse(
      await readFile(path, 'utf8'),
    ) as ActionEvidence;
    if (
      evidence.controllerHash !== controllerHash ||
      evidence.actionId !== actionId ||
      evidence.run.actionId !== actionId
    ) {
      return undefined;
    }
    return evidence;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      return undefined;
    }
    throw error;
  }
}

export async function mergeActionTransactions(
  repository: string,
  controllerHash: string,
  actionId: number,
  transactions: Record<string, string>,
): Promise<void> {
  const existing = await readActionEvidence(
    repository,
    controllerHash,
    actionId,
  );
  const run: AgentRun = existing?.run ?? {
    invoiceId: -1,
    actionId,
    decision: 'approve',
    reasoning: '',
    reasoningHash: '',
    confidence: 0,
    transactions: {},
  };
  await writeActionEvidence(repository, controllerHash, {
    ...run,
    transactions: {
      ...run.transactions,
      ...transactions,
    },
  });
}

export async function clearLegacyEvidence(
  repository: string,
): Promise<void> {
  await Promise.all(
    ['agent-runs.json', 'seed-state.json', 'demo-state.json'].map((name) =>
      rm(join(repository, '.data', name), { force: true }),
    ),
  );
}
