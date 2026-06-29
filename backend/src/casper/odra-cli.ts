import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const TRANSACTION_PATTERN =
  /Transaction "([0-9a-f]{64})" successfully executed\./;

export interface OdraCommandOptions {
  repository: string;
  config: BondsmanConfig;
  signerPath: string;
  arguments: string[];
  json?: boolean;
}

export function bytesArgument(bytes: Uint8Array): string {
  return [...bytes].join(',');
}

export function transactionHash(output: string): string {
  const hash = output.replace(ANSI_PATTERN, '').match(
    TRANSACTION_PATTERN,
  )?.[1];
  if (!hash) throw new Error('Odra did not report a confirmed transaction');
  return hash;
}

export function runOdraCommand(
  options: OdraCommandOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    const child = spawn(
      join(
        options.repository,
        'contracts/target/debug/bondsman_cli',
      ),
      [
        ...(options.json ? ['--json'] : []),
        ...options.arguments,
      ],
      {
        cwd: join(options.repository, 'contracts'),
        env: {
          ...process.env,
          ODRA_CASPER_LIVENET_SECRET_KEY_PATH: options.signerPath,
          ODRA_CASPER_LIVENET_NODE_ADDRESS:
            options.config.nodeAddress,
          ODRA_CASPER_LIVENET_EVENTS_URL: options.config.eventsUrl,
          ODRA_CASPER_LIVENET_CHAIN_NAME: options.config.chainName,
          ...(options.config.cloudApiKey
            ? {
                ODRA_CASPER_LIVENET_CSPR_CLOUD_AUTH_TOKEN:
                  options.config.cloudApiKey,
              }
            : {}),
        },
      },
    );
    child.stdout.on('data', (chunk: Buffer) => output.push(chunk));
    child.stderr.on('data', (chunk: Buffer) => errors.push(chunk));
    child.once('error', reject);
    child.once('exit', (code) => {
      const stdout = Buffer.concat(output).toString('utf8');
      const stderr = Buffer.concat(errors).toString('utf8');
      if (code === 0) resolve(stdout);
      else {
        reject(
          new Error(
            (stderr || stdout)
              .replace(ANSI_PATTERN, '')
              .trim() || `Odra exited with code ${code}`,
          ),
        );
      }
    });
  });
}

export async function callContract(
  options: Omit<OdraCommandOptions, 'arguments' | 'json'> & {
    contract: string;
    entrypoint: string;
    arguments: string[];
    gas?: string;
  },
): Promise<string> {
  const output = await runOdraCommand({
    repository: options.repository,
    config: options.config,
    signerPath: options.signerPath,
    arguments: [
      'contract',
      options.contract,
      options.entrypoint,
      ...options.arguments,
      '--gas',
      options.gas ?? '50 cspr',
    ],
  });
  return transactionHash(output);
}

export async function readContract<T>(
  options: Omit<OdraCommandOptions, 'arguments' | 'json'> & {
    contract: string;
    entrypoint: string;
    arguments: string[];
  },
): Promise<T> {
  const output = await runOdraCommand({
    repository: options.repository,
    config: options.config,
    signerPath: options.signerPath,
    json: true,
    arguments: [
      'contract',
      options.contract,
      options.entrypoint,
      ...options.arguments,
    ],
  });
  const parsed = JSON.parse(output) as { result: T };
  return parsed.result;
}
