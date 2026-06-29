import CopyHash from '@/components/ui/CopyHash';
import { Label } from '@/components/ui/Primitives';

// The agent's real, model-written sentence is the hero of the action view.
export default function ReasoningPanel({
  reasoning,
  reasoningHash,
}: {
  reasoning: string;
  reasoningHash: string;
}) {
  const has = reasoning.trim().length > 0;
  return (
    <section
      aria-label="Agent reasoning"
      className="rounded-md border border-rule bg-gradient-to-b from-surface to-ink p-6"
    >
      <Label>What the agent decided</Label>
      {has ? (
        <blockquote className="mt-3 font-display text-xl leading-relaxed text-bone sm:text-2xl">
          “{reasoning}”
        </blockquote>
      ) : (
        <p className="mt-3 text-base leading-relaxed text-muted">
          This action carried no written explanation. It reused a claim that had
          already been paid, which is exactly what the bond exists to catch.
        </p>
      )}
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-rule pt-4">
        <Label>Reasoning hash, committed on-chain</Label>
        <CopyHash value={reasoningHash} />
      </div>
    </section>
  );
}
