import { describe, expect, it, vi } from 'vitest';
import { waitForDeploy } from '../../src/casper/deploys.js';

describe('waitForDeploy', () => {
  it('polls until a deploy has a successful execution result', async () => {
    const getDeploy = vi
      .fn()
      .mockResolvedValueOnce({ execution_results: [] })
      .mockResolvedValueOnce({
        execution_results: [{ result: { Success: { cost: '1' } } }],
      });

    const result = await waitForDeploy(getDeploy, 'abc', {
      intervalMs: 0,
      maxAttempts: 3,
    });

    expect(result.success).toBe(true);
    expect(getDeploy).toHaveBeenCalledTimes(2);
  });

  it('throws the on-chain failure reason', async () => {
    const getDeploy = vi.fn().mockResolvedValue({
      execution_results: [
        { result: { Failure: { error_message: 'revert' } } },
      ],
    });

    await expect(
      waitForDeploy(getDeploy, 'def', {
        intervalMs: 0,
        maxAttempts: 1,
      }),
    ).rejects.toThrow('revert');
  });
});
