export interface DeployWaitOptions {
  intervalMs: number;
  maxAttempts: number;
}

export interface DeployWaitResult {
  success: true;
  raw: unknown;
}

type GetDeploy = (hash: string) => Promise<unknown>;

function executionResults(value: unknown): unknown[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const results = record.execution_results ?? record.executionResults;
  return Array.isArray(results) ? results : [];
}

function resultRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const result = (value as Record<string, unknown>).result;
  return result && typeof result === 'object'
    ? (result as Record<string, unknown>)
    : undefined;
}

function failureMessage(failure: unknown): string {
  if (!failure || typeof failure !== 'object') return 'deploy failed';
  const record = failure as Record<string, unknown>;
  return String(
    record.error_message ?? record.errorMessage ?? 'deploy failed',
  );
}

export async function waitForDeploy(
  getDeploy: GetDeploy,
  hash: string,
  options: DeployWaitOptions,
): Promise<DeployWaitResult> {
  for (let attempt = 0; attempt < options.maxAttempts; attempt += 1) {
    const raw = await getDeploy(hash);
    for (const execution of executionResults(raw)) {
      const result = resultRecord(execution);
      if (result?.Failure) {
        throw new Error(failureMessage(result.Failure));
      }
      if (result?.Success) {
        return { success: true, raw };
      }
    }
    if (attempt + 1 < options.maxAttempts && options.intervalMs > 0) {
      await new Promise((resolve) =>
        setTimeout(resolve, options.intervalMs),
      );
    }
  }
  throw new Error(`deploy ${hash} was not finalized`);
}
