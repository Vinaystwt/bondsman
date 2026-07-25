import type { ReactNode } from 'react';
import { Label } from '@/components/ui/Primitives';

export default function PageHeader({
  label,
  title,
  intro,
}: {
  label: string;
  title: string;
  intro?: ReactNode;
}) {
  return (
    <header className="border-b border-rule pb-6">
      <Label>{label}</Label>
      <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight">
        {title}
      </h1>
      {intro && (
        <p className="mt-3 max-w-prose leading-relaxed text-muted">{intro}</p>
      )}
    </header>
  );
}
