import { describe, expect, it } from 'vitest';
import { classifyStartupProbe } from '../../src/api/startup.js';

describe('API startup diagnostics', () => {
  it('recognizes an already running API from health state', () => {
    expect(
      classifyStartupProbe({
        port: 3001,
        pid: 42,
        command: 'node ./node_modules/.bin/tsx src/api/main.ts',
        health: {
          ok: true,
          controller: `hash-${'a'.repeat(64)}`,
        },
        expectedController: `hash-${'a'.repeat(64)}`,
      }),
    ).toEqual({ kind: 'own-api', port: 3001, pid: 42 });
  });

  it('diagnoses a stale Bondsman API process when health is absent', () => {
    expect(
      classifyStartupProbe({
        port: 3001,
        pid: 77,
        command: 'node ./node_modules/.bin/tsx src/api/main.ts',
        health: null,
        expectedController: `hash-${'b'.repeat(64)}`,
      }),
    ).toEqual({
      kind: 'stale-own-api',
      port: 3001,
      pid: 77,
      command: 'node ./node_modules/.bin/tsx src/api/main.ts',
    });
  });
});
