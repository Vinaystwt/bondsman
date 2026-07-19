import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '../config/env.js';
import { deploymentSchema } from '../shared/deployment.js';
import { applyActiveControllerVersion } from '../shared/active-deployment.js';
import type { DecisionInvoice } from './prompt.js';
import { runAgent } from './runner.js';

const repository = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../../..',
);
loadDotenv({ path: join(repository, '.env'), quiet: true });

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const deployment = applyActiveControllerVersion(deploymentSchema.parse(
  JSON.parse(
    await readFile(
      join(repository, 'deployments/testnet.json'),
      'utf8',
    ),
  ),
));
const invoice = JSON.parse(
  process.env.AGENT_INVOICE_JSON ??
    (await readFile(
      process.env.AGENT_INVOICE_PATH ??
        join(repository, '.data/pending-invoice.json'),
      'utf8',
    )),
) as DecisionInvoice;

const result = await runAgent(invoice, {
  repository,
  config: loadConfig(),
  deployment,
  apiKey: required('ANTHROPIC_API_KEY'),
  model:
    process.env.AGENT_LLM_MODEL?.trim() ||
    'claude-haiku-4-5-20251001',
});

console.log(JSON.stringify(result, null, 2));
