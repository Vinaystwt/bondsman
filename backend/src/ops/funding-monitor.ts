import { join, resolve } from 'node:path';
import type { BondsmanConfig } from '../config/env.js';
import type { Repository } from '../db/repositories.js';
import type { Deployment } from '../shared/deployment.js';
import { fundToTarget } from '../casper/funding.js';
import { loadPrivateKey } from '../casper/keys.js';
import { accountBalanceMotes, createRpcClient } from '../casper/rpc.js';

const CSPR = 1_000_000_000n;
const OPERATING_FLOOR = 100n * CSPR;
const OPERATING_TARGET = 500n * CSPR;
const DEPLOYER_ALERT_FLOOR = 5_000n * CSPR;

export interface FundingMonitor {
  check(): Promise<void>;
  start(): () => void;
}

export function createFundingMonitor(options: {
  repositoryPath: string;
  config: BondsmanConfig;
  deployment: Deployment;
  repository: Repository;
  intervalMs?: number;
  log?: (entry: Record<string, unknown>) => void;
}): FundingMonitor {
  const intervalMs = options.intervalMs ?? 60 * 60_000;
  const log = options.log ?? console.log;
  let active: Promise<void> | undefined;

  const check = async () => {
    if (active) return active;
    active = (async () => {
      const rpc = createRpcClient(options.config);
      const deployer = await loadPrivateKey(resolve(options.config.deployerSecretKeyPath));
      const accounts = {
        agent: await loadPrivateKey(join(options.repositoryPath, '.keys/agent.pem')),
        watchdog: await loadPrivateKey(join(options.repositoryPath, '.keys/watchdog.pem')),
        challenger: await loadPrivateKey(join(options.repositoryPath, '.keys/challenger.pem')),
      };
      const deployerBalance = await accountBalanceMotes(rpc, deployer.publicKey);
      const balances: Record<string, string> = { deployer: deployerBalance.toString() };
      const alerts: string[] = [];
      const transfers: Record<string, string> = {};
      if (deployerBalance < DEPLOYER_ALERT_FLOOR) {
        alerts.push('DEPLOYER_CSPR_LOW');
      }
      for (const [name, key] of Object.entries(accounts)) {
        const balance = await accountBalanceMotes(rpc, key.publicKey);
        balances[name] = balance.toString();
        if (balance >= OPERATING_FLOOR) continue;
        if (deployerBalance < DEPLOYER_ALERT_FLOOR) {
          alerts.push(`${name.toUpperCase()}_CSPR_LOW`);
          continue;
        }
        const transaction = await fundToTarget(rpc, deployer, key.publicKey, OPERATING_TARGET);
        if (transaction) transfers[name] = transaction;
      }
      const snapshot = {
        checkedAt: new Date().toISOString(),
        balances,
        alerts,
        transfers,
        operatingFloorMotes: OPERATING_FLOOR.toString(),
        operatingTargetMotes: OPERATING_TARGET.toString(),
        deployerAlertFloorMotes: DEPLOYER_ALERT_FLOOR.toString(),
      };
      options.repository.setSystemState('funding', snapshot);
      log({ event: 'operational_funding_check', ...snapshot });
    })().finally(() => { active = undefined; });
    return active;
  };

  return {
    check,
    start() {
      void check().catch((error) => log({ event: 'operational_funding_failed', error: String(error) }));
      const timer = setInterval(() => {
        void check().catch((error) => log({ event: 'operational_funding_failed', error: String(error) }));
      }, intervalMs);
      return () => clearInterval(timer);
    },
  };
}
