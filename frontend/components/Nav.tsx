'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import BondsmanLogo from './brand/BondsmanLogo';

const PRIMARY = [
  { href: '/', label: 'Product' },
  { href: '/app', label: 'App' },
  { href: '/proof', label: 'Proof' },
  { href: '/build', label: 'Build' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-ink/85 backdrop-blur supports-[backdrop-filter]:bg-ink/70">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-5 sm:px-8 lg:px-14">
        <Link
          href="/"
          className="flex items-center gap-2.5"
          aria-label="Bondsman home"
        >
          <BondsmanLogo size={30} variant="mark" />
          <span className="font-display text-lg font-semibold tracking-tight text-bone">
            Bondsman
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {PRIMARY.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={mounted && isActive(pathname, link.href) ? 'page' : undefined}
              className={`rounded px-3 py-2 text-sm transition-colors ${
                mounted && isActive(pathname, link.href)
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
            href="/app/new"
            className="hidden rounded-md border border-accent/50 bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 sm:inline-flex"
          >
            Create bonded action
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded text-muted hover:text-bone md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="mobile-primary-nav"
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
          id="mobile-primary-nav"
          className="border-t border-rule bg-ink px-5 py-3 md:hidden"
          aria-label="Primary mobile"
        >
          <div className="flex flex-col gap-1">
            {PRIMARY.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`rounded px-3 py-2.5 text-sm ${
                  mounted && isActive(pathname, link.href)
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-bone'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/app/new"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md border border-accent/50 bg-accent/10 px-3 py-2.5 text-sm font-medium text-accent"
            >
              Create bonded action
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
