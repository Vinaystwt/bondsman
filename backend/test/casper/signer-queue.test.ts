import { describe, expect, it } from 'vitest';
import { SignerQueue } from '../../src/casper/signer-queue.js';

describe('SignerQueue', () => {
  it('runs transactions for one signer serially', async () => {
    const queue = new SignerQueue();
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const first = queue.run(async () => {
      events.push('first:start');
      await firstGate;
      events.push('first:end');
      return 1;
    });
    const second = queue.run(async () => {
      events.push('second:start');
      return 2;
    });

    await Promise.resolve();
    expect(events).toEqual(['first:start']);
    releaseFirst();

    await expect(Promise.all([first, second])).resolves.toEqual([1, 2]);
    expect(events).toEqual([
      'first:start',
      'first:end',
      'second:start',
    ]);
  });
});
