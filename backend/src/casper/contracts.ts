import type { Deployment } from '../shared/deployment.js';

export interface ActiveContracts {
  controller: 'BondsmanController' | 'BondsmanControllerV2';
  pool: 'InvoicePool' | 'InvoicePoolV2';
  vault: 'BondVault' | 'BondVaultV2';
  token: 'MockCsprUSD';
}

export function activeContracts(deployment: Deployment): ActiveContracts {
  return deployment.current === 'v2'
    ? {
        controller: 'BondsmanControllerV2',
        pool: 'InvoicePoolV2',
        vault: 'BondVaultV2',
        token: 'MockCsprUSD',
      }
    : {
        controller: 'BondsmanController',
        pool: 'InvoicePool',
        vault: 'BondVault',
        token: 'MockCsprUSD',
      };
}

export function v2Enabled(deployment: Deployment): boolean {
  return deployment.current === 'v2';
}

