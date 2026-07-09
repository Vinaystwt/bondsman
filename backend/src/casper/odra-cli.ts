import { spawn } from 'node:child_process';
import { join } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';
import { publicFallbackConfig } from '../config/env.js';

const ANSI_PATTERN = /\u001b\[[0-9;]*m/g;
const TRANSACTION_PATTERN =
  /Transaction "([0-9a-f]{64})" successfully executed\./;
const RATE_LIMIT_BASE_DELAY_MS = 5_000;
const RATE_LIMIT_MAX_DELAY_MS = 60_000;
const rateLimitUntilByEndpoint = new Map<string, number>();
const rateLimitFailuresByEndpoint = new Map<string, number>();

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

export function isRateLimitedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /\b429\b|too many requests|rate.?limit/i.test(error.message);
}

function endpointCooldownError(endpoint: string, retryAt: number): Error {
  return new Error(
    `Casper RPC rate limited at ${endpoint}; retry after ${new Date(retryAt).toISOString()}`,
  );
}

function recordRateLimit(endpoint: string): void {
  const failures = (rateLimitFailuresByEndpoint.get(endpoint) ?? 0) + 1;
  const delay = Math.min(
    RATE_LIMIT_BASE_DELAY_MS * 2 ** (failures - 1),
    RATE_LIMIT_MAX_DELAY_MS,
  );
  const jitter = Math.round(delay * Math.random() * 0.2);
  rateLimitFailuresByEndpoint.set(endpoint, failures);
  rateLimitUntilByEndpoint.set(endpoint, Date.now() + delay + jitter);
}

function clearRateLimit(endpoint: string): void {
  rateLimitFailuresByEndpoint.delete(endpoint);
  rateLimitUntilByEndpoint.delete(endpoint);
}

export function canFallbackTransaction(
  error: unknown,
  config: BondsmanConfig,
): boolean {
  if (!config.cloudApiKey || !(error instanceof Error)) return false;
  return (
    isRateLimitedError(error) ||
    /HTTP status client error \((401 Unauthorized|403 Forbidden)\)/.test(
      error.message,
    )
  );
}

export function runOdraCommand(
  options: OdraCommandOptions,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const retryAt = rateLimitUntilByEndpoint.get(options.config.nodeAddress);
    if (retryAt && retryAt > Date.now()) {
      reject(endpointCooldownError(options.config.nodeAddress, retryAt));
      return;
    }
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
      if (code === 0) {
        clearRateLimit(options.config.nodeAddress);
        resolve(stdout);
        return;
      }
      const error = new Error(
        (stderr || stdout)
          .replace(ANSI_PATTERN, '')
          .trim() || `Odra exited with code ${code}`,
      );
      if (isRateLimitedError(error)) {
        recordRateLimit(options.config.nodeAddress);
      }
      reject(error);
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
  const command = (config: BondsmanConfig) =>
    runOdraCommand({
      repository: options.repository,
      config,
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
  const output = await command(options.config).catch((error) => {
    if (!canFallbackTransaction(error, options.config)) throw error;
    return command(publicFallbackConfig(options.config));
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
  const command = (config: BondsmanConfig) =>
    runOdraCommand({
      repository: options.repository,
      config,
      signerPath: options.signerPath,
      json: true,
      arguments: [
        'contract',
        options.contract,
        options.entrypoint,
        ...options.arguments,
      ],
    });
  const output = await command(options.config).catch((error) => {
    if (!options.config.cloudApiKey) throw error;
    return command(publicFallbackConfig(options.config));
  });
  const parsed = JSON.parse(output) as { result: T };
  return parsed.result;
}

export interface OdraEvent {
  index: number;
  data: string;
}

export async function readEvents(
  options: Omit<OdraCommandOptions, 'arguments' | 'json'> & {
    contract: string;
    count?: number;
  },
): Promise<OdraEvent[]> {
  const command = (config: BondsmanConfig) =>
    runOdraCommand({
      repository: options.repository,
      config,
      signerPath: options.signerPath,
      json: true,
      arguments: [
        'print-events',
        options.contract,
        '--number',
        String(options.count ?? 49),
      ],
    });
  const output = await command(options.config).catch((error) => {
    if (!options.config.cloudApiKey) throw error;
    return command(publicFallbackConfig(options.config));
  });
  const parsed = JSON.parse(output) as { events: OdraEvent[] };
  return parsed.events;
}
