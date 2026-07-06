import Appear from '@/components/ui/Appear';

type DiagramName =
  | 'lifecycle'
  | 'architecture'
  | 'slash-split'
  | 'duplicate-proof'
  | 'agent-economy';

// Renders one of the provided diagram SVGs. The artwork is never altered; only
// the container fades and rises on scroll.
export default function Diagram({
  name,
  alt,
  caption,
  className,
}: {
  name: DiagramName;
  alt: string;
  caption?: string;
  className?: string;
}) {
  return (
    <Appear className={className}>
      <figure className="overflow-hidden rounded-lg border border-rule bg-surface/50 p-3 sm:p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/diagrams/${name}.svg`}
          alt={alt}
          loading="lazy"
          className="h-auto w-full"
        />
        {caption && (
          <figcaption className="mt-2 px-1 text-xs leading-relaxed text-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    </Appear>
  );
}
