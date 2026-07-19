import type { Deployment } from './deployment.js';

export type ActiveControllerVersion = 'v1' | 'v2';

function requestedVersion(env: NodeJS.ProcessEnv): ActiveControllerVersion | undefined {
  const value = env.ACTIVE_CONTROLLER_VERSION?.trim().toLowerCase();
  if (!value) return undefined;
  if (value === 'v1' || value === 'v2') return value;
  throw new Error('ACTIVE_CONTROLLER_VERSION must be v1 or v2');
}

export function activeControllerVersion(
  deployment: Deployment,
  env: NodeJS.ProcessEnv = process.env,
): ActiveControllerVersion {
  return requestedVersion(env) ?? deployment.current ?? 'v1';
}

export function applyActiveControllerVersion(
  deployment: Deployment,
  env: NodeJS.ProcessEnv = process.env,
): Deployment {
  const override = requestedVersion(env);
  const version = override ?? deployment.current ?? 'v1';
  const suite = deployment.versions?.[version];
  if (!suite) {
    if (!override) return deployment;
    throw new Error(
      `ACTIVE_CONTROLLER_VERSION=${version} is unavailable in deployments/testnet.json`,
    );
  }

  return {
    ...deployment,
    current: version,
    contracts: {
      ...deployment.contracts,
      mockCsprUsd: suite.mockCsprUsd,
      bondVault: suite.bondVault,
      controller: suite.controller,
      invoicePool: suite.invoicePool,
      controllerV1: deployment.versions?.v1?.controller ?? deployment.contracts.controllerV1,
      controllerV2: deployment.versions?.v2?.controller ?? deployment.contracts.controllerV2,
      bondVaultV2: deployment.versions?.v2?.bondVault ?? deployment.contracts.bondVaultV2,
      invoicePoolV2: deployment.versions?.v2?.invoicePool ?? deployment.contracts.invoicePoolV2,
    },
  };
}
