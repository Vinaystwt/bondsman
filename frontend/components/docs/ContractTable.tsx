import type { Deployment } from '@/lib/types';
import CopyHash from '@/components/ui/CopyHash';
import { contractExplorer, truncateHash } from '@/lib/format';

const LABELS: Record<string, { name: string; owns: string }> = {
  controller: { name: 'Controller', owns: 'Initiates actions, holds the lifecycle, resolves' },
  bondVault: { name: 'Bond vault', owns: 'Locks the bond, releases it or slashes it' },
  invoicePool: { name: 'Invoice pool', owns: 'Approves payouts, detects duplicate claims' },
  mockCsprUsd: { name: 'csprUSD', owns: 'The CEP-18 settlement token for this testnet deployment' },
};

// A live table of the four contracts, read from /api/deployments.
export default function ContractTable({ deployment }: { deployment: Deployment }) {
  const order = ['controller', 'bondVault', 'invoicePool', 'mockCsprUsd'];
  const entries = order
    .filter((k) => deployment.contracts[k])
    .map((k) => ({ key: k, ...deployment.contracts[k] }));

  return (
    <div className="overflow-x-auto rounded-md border border-rule">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-surface">
          <tr className="serial text-[0.6rem] text-muted">
            <th className="px-4 py-3 font-medium">Contract</th>
            <th className="px-4 py-3 font-medium">What it owns</th>
            <th className="px-4 py-3 font-medium">Contract hash</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((c) => {
            const meta = LABELS[c.key] ?? { name: c.key, owns: '' };
            return (
              <tr key={c.key} className="border-t border-rule align-top">
                <td className="px-4 py-3 font-medium text-bone">{meta.name}</td>
                <td className="px-4 py-3 text-muted">{meta.owns}</td>
                <td className="px-4 py-3">
                  <CopyHash
                    value={c.contractHash}
                    href={contractExplorer(c.contractHash)}
                    label={truncateHash(c.contractHash)}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
