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
import { activeContracts, v2Enabled } from '../backend/src/casper/contracts.js';
import {
  chainActions,
  executeBondedInvoice,
  type BondedTransactions,
} from '../backend/src/casper/actions.js';
import {
  ensureSubaccountKeys,
  keyMetadata,
  loadPrivateKey,
  type AccountMetadata,
} from '../backend/src/casper/keys.js';
import {
  KeyAlgorithm,
  PrivateKey,
} from '../backend/src/casper/sdk.js';
import { createRpcClient } from '../backend/src/casper/rpc.js';
import {
  fundToTarget,
  SUBACCOUNT_TARGET_MOTES,
} from '../backend/src/casper/funding.js';
import { requestDecision } from '../backend/src/agent/anthropic.js';
import type { AgentDecision } from '../backend/src/agent/decision.js';
import {
  blake2b256,
} from '../backend/src/agent/hashing.js';
import {
  persistAgentRun,
  type AgentRun,
} from '../backend/src/agent/runner.js';
import { evidenceFile } from '../backend/src/evidence/store.js';

const repository = resolve(dirname(fileURLToPath(import.meta.url)), '..');
loadDotenv({ path: join(repository, '.env'), quiet: true });

export interface SeedState {
  agent: AccountMetadata;
  decisions: {
    baseline: AgentDecision;
    duplicate: AgentDecision;
    clean: AgentDecision;
  };
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

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    mode: 0o600,
  });
  await rename(temporary, path);
}

async function ensureDemoAgent(path: string) {
  try {
    return await loadPrivateKey(path);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }
  const generated = PrivateKey.generate(KeyAlgorithm.ED25519);
  await writeFile(path, generated.toPem(), {
    encoding: 'utf8',
    mode: 0o600,
    flag: 'wx',
  });
  return generated;
}

async function loadDecisions(): Promise<SeedState['decisions']> {
  const path = join(repository, '.data/demo-decisions.json');
  let cached: Partial<Record<string, AgentDecision>> = {};
  try {
    cached = JSON.parse(await readFile(path, 'utf8')) as Partial<
      Record<string, AgentDecision>
    >;
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }
  const apiKey = requiredEnvironment('ANTHROPIC_API_KEY');
  const model =
    process.env.AGENT_LLM_MODEL?.trim() ||
    'claude-haiku-4-5-20251001';
  const names = ['baseline', 'duplicate', 'clean'] as const;
  for (const [index, name] of names.entries()) {
    if (!cached[name]) {
      cached[name] = await requestDecision(
        demoInvoices[index]!,
        apiKey,
        model,
      );
      await writeJson(path, cached);
    }
    if (cached[name]?.decision !== 'approve') {
      throw new Error(`Anthropic rejected the ${name} demo invoice`);
    }
  }
  return cached as SeedState['decisions'];
}

export async function persistDemoAgentRun(
  run: AgentRun,
  controllerHash: string,
): Promise<void> {
  await persistAgentRun(repository, controllerHash, run);
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
  const contracts = activeContracts(deployment);
  const deployer = await loadPrivateKey(deployerPath);
  const keys = await ensureSubaccountKeys(join(repository, '.keys'));
  const demoSignerPath = join(repository, '.keys/demo-agent.pem');
  const demoAgent = await ensureDemoAgent(demoSignerPath);
  const demoAgentMetadata = keyMetadata(demoAgent);
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
    demoAgent.publicKey,
    SUBACCOUNT_TARGET_MOTES,
  );
  const demoAgentAddress =
    `account-hash-${demoAgentMetadata.accountHash}`;
  const tokenTarget = 100_000n * 1_000_000_000n;
  const tokenBalance = BigInt(
    await readContract<string>({
      repository,
      config,
      signerPath: deployerPath,
      contract: 'MockCsprUSD',
      entrypoint: 'balance_of',
      arguments: ['--address', demoAgentAddress],
    }),
  );
  if (tokenBalance < tokenTarget) {
    await callContract({
      repository,
      config,
      signerPath: deployerPath,
      contract: 'MockCsprUSD',
      entrypoint: 'mint',
      arguments: [
        '--to',
        demoAgentAddress,
        '--amount',
        (tokenTarget - tokenBalance).toString(),
      ],
    });
  }
  const decisions = await loadDecisions();
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
        contract: contracts.pool,
        entrypoint: 'get_invoice',
        arguments: ['--invoice_id', String(invoice.id)],
      });
    } catch {
      await callContract({
        repository,
        config,
        signerPath: deployerPath,
        contract: contracts.pool,
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
          ...(v2Enabled(deployment)
            ? [
                '--purchase_order_hash',
                bytesArgument(Buffer.alloc(32)),
                '--expected_delivery_deadline',
                '0',
                '--buyer_signature_pubkey',
                bytesArgument(Buffer.alloc(32)),
              ]
            : []),
        ],
      });
    }
  }
  await writeJson(
    join(repository, '.data/seed-invoices.json'),
    demoInvoices,
  );

  const options = {
    repository,
    config,
    deployment,
    signerPath: demoSignerPath,
    agentAccountHash: demoAgentMetadata.accountHash,
  };
  let actions = await chainActions(options);
  let baseline = actions.find(
    (action) => action.invoiceId === demoInvoices[0]!.id,
  );
  let baselineTransactions: BondedTransactions;
  if (!baseline) {
    const executed = await executeBondedInvoice(
      demoInvoices[0]!,
      decisions.baseline.reasoning,
      options,
    );
    baseline = {
      actionId: executed.actionId,
      invoiceId: demoInvoices[0]!.id,
      windowEnd: 0,
      status: 'Executed',
    };
    baselineTransactions = executed.transactions;
  } else {
    baselineTransactions = {} as BondedTransactions;
  }

  actions = await chainActions(options);
  let duplicate = actions.find(
    (action) => action.invoiceId === demoInvoices[1]!.id,
  );
  let duplicateTransactions: BondedTransactions;
  if (!duplicate) {
    const executed = await executeBondedInvoice(
      demoInvoices[1]!,
      decisions.duplicate.reasoning,
      options,
    );
    duplicate = {
      actionId: executed.actionId,
      invoiceId: demoInvoices[1]!.id,
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
      contract: contracts.controller,
      entrypoint: 'challenge_action',
      arguments: [
        '--action_id',
        String(current.actionId),
        ...(v2Enabled(deployment)
          ? [
              '--fault_class',
              'duplicate_claim',
              '--evidence',
              '0',
            ]
          : []),
      ],
    });
  }
  const prior = await (async () => {
    try {
      return JSON.parse(
        await readFile(
          evidenceFile(
            repository,
            deployment.contracts.controller.contractHash,
            'seed-state.json',
          ),
          'utf8',
        ),
      ) as SeedState;
    } catch {
      return undefined;
    }
  })();
  const state: SeedState = {
    agent: demoAgentMetadata,
    decisions,
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
  await writeJson(
    evidenceFile(
      repository,
      deployment.contracts.controller.contractHash,
      'seed-state.json',
    ),
    state,
  );
  for (const [invoice, action, decision, transactions] of [
    [
      demoInvoices[0]!,
      state.baseline,
      decisions.baseline,
      state.baseline.transactions,
    ],
    [
      demoInvoices[1]!,
      state.duplicate,
      decisions.duplicate,
      state.duplicate.transactions,
    ],
  ] as const) {
    await persistDemoAgentRun({
      invoiceId: invoice.id,
      actionId: action.actionId,
      decision: decision.decision,
      reasoning: decision.reasoning,
      reasoningHash: blake2b256(decision.reasoning).toString('hex'),
      confidence: decision.confidence,
      transactions,
    }, deployment.contracts.controller.contractHash);
  }
  return state;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  console.log(JSON.stringify(await seed(), null, 2));
}
