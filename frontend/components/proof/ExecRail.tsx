import { Fragment } from 'react';

const STAGES = [
  { id: 'payment', label: 'Payment' },
  { id: 'quote', label: 'Quote' },
  { id: 'bond', label: 'Bond' },
  { id: 'execute', label: 'Execute' },
  { id: 'contradiction', label: 'Contradiction' },
  { id: 'watchdog', label: 'Watchdog' },
  { id: 'slash', label: 'Slash' },
  { id: 'receipt', label: 'Receipt' },
] as const;

type StageId = (typeof STAGES)[number]['id'];

interface ExecRailProps {
  slashNode?: StageId;
  className?: string;
}

export default function ExecRail({
  slashNode = 'slash',
  className,
}: ExecRailProps) {
  return (
    <ol
      aria-label="Execution rail from payment to portable receipt"
      className={`flex flex-wrap items-center gap-y-2 ${className ?? ''}`}
    >
      {STAGES.map((s, i) => {
        const isSlash = s.id === slashNode;
        return (
          <Fragment key={s.id}>
            <li
              className={`serial rounded border px-2.5 py-1 text-[0.6rem] ${
                isSlash
                  ? 'border-slash/40 bg-slash/10 text-slash'
                  : 'border-rule bg-surface text-muted'
              }`}
            >
              {s.label}
            </li>
            {i < STAGES.length - 1 && (
              <li aria-hidden="true" className="mx-1.5 h-px w-4 bg-rule sm:w-6" />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}
