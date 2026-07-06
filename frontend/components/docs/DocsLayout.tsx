'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { DOCS_SECTIONS } from './sections';

export default function DocsLayout({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<string>(DOCS_SECTIONS[0].id);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  // Scrollspy: highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-20% 0px -70% 0px', threshold: 0 },
    );
    DOCS_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DOCS_SECTIONS;
    return DOCS_SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) || s.keywords.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-10">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-y-auto lg:py-10">
          <div className="py-4 lg:py-0">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded border border-rule px-3 py-2 text-sm text-bone lg:hidden"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              Documentation
              <span className="text-muted">{open ? 'Close' : 'Menu'}</span>
            </button>

            <nav
              aria-label="Documentation"
              className={`${open ? 'block' : 'hidden'} mt-3 lg:mt-0 lg:block`}
            >
              <label className="sr-only" htmlFor="docs-search">
                Search the documentation
              </label>
              <input
                id="docs-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search docs"
                className="mb-4 w-full rounded border border-rule bg-surface px-3 py-2 text-sm text-bone placeholder:text-muted focus:border-accent/60"
              />
              <ul className="space-y-0.5">
                {filtered.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={() => setOpen(false)}
                      aria-current={active === s.id ? 'true' : undefined}
                      className={`flex items-baseline gap-2 rounded px-3 py-1.5 text-sm transition-colors ${
                        active === s.id
                          ? 'bg-accent/10 text-accent'
                          : 'text-muted hover:text-bone'
                      }`}
                    >
                      <span className="serial text-[0.58rem] opacity-60">
                        {String(DOCS_SECTIONS.indexOf(s) + 1).padStart(2, '0')}
                      </span>
                      {s.title}
                    </a>
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted">No section matches that.</li>
                )}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 py-8 lg:py-10">{children}</div>
      </div>
    </div>
  );
}
