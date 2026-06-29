import { describe, expect, it } from 'vitest';
import { formatDemoOutput } from '../src/demo.js';

describe('formatDemoOutput', () => {
  it('prints transaction hashes for slash and refund paths', () => {
    const output = formatDemoOutput({
      duplicate: {
        actionId: 2,
        challenge: 'a'.repeat(64),
        resolve: 'b'.repeat(64),
        status: 'ResolvedSlash',
      },
      clean: {
        actionId: 3,
        execute: 'c'.repeat(64),
        resolve: 'd'.repeat(64),
        status: 'ResolvedRefund',
      },
    });
    expect(output).toContain('ResolvedSlash');
    expect(output).toContain('a'.repeat(64));
    expect(output).toContain('ResolvedRefund');
    expect(output).toContain('d'.repeat(64));
  });
});
