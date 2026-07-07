import { execFileSync } from 'node:child_process';

type HealthProbe = {
  ok?: unknown;
  controller?: unknown;
};

export type StartupProbeInput = {
  port: number;
  pid: number | null;
  command: string | null;
  health: HealthProbe | null;
  expectedController: string;
};

export type StartupClassification =
  | { kind: 'free'; port: number }
  | { kind: 'own-api'; port: number; pid: number | null }
  | {
      kind: 'stale-own-api';
      port: number;
      pid: number | null;
      command: string | null;
    }
  | {
      kind: 'other-process';
      port: number;
      pid: number | null;
      command: string | null;
    };

export function classifyStartupProbe(
  input: StartupProbeInput,
): StartupClassification {
  if (!input.pid) return { kind: 'free', port: input.port };
  if (
    input.health?.ok === true &&
    input.health.controller === input.expectedController
  ) {
    return { kind: 'own-api', port: input.port, pid: input.pid };
  }
  const command = input.command ?? '';
  if (command.includes('src/api/main.ts')) {
    return {
      kind: 'stale-own-api',
      port: input.port,
      pid: input.pid,
      command: input.command,
    };
  }
  return {
    kind: 'other-process',
    port: input.port,
    pid: input.pid,
    command: input.command,
  };
}

function firstListeningPid(port: number): number | null {
  try {
    const output = execFileSync(
      'lsof',
      ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
      .trim()
      .split('\n')
      .filter(Boolean);
    return output.length > 0 ? Number(output[0]) : null;
  } catch {
    return null;
  }
}

function processCommand(pid: number): string | null {
  try {
    return execFileSync('ps', ['-p', String(pid), '-o', 'command='], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

async function healthProbe(port: number): Promise<HealthProbe | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/api/health`, {
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return null;
    return (await response.json()) as HealthProbe;
  } catch {
    return null;
  }
}

export async function inspectStartupPort(
  port: number,
  expectedController: string,
): Promise<StartupClassification> {
  const pid = firstListeningPid(port);
  return classifyStartupProbe({
    port,
    pid,
    command: pid ? processCommand(pid) : null,
    health: pid ? await healthProbe(port) : null,
    expectedController,
  });
}

export function startupDiagnostic(
  classification: StartupClassification,
): string | null {
  if (classification.kind === 'free') return null;
  if (classification.kind === 'own-api') {
    return [
      `Bondsman API is already running on http://127.0.0.1:${classification.port}.`,
      `PID: ${classification.pid ?? 'unknown'}.`,
      'Health check is OK; no new server was started.',
    ].join('\n');
  }
  if (classification.kind === 'stale-own-api') {
    return [
      `Port ${classification.port} is occupied by a stale Bondsman API process.`,
      `PID: ${classification.pid ?? 'unknown'}.`,
      classification.command
        ? `Command: ${classification.command}.`
        : 'Command: unavailable.',
      `Recovery: stop that process, then run npm run api again.`,
    ].join('\n');
  }
  return [
    `Port ${classification.port} is occupied by another process.`,
    `PID: ${classification.pid ?? 'unknown'}.`,
    classification.command
      ? `Command: ${classification.command}.`
      : 'Command: unavailable.',
    `Recovery: free port ${classification.port} or start the API with PORT=<free-port> npm run api.`,
  ].join('\n');
}
