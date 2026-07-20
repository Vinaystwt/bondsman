import { StatusPill } from '@/components/ui/Primitives';
import type { AssuranceTemplate } from '@/lib/types';

interface Props {
  templates: AssuranceTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function TemplateGrid({ templates, selectedId, onSelect }: Props) {
  const executable = templates.filter((t) => t.executableNow);
  const blueprint = templates.filter((t) => !t.executableNow);

  return (
    <div className="space-y-8">
      <Group
        title="Executable today"
        description="These templates have a deployed fault class and verifier on Casper testnet."
        templates={executable}
        selectedId={selectedId}
        onSelect={onSelect}
      />
      <Group
        title="Integration blueprints"
        description="These templates are ready for a design partner. The proposed fault class and verifier are not yet deployed."
        templates={blueprint}
        selectedId={selectedId}
        onSelect={onSelect}
      />
    </div>
  );
}

function Group({
  title,
  description,
  templates,
  selectedId,
  onSelect,
}: {
  title: string;
  description: string;
  templates: AssuranceTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (templates.length === 0) return null;
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="serial text-[0.62rem] text-muted">{title}</p>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {templates.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={selectedId === t.id}
            onSelect={() => onSelect(t.id)}
          />
        ))}
      </div>
    </div>
  );
}

function TemplateCard({
  template: t,
  selected,
  onSelect,
}: {
  template: AssuranceTemplate;
  selected: boolean;
  onSelect: () => void;
}) {
  const pillTone = t.executableNow ? 'ok' : 'info';
  const pillLabel = t.executableNow ? 'EXECUTABLE TODAY' : 'INTEGRATION BLUEPRINT';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group flex h-full flex-col justify-between rounded-md border p-5 text-left transition-colors ${
        selected
          ? 'border-accent/60 bg-accent/[0.05]'
          : 'border-rule bg-surface hover:border-accent/40'
      }`}
    >
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="serial text-[0.6rem] text-muted">{t.category}</span>
          <StatusPill tone={pillTone}>{pillLabel}</StatusPill>
        </div>
        <h3 className="mt-2 text-base font-semibold text-bone">{t.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t.description}</p>
      </div>
      <dl className="mt-4 space-y-1.5 border-t border-rule pt-3 text-xs">
        <Row label="Evidence">{t.objectiveEvidence.join(', ')}</Row>
        <Row label="Adapter">
          {t.currentAdapter ?? (
            <span className="text-muted">not deployed</span>
          )}
        </Row>
      </dl>
    </button>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 serial text-[0.58rem] text-muted">{label}</dt>
      <dd className="flex-1 text-bone/85">{children}</dd>
    </div>
  );
}
