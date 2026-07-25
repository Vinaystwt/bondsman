import type { Deployment } from './types';
import { normalizeAccountHash } from './account';

export type AgentRole = 'approver' | 'watchdog' | 'deployer' | 'challenger' | 'other';

export interface AgentRoleInfo {
  role: AgentRole;
  label: string;
  description: string;
}

function nameFor(role: AgentRole): { label: string; description: string } {
  switch (role) {
    case 'approver':
      return {
        label: 'Approver (model-driven)',
        description: 'Reviews invoices and approves payouts. Posts a bond before every action.',
      };
    case 'watchdog':
      return {
        label: 'Watchdog (deterministic)',
        description: 'Scans every payout for duplicate claims. Autonomously signs challenges on chain.',
      };
    case 'deployer':
      return {
        label: 'Deployer',
        description: 'Deployed the Bondsman contracts. Not an active agent.',
      };
    case 'challenger':
      return {
        label: 'Backend challenge key',
        description: 'Signs demo challenges from the Arena backend fallback path.',
      };
    case 'other':
      return {
        label: 'Unclassified account',
        description: 'An address seen in on-chain actions without a known role.',
      };
  }
}

export function resolveRole(
  address: string,
  deployments: Deployment | null,
): AgentRoleInfo {
  if (!deployments) {
    const info = nameFor('other');
    return { role: 'other', ...info };
  }
  const target = normalizeAccountHash(address);
  for (const [key, entry] of Object.entries(deployments.accounts)) {
    const candidatePk = normalizeAccountHash(entry.publicKey);
    const candidateAh = normalizeAccountHash(entry.accountHash);
    if (target === candidatePk || target === candidateAh) {
      const role = (key === 'agent' ? 'approver' : (key as AgentRole));
      const info = nameFor(role);
      return { role, ...info };
    }
  }
  const info = nameFor('other');
  return { role: 'other', ...info };
}
