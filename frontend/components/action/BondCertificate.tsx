'use client';

import type { ActionStatus } from '@/lib/types';
import Seal, { type SealState } from '@/components/Seal';
import Money from '@/components/ui/Money';
import { serial } from '@/lib/format';

function sealState(status: ActionStatus): SealState {
  if (status === 'ResolvedSlash') return 'strike';
  if (status === 'ResolvedRefund') return 'lift';
  return 'stamp';
}

const OUTCOME_LINE: Partial<Record<ActionStatus, { text: string; tone: string }>> = {
  ResolvedSlash: { text: 'The contract found the duplicate. The bond is gone.', tone: 'text-void' },
  ResolvedRefund: { text: 'The action held up. The bond returns in full.', tone: 'text-sage' },
  Executed: { text: 'The bond is held while the challenge window is open.', tone: 'text-copper' },
  Bonded: { text: 'The stake is locked. The payout can proceed.', tone: 'text-copper' },
  Challenged: { text: 'A challenge is open against this action.', tone: 'text-copper' },
  Initiated: { text: 'The action is initiated, awaiting its bond.', tone: 'text-muted' },
};

export default function BondCertificate({
  actionId,
  status,
  bondRequired,
  bondPosted,
}: {
  actionId: number;
  status: ActionStatus;
  bondRequired: string;
  bondPosted: string;
}) {
  const outcome = OUTCOME_LINE[status];

  return (
    <figure className="overflow-hidden rounded-md border border-rule bg-surface">
      <div aria-hidden="true" className="perforated-top h-3 bg-rule/60" />
      <div className="grid items-center gap-6 p-6 sm:grid-cols-[auto_1fr]">
        <div className="grid place-items-center">
          <Seal state={sealState(status)} size={132} />
        </div>
        <div>
          <p className="serial text-[0.68rem] text-muted">Certificate of bond</p>
          <p className="mt-1 font-display text-2xl text-bone">{serial(actionId)}</p>

          <dl className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <dt className="serial text-[0.62rem] text-muted">Required</dt>
              <dd className="mt-1 text-lg text-bone">
                <Money atomic={bondRequired} />
              </dd>
            </div>
            <div>
              <dt className="serial text-[0.62rem] text-muted">Posted</dt>
              <dd className="mt-1 text-lg text-bone">
                <Money atomic={bondPosted} />
              </dd>
            </div>
          </dl>

          {outcome && (
            <p className={`mt-4 text-sm font-medium ${outcome.tone}`}>
              {outcome.text}
            </p>
          )}
        </div>
      </div>
    </figure>
  );
}
