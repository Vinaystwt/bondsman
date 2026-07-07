const QUARTERS = [
  {
    q: 'Now',
    title: 'Testnet accountability loop',
    body: 'Bonded invoice actions, wallet signed challenges, deterministic watchdog catches, and local MCP tools.',
  },
  {
    q: 'Next',
    title: 'Operator tools',
    body: 'Operator console, proof center, publish ready MCP package, and sandbox x402 verification documentation.',
  },
  {
    q: 'Later',
    title: 'Underwriting and policy',
    body: 'Reserve analytics, policy templates, more proof adapters, and portable agent reputation.',
  },
  {
    q: 'Mainnet path',
    title: 'Production settlement',
    body: 'Mainnet contracts, production csprUSD, oracle backed delivery attestation, and x402 settlement.',
  },
];

// A left aligned timeline. Customer named first: operators of on-chain invoice
// financing and factoring pools, then RWA payout pools generally.
export default function Roadmap() {
  return (
    <ol className="relative border-l border-rule">
      {QUARTERS.map((item) => (
        <li key={item.q} className="relative ml-6 pb-8 last:pb-0">
          <span
            aria-hidden="true"
            className="absolute -left-[1.6rem] top-1 grid h-3 w-3 place-items-center rounded-full border border-accent bg-ink"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span className="serial text-[0.62rem] text-accent">{item.q}</span>
          <h3 className="mt-1 text-lg font-semibold text-bone">{item.title}</h3>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-muted">
            {item.body}
          </p>
        </li>
      ))}
    </ol>
  );
}
