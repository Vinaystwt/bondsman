import type { Metadata } from 'next';
import Link from 'next/link';
import { ApiError, api, safeGet } from '@/lib/api';
import { BackendDown, EmptyState } from '@/components/ui/States';
import { Label, Stat } from '@/components/ui/Primitives';
import PageHeader from '@/components/app/PageHeader';
import ActionRow from '@/components/app/ActionRow';
import CopyHash from '@/components/ui/CopyHash';
import Term from '@/components/ui/Term';
import { truncateHash } from '@/lib/format';
import { resolveRole } from '@/lib/agent-roles';
import type { AgentReputation, Deployment } from '@/lib/types';

export const metadata: Metadata = { title: 'Agent' };

export default async function AgentPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const decoded = decodeURIComponent(address);
  let res:
    | { data: AgentReputation; reachable: true }
    | { data: null; reachable: false };
  let depRes:
    | { data: Deployment; reachable: true }
    | { data: null; reachable: false };
  try {
    [res, depRes] = await Promise.all([
      safeGet(() => api.agent(decoded)),
      safeGet(() => api.deployments()),
    ]);
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      return (
        <div className="space-y-8">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/app/agents" className="hover:text-bone">
              Agents
            </Link>
            <span className="px-2">/</span>
            <span className="text-bone">{truncateHash(decoded)}</span>
          </nav>
          <PageHeader
            label="Agent"
            title="Agent not found"
            intro="This address has no current action history in the Bondsman projection."
          />
          <EmptyState
            title="No agent record"
            body="Agents appear after they submit, execute, challenge, or resolve actions on the current controller."
            action={
              <Link
                href="/app/agents"
                className="text-sm text-accent underline decoration-rule underline-offset-4 hover:decoration-accent"
              >
                Open agents
              </Link>
            }
          />
        </div>
      );
    }
    throw error;
  }

  if (!res.reachable) {
    return (
      <div className="space-y-8">
        <PageHeader label="Product" title="Agent" />
        <BackendDown />
      </div>
    );
  }
  const agent = res.data;
  const deployments = depRes.reachable ? depRes.data : null;
  const role = resolveRole(agent.agent, deployments);
  const scoreTone = agent.score > 0 ? 'accent' : agent.score < 0 ? 'slash' : 'bone';

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

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label>Account</Label>
          <CopyHash value={agent.agent} label={truncateHash(agent.agent)} />
        </div>
        <div className="rounded-md border border-accent/30 bg-accent/5 px-4 py-3">
          <p className="serial text-[0.62rem] text-accent">{role.label}</p>
          <p className="mt-1 text-sm text-bone">{role.description}</p>
        </div>
      </div>

      <section aria-label="Reputation" className="grid gap-4 sm:grid-cols-3">
        <Stat label="Clean actions" tone="accent">
          {agent.clean}
        </Stat>
        <Stat label="Slashed" tone="slash">
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
