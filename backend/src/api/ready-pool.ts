import type { Repository } from '../db/repositories.js';
import type { DemoArmService } from './arm.js';
import { isRateLimitedError } from '../casper/odra-cli.js';
import { READY_CASE_MIN_REMAINING_MS, readyDemoCaseCount } from './demo-ready.js';

const MAX_BACKOFF_MS = 30 * 60 * 1000;

export interface DemoReadyPoolConfig {
  enabled: boolean;
  target: number;
  minWindowMs: number;
  intervalMs: number;
}

export interface DemoReadyPool {
  start(): () => void;
  tick(reason?: string): Promise<void>;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function demoReadyPoolConfig(
  env: NodeJS.ProcessEnv = process.env,
): DemoReadyPoolConfig {
  return {
    enabled: env.DEMO_READY_POOL_ENABLED === 'true',
    target: positiveInteger(env.DEMO_READY_POOL_TARGET, 3),
    minWindowMs:
      positiveInteger(env.DEMO_READY_POOL_MIN_WINDOW_MINUTES, 15) *
      60 *
      1000,
    intervalMs:
      positiveInteger(env.DEMO_READY_POOL_INTERVAL_SECONDS, 300) *
      1000,
  };
}

export function createDemoReadyPool(options: {
  config: DemoReadyPoolConfig;
  repository: Repository;
  controllerHash: string;
  arm: DemoArmService;
  log?: (entry: Record<string, unknown>) => void;
  now?: () => number;
  setInterval?: typeof setInterval;
  clearInterval?: typeof clearInterval;
  random?: () => number;
}): DemoReadyPool {
  const log = options.log ?? console.log;
  const now = options.now ?? Date.now;
  const setIntervalFn = options.setInterval ?? setInterval;
  const clearIntervalFn = options.clearInterval ?? clearInterval;
  const random = options.random ?? Math.random;
  let running = false;
  let timer: ReturnType<typeof setInterval> | null = null;
  let consecutiveFailures = 0;
  let retryNotBeforeMs = 0;

  const tick = async (reason = 'interval') => {
    if (!options.config.enabled) return;
    if (now() < retryNotBeforeMs) {
      log({
        event: 'demo_ready_pool_skip',
        reason,
        cause: 'backoff',
        nextAttemptAt: new Date(retryNotBeforeMs).toISOString(),
        consecutiveFailures,
      });
      return;
    }
    if (running) {
      log({
        event: 'demo_ready_pool_skip',
        reason,
        cause: 'already_running',
      });
      return;
    }

    running = true;
    try {
      const readyCount = readyDemoCaseCount(
        options.repository,
        options.controllerHash,
        now(),
        options.config.minWindowMs,
      );
      log({
        event: 'demo_ready_pool_check',
        reason,
        readyCount,
        target: options.config.target,
        minWindowMs: options.config.minWindowMs,
      });

      if (readyCount >= options.config.target) return;

      const armed = await options.arm.arm({ reservedForManual: true });
      consecutiveFailures = 0;
      retryNotBeforeMs = 0;
      log({
        event: 'demo_ready_pool_armed',
        reason,
        actionId: armed.actionId,
        readyCountBefore: readyCount,
        target: options.config.target,
      });
    } catch (error) {
      consecutiveFailures += 1;
      const delay = Math.min(
        options.config.intervalMs * 2 ** (consecutiveFailures - 1),
        MAX_BACKOFF_MS,
      );
      retryNotBeforeMs = now() + Math.round(delay * (1 + random() * 0.2));
      log({
        event: 'demo_ready_pool_failed',
        reason,
        error: error instanceof Error ? error.message : String(error),
        cause: isRateLimitedError(error) ? 'rpc_rate_limited' : 'arm_failed',
        consecutiveFailures,
        nextAttemptAt: new Date(retryNotBeforeMs).toISOString(),
      });
    } finally {
      running = false;
    }
  };

  return {
    tick,
    start() {
      if (!options.config.enabled) return () => undefined;
      void tick('startup');
      timer = setIntervalFn(() => {
        void tick('interval');
      }, options.config.intervalMs);
      return () => {
        if (!timer) return;
        clearIntervalFn(timer);
        timer = null;
      };
    },
  };
}
