import type { Metadata } from 'next';
import Link from 'next/link';
import { api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Label, Stat } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import ActionRow from '@/components/app/ActionRow';
import CopyHash from '@/components/ui/CopyHash';
import Term from '@/components/ui/Term';
import { truncateHash } from '@/lib/format';

export const metadata: Metadata = { title: 'Agent' };

export default async function AgentPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  const res = await safeGet(() => api.agent(decoded));

  if (!res.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Agent" />
        <BackendDown />
      </div>
    );
  }
  const agent = res.data;
  const scoreTone = agent.score > 0 ? 'sage' : agent.score < 0 ? 'void' : 'bone';

  return (
    <article className="space-y-10">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/app/agents" className="hover:text-bone">
          Agents
        </Link>
        <span className="px-2">/</span>
        <span className="text-bone">{truncateHash(agent.agent)}</span>
      </nav>

      <PageHeader
        label="Agent"
        title="Agent profile"
        intro={
          <>
            An agent&apos;s <Term name="reputation">reputation</Term> is its
            record of clean and slashed actions. It is kept by the contract and
            sets the bond on every future action.
          </>
        }
      />

      <div className="flex items-center gap-2">
        <Label>Account</Label>
        <CopyHash value={agent.agent} label={truncateHash(agent.agent)} />
      </div>

      <section aria-label="Reputation" className="grid gap-4 sm:grid-cols-3">
        <Stat label="Clean actions" tone="sage">
          {agent.clean}
        </Stat>
        <Stat label="Slashed" tone="void">
          {agent.slashed}
        </Stat>
        <Stat label="Score" tone={scoreTone}>
          {agent.score}
        </Stat>
      </section>

      <section aria-label="Action history">
        <h2 className="serial mb-3 text-[0.68rem] text-muted">Action history</h2>
        {agent.actions.length === 0 ? (
          <EmptyState title="No actions yet" body="This agent has not acted on any invoice." />
        ) : (
          <div className="space-y-2">
            {[...agent.actions]
              .sort((a, b) => b.actionId - a.actionId)
              .map((a) => (
                <ActionRow key={a.actionId} action={a} />
              ))}
          </div>
        )}
      </section>
    </article>
  );
}
