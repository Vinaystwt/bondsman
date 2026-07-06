import type { ReactNode } from 'react';
import { DOCS_SECTIONS } from './sections';

// A numbered, anchored documentation section with consistent prose styling.
export default function DocSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const index = DOCS_SECTIONS.findIndex((s) => s.id === id) + 1;
  return (
    <section
      id={id}
      // Offset so anchor jumps clear the sticky header.
      className="scroll-mt-24 border-t border-rule py-12 first:border-t-0 first:pt-0"
    >
      <div className="flex items-baseline gap-3">
        <span className="serial text-[0.7rem] text-accent">
          {String(index).padStart(2, '0')}
        </span>
        <h2 className="font-display text-3xl font-semibold tracking-tight text-bone">
          {title}
        </h2>
      </div>
      <div className="prose-docs mt-6 space-y-4">{children}</div>
    </section>
  );
}
