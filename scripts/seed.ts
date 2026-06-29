import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../backend/src/config/env.js';
import { deploymentSchema } from '../backend/src/shared/deployment.js';
import { demoInvoices } from '../backend/src/shared/invoices.js';
import {
  bytesArgument,
  callContract,
  readContract,
} from '../backend/src/casper/odra-cli.js';
import {
  chainActions,
  executeBondedInvoice,
  type BondedTransactions,
} from '../backend/src/casper/actions.js';
import {
  ensureSubaccountKeys,
  loadPrivateKey,
} from '../backend/src/casper/keys.js';
import { createRpcClient } from '../backend/src/casper/rpc.js';
import {
  fundToTarget,
  SUBACCOUNT_TARGET_MOTES,
} from '../backend/src/casper/funding.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(repository, '.env'), quiet: true });

export interface SeedState {
  baseline: {
    actionId: number;
    transactions: BondedTransactions;
  };
  duplicate: {
    actionId: number;
    transactions: BondedTransactions;
    challenge: string;
  };
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, path);
}

export async function seed(): Promise<SeedState> {
  const config = loadConfig();
  const deployment = deploymentSchema.parse(
    JSON.parse(
      await readFile(
        join(repository, 'deployments/testnet.json'),
        'utf8',
      ),
    ),
  );
  const deployerPath = resolve(config.deployerSecretKeyPath);
  const deployer = await loadPrivateKey(deployerPath);
  const keys = await ensureSubaccountKeys(join(repository, '.keys'));
  const rpc = createRpcClient(config);
  await fundToTarget(
    rpc,
    deployer,
    keys.agent.publicKey,
    SUBACCOUNT_TARGET_MOTES,
  );
  await fundToTarget(
    rpc,
    deployer,
    keys.challenger.publicKey,
    SUBACCOUNT_TARGET_MOTES,
  );
  for (const invoice of demoInvoices) {
    try {
      await readContract({
        repository,
        config,
        signerPath: deployerPath,
        contract: 'InvoicePool',
        entrypoint: 'get_invoice',
        arguments: ['--invoice_id', String(invoice.id)],
      });
    } catch {
      await callContract({
        repository,
        config,
        signerPath: deployerPath,
        contract: 'InvoicePool',
        entrypoint: 'submit_invoice',
        arguments: [
          '--invoice_id',
          String(invoice.id),
          '--amount',
          invoice.amount,
          '--vendor',
          invoice.vendor,
          '--claim_hash',
          bytesArgument(Buffer.from(invoice.claimHash, 'hex')),
        ],
      });
    }
  }
  await writeJson(
    join(repository, '.data/seed-invoices.json'),
    demoInvoices,
  );

  const options = { repository, config, deployment };
  let actions = await chainActions(options);
  let baseline = actions.find((action) => action.invoiceId === 1045);
  let baselineTransactions: BondedTransactions;
  if (!baseline) {
    const executed = await executeBondedInvoice(
      demoInvoices[0]!,
      'Delivery confirmed; amount positive; invoice due.',
      options,
    );
    baseline = {
      actionId: executed.actionId,
      invoiceId: 1045,
      windowEnd: 0,
      status: 'Executed',
    };
    baselineTransactions = executed.transactions;
  } else {
    baselineTransactions = {} as BondedTransactions;
  }

  actions = await chainActions(options);
  let duplicate = actions.find((action) => action.invoiceId === 1046);
  let duplicateTransactions: BondedTransactions;
  if (!duplicate) {
    const executed = await executeBondedInvoice(
      demoInvoices[1]!,
      'Delivery confirmed; amount positive; invoice due.',
      options,
    );
    duplicate = {
      actionId: executed.actionId,
      invoiceId: 1046,
      windowEnd: 0,
      status: 'Executed',
    };
    duplicateTransactions = executed.transactions;
  } else {
    duplicateTransactions = {} as BondedTransactions;
  }
  const current = (await chainActions(options)).find(
    (action) => action.actionId === duplicate!.actionId,
  )!;
  let challenge = '';
  if (current.status === 'Executed') {
    challenge = await callContract({
      repository,
      config,
      signerPath: join(repository, '.keys/challenger.pem'),
      contract: 'BondsmanController',
      entrypoint: 'challenge_action',
      arguments: ['--action_id', String(current.actionId)],
    });
  }
  const prior = await (async () => {
    try {
      return JSON.parse(
        await readFile(join(repository, '.data/seed-state.json'), 'utf8'),
      ) as SeedState;
    } catch {
      return undefined;
    }
  })();
  const state: SeedState = {
    baseline: {
      actionId: baseline.actionId,
      transactions:
        Object.keys(baselineTransactions).length > 0
          ? baselineTransactions
          : prior?.baseline.transactions ?? baselineTransactions,
    },
    duplicate: {
      actionId: duplicate.actionId,
      transactions:
        Object.keys(duplicateTransactions).length > 0
          ? duplicateTransactions
          : prior?.duplicate.transactions ?? duplicateTransactions,
      challenge: challenge || prior?.duplicate.challenge || '',
    },
  };
  await writeJson(join(repository, '.data/seed-state.json'), state);
  return state;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(JSON.stringify(await seed(), null, 2));
}
