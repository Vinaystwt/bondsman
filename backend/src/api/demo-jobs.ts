import { randomUUID } from 'node:crypto';
import type { DemoArmService } from './arm.js';
import type { ResolutionService } from './resolution.js';
import type { DemoJobKind, DemoJobRecord, Repository } from '../db/repositories.js';

export interface DemoJobService {
  startChallenge(actionId: number): DemoJobRecord;
  startArm(reservedForManual: boolean): DemoJobRecord;
  job(id: string): DemoJobRecord | undefined;
}

function failure(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createDemoJobService(options: {
  repository: Repository;
  resolution: ResolutionService;
  arm: DemoArmService;
}): DemoJobService {
  const running = new Set<string>();

  const run = (job: DemoJobRecord, work: () => Promise<void>) => {
    if (running.has(job.id)) return;
    running.add(job.id);
    void work()
      .catch((error) => {
        options.repository.updateDemoJob(job.id, {
          status: 'failed',
          error: failure(error),
        });
      })
      .finally(() => running.delete(job.id));
  };

  const startArm = (reservedForManual: boolean) => {
    const kind: DemoJobKind = reservedForManual ? 'arm' : 'watchdog';
    const job = options.repository.createDemoJob({
      id: randomUUID(),
      kind,
      status: 'queued',
    });
    run(job, async () => {
      options.repository.updateDemoJob(job.id, { status: 'arming' });
      const action = await options.arm.arm({ reservedForManual });
      options.repository.updateDemoJob(job.id, {
        actionId: action.actionId,
        status: 'action_ready',
      });
    });
    return job;
  };

  return {
    startChallenge(actionId) {
      const existing = options.repository.activeChallengeJob(actionId);
      if (existing) return existing;
      const job = options.repository.createDemoJob({
        id: randomUUID(),
        kind: 'challenge',
        actionId,
        status: 'queued',
      });
      run(job, async () => {
        options.repository.updateDemoJob(job.id, {
          status: 'submitting_challenge',
        });
        const challenge = await options.resolution.challenge(actionId);
        options.repository.updateDemoJob(job.id, {
          status: 'challenge_finalized',
          challengeTx: challenge,
        });
        options.repository.updateDemoJob(job.id, { status: 'resolving' });
        const resolve = await options.resolution.resolve(actionId, { challenge });
        options.repository.updateDemoJob(job.id, {
          status: 'resolved',
          resolveTx: resolve,
        });
      });
      return job;
    },
    startArm,
    job: (id) => options.repository.demoJob(id),
  };
}
