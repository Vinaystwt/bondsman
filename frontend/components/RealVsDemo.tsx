import { Label } from '@/components/ui/Primitives';

const REAL = [
  'Every bond posted is a real Casper testnet transaction, signed by the approver account.',
  'Every slash and refund settles on chain and is visible on the explorer.',
  'The watchdog is a separate on-chain account, signing challenges autonomously.',
  'The reserve balance is measured from real slashed bonds.',
  'The backend-signed demo path submits real challenges through a funded Casper testnet key.',
];

const SCOPE = [
  'Invoice data uses controlled testnet fixtures so duplicate-claim cases are reproducible.',
  'x402 verification uses a metering sandbox until facilitator-compatible settlement is connected.',
  'The approver currently runs against the demo invoice set, ready to swap for a live invoice or oracle feed.',
];

export default function RealVsDemo() {
  return (
    <section
      aria-label="Current testnet deployment scope"
      className="rounded-md border border-rule bg-surface p-6"
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <div>
          <Label>Real on testnet</Label>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-bone">
            {REAL.map((r) => (
              <li key={r} className="flex gap-2">
                <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <Label>Controlled fixtures and production path</Label>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            {SCOPE.map((m) => (
              <li key={m} className="flex gap-2">
                <span aria-hidden="true" className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-rule" />
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
