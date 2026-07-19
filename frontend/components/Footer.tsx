import Link from 'next/link';
import Seal from './Seal';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Seal state="idle" size={28} withText={false} title="Bondsman" />
            <span className="font-display text-lg font-semibold text-bone">
              Bondsman
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Bonded execution infrastructure for autonomous finance. Post a bond,
            act under accountability, prove it with a portable receipt.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { href: '/app', label: 'Overview' },
            { href: '/app/arena', label: 'Challenge Arena' },
            { href: '/app/actions', label: 'Action Docket' },
            { href: '/app/ledger', label: 'My Ledger' },
            { href: '/app/agents', label: 'Agents' },
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            { href: '/proof', label: 'Canonical proof' },
            { href: '/how-it-works', label: 'How it works' },
            { href: '/rwa', label: 'Invoice adapter' },
            { href: '/build', label: 'Integrate' },
            { href: '/docs', label: 'Documentation' },
          ]}
        />
        <FooterCol
          title="Network"
          links={[
            {
              href: 'https://testnet.cspr.live',
              label: 'Casper testnet',
              external: true,
            },
          ]}
        />
      </div>
      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
          <span>Casper Testnet deployment. Controlled invoice fixtures; bond and slash execution live on chain.</span>
          <span className="serial">No bond, no action.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string; external?: boolean }[];
}) {
  return (
    <div>
      <h3 className="serial text-[0.68rem] text-muted">{title}</h3>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            {l.external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-bone/80 transition-colors hover:text-accent"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-sm text-bone/80 transition-colors hover:text-accent"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
