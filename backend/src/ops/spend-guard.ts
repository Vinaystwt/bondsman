import { basename } from 'node:path';

export interface SpendRecord {
  account: string;
  signerPath: string;
  estimatedMotes: string;
  transactionHash: string | null;
  timestamp: number;
}

export interface SpendAccountSnapshot {
  account: string;
  hourTransactions: number;
  dayTransactions: number;
  hourlyTransactionLimit: number;
  dailyTransactionLimit: number;
  hourMotes: string;
  dayMotes: string;
  hourlyLimitMotes: string;
  dailyLimitMotes: string;
  hourlyPercent: number;
  dailyPercent: number;
  warning: boolean;
  tripped: boolean;
  reason: string | null;
}

export interface SpendSnapshot {
  code: 'SPENDING_OK' | 'SPENDING_CIRCUIT_TRIPPED';
  tripped: boolean;
  warning: boolean;
  accounts: SpendAccountSnapshot[];
}

const CSPR = 1_000_000_000n;
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const history: SpendRecord[] = [];
const trippedAccounts = new Map<string, {
  reason: string;
  recoverAfterMs: number;
}>();

function envMotes(name: string, fallbackMotes: bigint): bigint {
  const raw = process.env[name]?.trim();
  if (!raw) return fallbackMotes;
  if (/^\d+$/.test(raw)) return BigInt(raw);
  const match = raw.match(/^(\d+)(?:\s*cspr)?$/i);
  if (match) return BigInt(match[1]!) * CSPR;
  return fallbackMotes;
}

export function signerAccount(signerPath: string): string {
  const name = basename(signerPath).replace(/\.(pem|secret_key)$/i, '');
  if (/deployer|owner/i.test(name)) return 'deployer';
  if (/watchdog/i.test(name)) return 'watchdog';
  if (/challenger/i.test(name)) return 'challenger';
  if (/integrator/i.test(name)) return 'integrator';
  if (/agent/i.test(name)) return 'agent';
  return name || 'unknown';
}

function hourlyLimit(account: string): bigint {
  return envMotes(
    `TX_BUDGET_${account.toUpperCase()}_HOUR_MOTES`,
    envMotes('TX_BUDGET_PER_HOUR_MOTES', 500n * CSPR),
  );
}

function dailyLimit(account: string): bigint {
  return envMotes(
    `TX_BUDGET_${account.toUpperCase()}_DAY_MOTES`,
    envMotes('TX_BUDGET_PER_DAY_MOTES', 5_000n * CSPR),
  );
}

function envInteger(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function hourlyTransactionLimit(account: string): number {
  return envInteger(
    `TX_BUDGET_${account.toUpperCase()}_HOUR`,
    envInteger('TX_BUDGET_PER_HOUR', 50),
  );
}

function dailyTransactionLimit(account: string): number {
  return envInteger(
    `TX_BUDGET_${account.toUpperCase()}_DAY`,
    envInteger('TX_BUDGET_PER_DAY', 500),
  );
}

function estimateMotes(value?: string | number): bigint {
  if (typeof value === 'number') return BigInt(Math.ceil(value));
  if (!value) return 50n * CSPR;
  const match = value.trim().match(/^(\d+)(?:\s*cspr)?$/i);
  if (!match) return 50n * CSPR;
  return BigInt(match[1]!) * CSPR;
}

function prune(now = Date.now()): void {
  while (history.length && now - history[0]!.timestamp > DAY_MS) {
    history.shift();
  }
}

function usage(account: string, periodMs: number, now = Date.now()): bigint {
  prune(now);
  return history
    .filter((record) => record.account === account && now - record.timestamp <= periodMs)
    .reduce((sum, record) => sum + BigInt(record.estimatedMotes), 0n);
}

function transactionCount(account: string, periodMs: number, now = Date.now()): number {
  prune(now);
  return history.filter(
    (record) => record.account === account && now - record.timestamp <= periodMs,
  ).length;
}

export function assertSpendAllowed(input: {
  signerPath: string;
  gas?: string | number;
  now?: number;
}): void {
  const account = signerAccount(input.signerPath);
  const now = input.now ?? Date.now();
  const estimate = estimateMotes(input.gas);
  const hourTotal = usage(account, HOUR_MS, now) + estimate;
  const dayTotal = usage(account, DAY_MS, now) + estimate;
  const hourTransactions = transactionCount(account, HOUR_MS, now) + 1;
  const dayTransactions = transactionCount(account, DAY_MS, now) + 1;
  const hourLimit = hourlyLimit(account);
  const dayLimit = dailyLimit(account);
  const hourTxLimit = hourlyTransactionLimit(account);
  const dayTxLimit = dailyTransactionLimit(account);
  const hourlyViolation =
    hourTransactions > hourTxLimit || hourTotal > hourLimit;
  const dailyViolation =
    dayTransactions > dayTxLimit || dayTotal > dayLimit;
  if (hourlyViolation || dailyViolation) {
    const reason =
      `account=${account}; hourlyTransactions=${hourTransactions}/${hourTxLimit}; ` +
      `dailyTransactions=${dayTransactions}/${dayTxLimit}; hourlyMotes=${hourTotal}/${hourLimit}; dailyMotes=${dayTotal}/${dayLimit}`;
    trippedAccounts.set(account, {
      reason,
      recoverAfterMs: now + (dailyViolation ? DAY_MS : HOUR_MS),
    });
    const error = new Error(`SPENDING_CIRCUIT_TRIPPED: ${reason}`);
    (error as Error & { code?: string }).code = 'SPENDING_CIRCUIT_TRIPPED';
    throw error;
  }
}

export function recordSpend(input: {
  signerPath: string;
  gas?: string | number;
  transactionHash?: string;
  now?: number;
}): void {
  const now = input.now ?? Date.now();
  history.push({
    account: signerAccount(input.signerPath),
    signerPath: input.signerPath,
    estimatedMotes: estimateMotes(input.gas).toString(),
    transactionHash: input.transactionHash ?? null,
    timestamp: now,
  });
  prune(now);
  const account = signerAccount(input.signerPath);
  const snapshot = spendSnapshot(now).accounts.find((item) => item.account === account);
  if (snapshot?.warning) {
    console.warn(JSON.stringify({
      event: 'spending_budget_warning',
      code: 'SPENDING_BUDGET_WARNING',
      account,
      dailyTransactions: snapshot.dayTransactions,
      dailyTransactionLimit: snapshot.dailyTransactionLimit,
      dailyPercent: snapshot.dailyPercent,
    }));
  }
}

export function resetSpendGuard(): void {
  history.splice(0);
  trippedAccounts.clear();
}

export function spendSnapshot(now = Date.now()): SpendSnapshot {
  prune(now);
  for (const [account, trip] of trippedAccounts.entries()) {
    const hour = usage(account, HOUR_MS, now);
    const day = usage(account, DAY_MS, now);
    const hourTransactions = transactionCount(account, HOUR_MS, now);
    const dayTransactions = transactionCount(account, DAY_MS, now);
    if (
      now >= trip.recoverAfterMs &&
      hour < hourlyLimit(account) &&
      day < dailyLimit(account) &&
      hourTransactions < hourlyTransactionLimit(account) &&
      dayTransactions < dailyTransactionLimit(account)
    ) {
      trippedAccounts.delete(account);
    }
  }
  const accounts = new Set<string>([
    ...history.map((record) => record.account),
    ...trippedAccounts.keys(),
    'deployer',
    'agent',
    'challenger',
    'watchdog',
  ]);
  const snapshots = [...accounts].sort().map((account) => {
    const hour = usage(account, HOUR_MS, now);
    const day = usage(account, DAY_MS, now);
    const hourTransactions = transactionCount(account, HOUR_MS, now);
    const dayTransactions = transactionCount(account, DAY_MS, now);
    const hourLimit = hourlyLimit(account);
    const dayLimit = dailyLimit(account);
    const hourTxLimit = hourlyTransactionLimit(account);
    const dayTxLimit = dailyTransactionLimit(account);
    const hourlyPercent = Number((hour * 10_000n) / hourLimit) / 100;
    const dailyPercent = Number((day * 10_000n) / dayLimit) / 100;
    const hourlyTransactionPercent = (hourTransactions / hourTxLimit) * 100;
    const dailyTransactionPercent = (dayTransactions / dayTxLimit) * 100;
    const reason = trippedAccounts.get(account)?.reason ?? null;
    const warning =
      hourlyPercent >= 80 ||
      dailyPercent >= 80 ||
      hourlyTransactionPercent >= 80 ||
      dailyTransactionPercent >= 80;
    return {
      account,
      hourTransactions,
      dayTransactions,
      hourlyTransactionLimit: hourTxLimit,
      dailyTransactionLimit: dayTxLimit,
      hourMotes: hour.toString(),
      dayMotes: day.toString(),
      hourlyLimitMotes: hourLimit.toString(),
      dailyLimitMotes: dayLimit.toString(),
      hourlyPercent,
      dailyPercent,
      warning,
      tripped: Boolean(reason),
      reason,
    };
  });
  const tripped = snapshots.some((account) => account.tripped);
  return {
    code: tripped ? 'SPENDING_CIRCUIT_TRIPPED' : 'SPENDING_OK',
    tripped,
    warning: snapshots.some((account) => account.warning),
    accounts: snapshots,
  };
}
