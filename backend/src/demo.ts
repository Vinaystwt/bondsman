import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import {
  persistDemoAgentRun,
  seed,
} from '../../scripts/seed.js';
import { loadConfig } from './config/env.js';
import { deploymentSchema } from './shared/deployment.js';
import { demoInvoices } from './shared/invoices.js';
import {
  chainActions,
  executeBondedInvoice,
  type BondedTransactions,
} from './casper/actions.js';
import { callContract } from './casper/odra-cli.js';
import { readContract } from './casper/odra-cli.js';
import { blake2b256 } from './agent/hashing.js';
import { evidenceFile } from './evidence/store.js';

interface DemoResult {
  duplicate: {
    actionId: number;
    challenge: string;
    resolve: string;
    status: 'ResolvedSlash';
  };
  clean: {
    actionId: number;
    execute: string;
    resolve: string;
    status: 'ResolvedRefund';
  };
}

interface SavedDemo extends DemoResult {
  cleanTransactions?: BondedTransactions;
}

export function formatDemoOutput(result: DemoResult): string {
  return JSON.stringify(result, null, 2);
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const repository = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../..',
  );
  loadDotenv({ path: join(repository, '.env'), quiet: true });
  const config = loadConfig();
  const deployment = deploymentSchema.parse(
    JSON.parse(
      await readFile(
        join(repository, 'deployments/testnet.json'),
        'utf8',
      ),
    ),
  );
  const seedState = await seed();
  const demoSignerPath = join(repository, '.keys/demo-agent.pem');
  const options = {
    repository,
    config,
    deployment,
    signerPath: demoSignerPath,
    agentAccountHash: seedState.agent.accountHash,
  };
  let saved: SavedDemo | undefined;
  try {
    saved = JSON.parse(
      await readFile(
        evidenceFile(
          repository,
          deployment.contracts.controller.contractHash,
          'demo-state.json',
        ),
        'utf8',
      ),
    ) as SavedDemo;
  } catch {
    saved = undefined;
  }

  let actions = await chainActions(options);
  const duplicate = actions.find(
    (action) => action.actionId === seedState.duplicate.actionId,
  )!;
  const savedDuplicate =
    saved?.duplicate.actionId === duplicate.actionId
      ? saved.duplicate
      : undefined;
  let slashResolve = savedDuplicate?.resolve ?? '';
  if (duplicate.status === 'Challenged') {
    slashResolve = await callContract({
      repository,
      config,
      signerPath: join(repository, '.keys/challenger.pem'),
      contract: 'BondsmanController',
      entrypoint: 'resolve_action',
      arguments: ['--action_id', String(duplicate.actionId)],
    });
  }

  actions = await chainActions(options);
  let clean = actions.find(
    (action) => action.invoiceId === demoInvoices[2]!.id,
  );
  const savedClean =
    clean && saved?.clean.actionId === clean.actionId
      ? saved.clean
      : undefined;
  let cleanTransactions = savedClean
    ? saved?.cleanTransactions
    : undefined;
  if (!clean) {
    const executed = await executeBondedInvoice(
      demoInvoices[2]!,
      seedState.decisions.clean.reasoning,
      options,
    );
    cleanTransactions = executed.transactions;
    clean = (await chainActions(options)).find(
      (action) => action.actionId === executed.actionId,
    )!;
  }
  if (clean.status === 'Initiated') {
    const bond = await readContract<string>({
      repository,
      config,
      signerPath: demoSignerPath,
      contract: 'BondsmanController',
      entrypoint: 'get_bond_required',
      arguments: [
        '--amount',
        demoInvoices[2]!.amount,
        '--agent',
        `account-hash-${seedState.agent.accountHash}`,
      ],
    });
    const approve = await callContract({
      repository,
      config,
      signerPath: demoSignerPath,
      contract: 'MockCsprUSD',
      entrypoint: 'approve',
      arguments: [
        '--spender',
        deployment.contracts.bondVault.packageHash,
        '--amount',
        bond,
      ],
    });
    const postBond = await callContract({
      repository,
      config,
      signerPath: demoSignerPath,
      contract: 'BondsmanController',
      entrypoint: 'post_bond',
      arguments: ['--action_id', String(clean.actionId)],
    });
    const execute = await callContract({
      repository,
      config,
      signerPath: demoSignerPath,
      contract: 'BondsmanController',
      entrypoint: 'execute_action',
      arguments: ['--action_id', String(clean.actionId)],
    });
    cleanTransactions = {
      initiate: '',
      approve,
      postBond,
      execute,
    };
    clean = (await chainActions(options)).find(
      (action) => action.actionId === clean!.actionId,
    )!;
  } else if (clean.status === 'Bonded') {
    const execute = await callContract({
      repository,
      config,
      signerPath: demoSignerPath,
      contract: 'BondsmanController',
      entrypoint: 'execute_action',
      arguments: ['--action_id', String(clean.actionId)],
    });
    cleanTransactions = {
      initiate: '',
      approve: '',
      postBond: '',
      execute,
    };
    clean = (await chainActions(options)).find(
      (action) => action.actionId === clean!.actionId,
    )!;
  }
  let refundResolve = savedClean?.resolve ?? '';
  if (clean.status === 'Executed') {
    const waitMs = Math.max(0, clean.windowEnd - Date.now() + 1_500);
    if (waitMs > 0) {
      console.log(
        `Waiting ${waitMs} ms for clean action ${clean.actionId}`,
      );
      await new Promise((resolveWait) =>
        setTimeout(resolveWait, waitMs),
      );
    }
    refundResolve = await callContract({
      repository,
      config,
      signerPath: demoSignerPath,
      contract: 'BondsmanController',
      entrypoint: 'resolve_action',
      arguments: ['--action_id', String(clean.actionId)],
    });
  }

  const finalActions = await chainActions(options);
  const finalDuplicate = finalActions.find(
    (action) => action.actionId === duplicate.actionId,
  );
  const finalClean = finalActions.find(
    (action) => action.actionId === clean.actionId,
  );
  if (
    finalDuplicate?.status !== 'ResolvedSlash' ||
    finalClean?.status !== 'ResolvedRefund'
  ) {
    throw new Error('demo terminal state verification failed');
  }
  const result: SavedDemo = {
    duplicate: {
      actionId: duplicate.actionId,
      challenge: seedState.duplicate.challenge,
      resolve: slashResolve,
      status: 'ResolvedSlash',
    },
    clean: {
      actionId: clean.actionId,
      execute:
        cleanTransactions?.execute ?? savedClean?.execute ?? '',
      resolve: refundResolve,
      status: 'ResolvedRefund',
    },
    ...(cleanTransactions ? { cleanTransactions } : {}),
  };
  await writeFile(
    evidenceFile(
      repository,
      deployment.contracts.controller.contractHash,
      'demo-state.json',
    ),
    `${JSON.stringify(result, null, 2)}\n`,
    { mode: 0o600 },
  );
  await persistDemoAgentRun({
    invoiceId: demoInvoices[2]!.id,
    actionId: clean.actionId,
    decision: seedState.decisions.clean.decision,
    reasoning: seedState.decisions.clean.reasoning,
    reasoningHash: blake2b256(
      seedState.decisions.clean.reasoning,
    ).toString('hex'),
    confidence: seedState.decisions.clean.confidence,
    transactions: cleanTransactions ?? {},
  }, deployment.contracts.controller.contractHash);
  console.log(formatDemoOutput(result));
}
