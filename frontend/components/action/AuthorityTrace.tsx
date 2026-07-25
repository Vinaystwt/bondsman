import Money from '@/components/ui/Money';
import { Label } from '@/components/ui/Primitives';
import { serial, truncateHash } from '@/lib/format';

interface AuthorityTraceProps {
  hasReasoning: boolean;
  reasoningHash: string;
  bondRequired: string;
  actionId: number;
}

// A compact, four-node trace from what the agent decided to what the chain
// settled — the same data already on this page, just threaded as one line
// instead of scattered across separate panels below.
export default function AuthorityTrace({
  hasReasoning,
  reasoningHash,
  bondRequired,
  actionId,
}: AuthorityTraceProps) {
  const nodes = [
    {
      label: 'Agent interpreted',
      value: hasReasoning ? 'Reasoning committed on chain' : 'No written reasoning (deterministic reuse)',
    },
    {
      label: 'Policy priced the bond',
      value: <Money atomic={bondRequired} />,
    },
    {
      label: 'Committed as',
      value: truncateHash(reasoningHash),
      mono: true,
    },
    {
      label: 'Resulting action',
      value: serial(actionId),
    },
  ];

  return (
    <section
      aria-label="Authority trace"
      className="rounded-md border border-rule bg-surface/60 px-5 py-4"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {nodes.map((node, i) => (
          <li key={node.label} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted" aria-hidden="true">&rarr;</span>}
            <div>
              <Label>{node.label}</Label>
              <p className={`mt-0.5 text-sm text-bone ${node.mono ? 'font-mono' : ''}`}>
                {node.value}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
