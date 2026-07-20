import Link from 'next/link';
import BondsmanLogo from './brand/BondsmanLogo';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-14">
        <div>
          <div className="flex items-center gap-2.5">
            <BondsmanLogo size={28} variant="mark" />
            <span className="font-display text-lg font-semibold text-bone">
              Bondsman
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            Bonded execution assurance for autonomous finance. Post collateral before an action, prove the outcome after it.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { href: '/', label: 'Overview' },
            { href: '/proof', label: 'Proof Console' },
            { href: '/assurance', label: 'Assurance Studio' },
          ]}
        />
        <FooterCol
          title="Build"
          links={[
            { href: '/build', label: 'Integration guide' },
            { href: '/docs', label: 'Documentation' },
            { href: '/docs#mcp', label: 'MCP tools' },
            { href: '/docs#a2a', label: 'A2A agent card' },
          ]}
        />
        <FooterCol
          title="Casper"
          links={[
            {
              href: 'https://testnet.cspr.live',
              label: 'Casper testnet explorer',
              external: true,
            },
            { href: '/docs#casper', label: 'Casper impact' },
            { href: '/docs#security', label: 'Security' },
          ]}
        />
      </div>
      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-2 px-5 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-14">
          <span>
            Casper testnet deployment. Real payment settlement and real bond slashing on chain. Controlled testnet inputs.
          </span>
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
          <li key={l.href + l.label}>
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
