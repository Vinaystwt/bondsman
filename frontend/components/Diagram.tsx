import Appear from '@/components/ui/Appear';

type DiagramName =
  | 'lifecycle'
  | 'architecture'
  | 'slash-split'
  | 'duplicate-proof'
  | 'agent-economy';

type DiagramSize = 'standard' | 'large' | 'full';

const SIZE_CLASS: Record<DiagramSize, string> = {
  standard: 'max-w-2xl',
  large: 'max-w-4xl',
  full: 'w-full',
};

/**
 * Render one of the packaged diagram SVGs. The artwork is never altered; the
 * container is sized so labels stay legible and the diagram reads as primary
 * content instead of a thumbnail.
 */
export default function Diagram({
  name,
  alt,
  caption,
  className,
  size = 'large',
}: {
  name: DiagramName;
  alt: string;
  caption?: string;
  className?: string;
  size?: DiagramSize;
}) {
  const outer = SIZE_CLASS[size];
  return (
    <Appear className={className}>
      <figure
        className={`overflow-hidden rounded-lg border border-rule bg-surface/50 p-4 sm:p-6 ${outer} mx-auto`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/diagrams/${name}.svg`}
          alt={alt}
          loading="lazy"
          className="block h-auto w-full"
        />
        {caption && (
          <figcaption className="mt-3 px-1 text-xs leading-relaxed text-muted">
            {caption}
          </figcaption>
        )}
      </figure>
    </Appear>
  );
}
