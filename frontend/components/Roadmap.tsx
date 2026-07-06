const QUARTERS = [
  {
    q: 'Q3 2026',
    title: 'Mainnet',
    body: 'Mainnet contracts and real csprUSD, with oracle-backed delivery attestation replacing the mocked delivery flag.',
  },
  {
    q: 'Q4 2026',
    title: 'First pilot',
    body: 'A pilot with one invoice financing pool operator, and x402-metered verification once the token implements the settlement entry point the facilitator needs.',
  },
  {
    q: 'Q1 2027',
    title: 'More fault classes',
    body: 'Proofs beyond duplicate claims: delivery that never happened, fraud surfaced by later attestations, and claims resubmitted under different identifiers.',
  },
  {
    q: 'Q2 2027',
    title: 'Policy marketplace',
    body: 'Pool-configurable windows and tiers, and a portable agent reputation passport other Casper protocols can read. We are seeking a grant and incubation to reach this point.',
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
