import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  KeyAlgorithm,
  PrivateKey,
  type PrivateKeyInstance,
} from './sdk.js';

export interface AccountMetadata {
  publicKey: string;
  accountHash: string;
}

export function keyMetadata(privateKey: PrivateKeyInstance): AccountMetadata {
  return {
    publicKey: privateKey.publicKey.toHex(),
    accountHash: privateKey.publicKey.accountHash().toHex(),
  };
}

async function loadPem(path: string): Promise<PrivateKeyInstance> {
  const pem = await readFile(path, 'utf8');
  for (const algorithm of [
    KeyAlgorithm.ED25519,
    KeyAlgorithm.SECP256K1,
  ]) {
    try {
      return PrivateKey.fromPem(pem, algorithm);
    } catch {
      // Try the other Casper key algorithm.
    }
  }
  throw new Error(`unable to parse Casper private key at ${path}`);
}

async function ensureKey(path: string): Promise<PrivateKeyInstance> {
  try {
    return await loadPem(path);
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !('code' in error) ||
      error.code !== 'ENOENT'
    ) {
      throw error;
    }
  }

  const generated = PrivateKey.generate(KeyAlgorithm.ED25519);
  try {
    await writeFile(path, generated.toPem(), {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });
    return generated;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      error.code === 'EEXIST'
    ) {
      return loadPem(path);
    }
    throw error;
  }
}

export async function ensureNamedKey(
  directory: string,
  name: string,
): Promise<PrivateKeyInstance> {
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    throw new Error('invalid Casper account key name');
  }
  await mkdir(directory, { recursive: true, mode: 0o700 });
  return ensureKey(join(directory, `${name}.pem`));
}

export interface SubaccountKeys {
  agent: PrivateKeyInstance;
  challenger: PrivateKeyInstance;
}

export async function ensureSubaccountKeys(
  directory: string,
): Promise<SubaccountKeys> {
  const [agent, challenger] = await Promise.all([
    ensureNamedKey(directory, 'agent'),
    ensureNamedKey(directory, 'challenger'),
  ]);
  return { agent, challenger };
}

export async function loadPrivateKey(
  path: string,
): Promise<PrivateKeyInstance> {
  return loadPem(path);
}
