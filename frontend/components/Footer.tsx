import Link from 'next/link';
import Seal from './Seal';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Seal state="idle" size={28} withText={false} title="Bondsman" />
            <span className="font-display text-lg font-semibold text-bone">
              Bondsman
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">
            A notary for money. An autonomous agent stakes capital before it can
            move your funds, and loses it when it is wrong.
          </p>
        </div>

        <FooterCol
          title="Product"
          links={[
            { href: '/app', label: 'Overview' },
            { href: '/app/arena', label: 'Challenge Arena' },
            { href: '/app/reserve', label: 'Reserve' },
          ]}
        />
        <FooterCol
          title="Learn"
          links={[
            { href: '/how-it-works', label: 'How it works' },
            { href: '/docs', label: 'Documentation' },
            { href: '/demo', label: 'Try the demo' },
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
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <span>Built on Casper testnet. Invoice data is mocked; the bond and the slash are real.</span>
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
                className="text-sm text-bone/80 transition-colors hover:text-copper"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-sm text-bone/80 transition-colors hover:text-copper"
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
