import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { seed } from '../../scripts/seed.js';
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
  const options = { repository, config, deployment };
  const seedState = await seed();
  let saved: SavedDemo | undefined;
  try {
    saved = JSON.parse(
      await readFile(join(repository, '.data/demo-state.json'), 'utf8'),
    ) as SavedDemo;
  } catch {
    saved = undefined;
  }

  let actions = await chainActions(options);
  const duplicate = actions.find(
    (action) => action.actionId === seedState.duplicate.actionId,
  )!;
  let slashResolve = saved?.duplicate.resolve ?? '';
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
  let clean = actions.find((action) => action.invoiceId === 1047);
  let cleanTransactions = saved?.cleanTransactions;
  if (!clean) {
    const executed = await executeBondedInvoice(
      demoInvoices[2]!,
      'Delivery confirmed; amount positive; invoice due.',
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
      signerPath: join(repository, '.keys/agent.pem'),
      contract: 'BondsmanController',
      entrypoint: 'get_bond_required',
      arguments: [
        '--amount',
        demoInvoices[2]!.amount,
        '--agent',
        `account-hash-${deployment.accounts.agent.accountHash}`,
      ],
    });
    const approve = await callContract({
      repository,
      config,
      signerPath: join(repository, '.keys/agent.pem'),
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
      signerPath: join(repository, '.keys/agent.pem'),
      contract: 'BondsmanController',
      entrypoint: 'post_bond',
      arguments: ['--action_id', String(clean.actionId)],
    });
    const execute = await callContract({
      repository,
      config,
      signerPath: join(repository, '.keys/agent.pem'),
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
      signerPath: join(repository, '.keys/agent.pem'),
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
  let refundResolve = saved?.clean.resolve ?? '';
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
      signerPath: join(repository, '.keys/agent.pem'),
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
        cleanTransactions?.execute ?? saved?.clean.execute ?? '',
      resolve: refundResolve,
      status: 'ResolvedRefund',
    },
    ...(cleanTransactions ? { cleanTransactions } : {}),
  };
  await writeFile(
    join(repository, '.data/demo-state.json'),
    `${JSON.stringify(result, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(formatDemoOutput(result));
}
