import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KeyAlgorithm, PrivateKey } from '../../src/casper/sdk.js';
import {
  ensureNamedKey,
  ensureSubaccountKeys,
  keyMetadata,
} from '../../src/casper/keys.js';

describe('keyMetadata', () => {
  it('derives public and account hashes without exposing private bytes', () => {
    const privateKey = PrivateKey.generate(KeyAlgorithm.ED25519);
    const metadata = keyMetadata(privateKey);

    expect(metadata.publicKey).toMatch(/^01[0-9a-f]{64}$/);
    expect(metadata.accountHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(metadata)).not.toContain('PRIVATE KEY');
  });

  it('creates private keys once with owner-only permissions', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bondsman-keys-'));
    const first = await ensureSubaccountKeys(directory);
    const second = await ensureSubaccountKeys(directory);

    expect(keyMetadata(first.agent)).toEqual(keyMetadata(second.agent));
    expect(keyMetadata(first.challenger)).toEqual(
      keyMetadata(second.challenger),
    );
    expect(await readFile(join(directory, 'agent.pem'), 'utf8')).toContain(
      'PRIVATE KEY',
    );
    expect((await stat(join(directory, 'agent.pem'))).mode & 0o777).toBe(
      0o600,
    );
  });

  it('creates an idempotent named watchdog key', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'bondsman-watchdog-'));

    const first = await ensureNamedKey(directory, 'watchdog');
    const second = await ensureNamedKey(directory, 'watchdog');

    expect(keyMetadata(first)).toEqual(keyMetadata(second));
    expect(
      await readFile(join(directory, 'watchdog.pem'), 'utf8'),
    ).toContain('PRIVATE KEY');
    expect(
      (await stat(join(directory, 'watchdog.pem'))).mode & 0o777,
    ).toBe(0o600);
  });
});
