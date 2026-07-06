'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import Seal from './Seal';

const PUBLIC_LINKS = [
  { href: '/how-it-works', label: 'How it works' },
  { href: '/docs', label: 'Docs' },
  { href: '/demo', label: 'Demo' },
];

const APP_LINKS = [
  { href: '/app', label: 'Overview' },
  { href: '/app/arena', label: 'Challenge Arena' },
  { href: '/app/agents', label: 'Agents' },
];

function isActive(pathname: string, href: string) {
  if (href === '/app') return pathname === '/app';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();
  const inApp = pathname.startsWith('/app');
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ink/85 backdrop-blur supports-[backdrop-filter]:bg-ink/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Bondsman home"
        >
          <Seal state="idle" size={30} withText={false} title="Bondsman" />
          <span className="font-display text-lg font-semibold tracking-tight text-bone">
            Bondsman
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {(inApp ? APP_LINKS : PUBLIC_LINKS).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={`rounded px-3 py-2 text-sm transition-colors ${
                isActive(pathname, link.href)
                  ? 'text-accent'
                  : 'text-muted hover:text-bone'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={inApp ? '/' : '/app'}
            className="hidden rounded border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 sm:inline-flex"
          >
            {inApp ? 'Public site' : 'Launch app'}
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded text-muted hover:text-bone md:hidden"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              {open ? (
                <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          className="border-t border-rule bg-ink px-4 py-3 md:hidden"
          aria-label="Primary mobile"
        >
          <div className="flex flex-col gap-1">
            {[...PUBLIC_LINKS, ...APP_LINKS].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded px-3 py-2.5 text-sm ${
                  isActive(pathname, link.href)
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-bone'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
