#!/usr/bin/env node
// Railway entrypoint. Decodes the existing funded testnet keys from base64
// environment variables into .keys/*.pem (the exact relative paths the
// backend already expects), then execs the service named by START_SCRIPT.
//
// This never generates a new key and never redeploys a contract: the keys
// decoded here are the same ones already used locally, and
// contracts/resources/casper-test-contracts.toml (committed to git) already
// records the live, deployed contract addresses, so the CLI binary built in
// the Docker image only calls existing entry points.

import { mkdir, writeFile, symlink, lstat, rm } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';

// Railway attaches exactly one volume per service. The backend hardcodes
// two persistent directories, .data (SQLite projection) and .evidence
// (evidence store), both relative to the repo root. Symlink both into
// subdirectories of the single mounted volume so both survive restarts
// and redeploys without any change to the backend's path resolution.
const VOLUME_ROOT = process.env.RAILWAY_VOLUME_MOUNT_PATH || '.railway-volume';

async function linkIntoVolume(relativeDir) {
  const target = resolvePath(VOLUME_ROOT, relativeDir);
  await mkdir(target, { recursive: true });
  let stat;
  try {
    stat = await lstat(relativeDir);
  } catch {
    stat = null;
  }
  if (stat?.isSymbolicLink()) return;
  if (stat) await rm(relativeDir, { recursive: true, force: true });
  await symlink(target, relativeDir);
}

const KEY_VARS = {
  DEPLOYER_KEY_B64: 'deployer.pem',
  AGENT_KEY_B64: 'agent.pem',
  CHALLENGER_KEY_B64: 'challenger.pem',
  WATCHDOG_KEY_B64: 'watchdog.pem',
  DEMO_AGENT_KEY_B64: 'demo-agent.pem',
};

async function decodeKeys() {
  await mkdir('.keys', { recursive: true, mode: 0o700 });
  for (const [envVar, filename] of Object.entries(KEY_VARS)) {
    const b64 = process.env[envVar];
    if (!b64) continue;
    const pem = Buffer.from(b64, 'base64').toString('utf8');
    await writeFile(`.keys/${filename}`, pem, { mode: 0o600 });
  }
  if (!process.env.DEPLOYER_SECRET_KEY_PATH) {
    // Absolute: the child process (npm --workspace backend run <script>) may
    // run with a different CWD than this script, and deployerSecretKeyPath
    // is resolved via path.resolve(), which is CWD-relative for non-absolute
    // input.
    process.env.DEPLOYER_SECRET_KEY_PATH = resolvePath(
      process.cwd(),
      '.keys',
      'deployer.pem',
    );
  }
}

async function ensurePersistentDirs() {
  await linkIntoVolume('.data');
  await linkIntoVolume('.evidence');
}

function spawnScript(script) {
  const child = spawn('npm', ['run', script], {
    stdio: 'inherit',
    env: process.env,
  });
  child.on('error', (err) => {
    console.error(`Failed to start "npm run ${script}":`, err);
  });
  return child;
}

// Bondsman's api, listener, and watchdog all read and write the same
// SQLite projection (.data/*.sqlite) and evidence store (.evidence/). SQLite
// over better-sqlite3 is a local file, not a network database, so these
// three processes must share one filesystem. Railway volumes are exclusive
// per service, so splitting them into three separate Railway services would
// give each an empty, disconnected database. Run them as sibling processes
// in one service instead, sharing this container's filesystem and volume.
//
// START_SCRIPT=api|listener|watchdog still runs a single process, if you
// later move to a shared/networked database and want to split services.
const script = process.env.START_SCRIPT;

await decodeKeys();
await ensurePersistentDirs();

if (script) {
  if (!['api', 'listener', 'watchdog'].includes(script)) {
    console.error(
      'START_SCRIPT must be one of "api", "listener", "watchdog", or unset to run all three.',
    );
    process.exit(1);
  }
  const child = spawnScript(script);
  child.on('exit', (code) => process.exit(code ?? 1));
} else {
  const children = ['api', 'listener', 'watchdog'].map(spawnScript);
  let exiting = false;
  const shutdown = (code) => {
    if (exiting) return;
    exiting = true;
    for (const child of children) child.kill('SIGTERM');
    process.exit(code);
  };
  for (const child of children) {
    child.on('exit', (code) => shutdown(code ?? 1));
  }
  process.on('SIGTERM', () => shutdown(0));
  process.on('SIGINT', () => shutdown(0));
}
