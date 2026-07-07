import { Label } from '@/components/ui/Primitives';

const REAL = [
  'Every bond posted is a real Casper testnet transaction, signed by the approver account.',
  'Every slash and refund settles on chain and is visible on the explorer.',
  'The watchdog is a separate on-chain account, signing challenges autonomously.',
  'The reserve balance is measured from real slashed bonds.',
  'Wallet-signed challenges use your Casper Wallet and pay the reward to your account.',
];

const MOCK = [
  'Invoice data is mocked. Vendors, debtors, and delivery flags are fixtures.',
  'x402 metering is not live. The reference token does not yet implement the settlement entry point.',
  'The approver runs on the seed set of invoices, not a live pool.',
];

export default function RealVsDemo() {
  return (
    <section
      aria-label="Real vs demo"
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
          <Label>Mocked or planned</Label>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            {MOCK.map((m) => (
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
