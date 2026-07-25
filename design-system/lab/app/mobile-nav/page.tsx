'use client';

// Mobile navigation lab (Task 22): MobileNavSheet closed/open at the
// documented 375px mobile viewport width (RESPONSIVE.md §1's mobile tier,
// same previewWidth app/grid/page.tsx uses for its mobile column overlay),
// plus the nav item default/active/focus states at desktop width.
//
// Item list is exactly Part1 §7's global-header set -- Product, App, Proof,
// Verify, Build -- not a placeholder list, plus the footer Status row that
// MobileNavSheet always renders separately from the main items.
//
// The two 375px frames below use the same fixed-width-preview technique as
// app/grid/page.tsx, with one addition: MobileNavSheet renders
// `fixed inset-0`, which normally escapes any containing box and covers the
// real viewport. Giving the frame `position: relative` plus a `transform`
// (any transform, per the CSS spec, establishes a new containing block for
// fixed-position descendants) makes the sheet fill *that frame* instead of
// the browser window, so "open" can be screenshotted at exactly 375px
// without actually resizing the page. A separate, real (non-framed) toggle
// further down mounts the actual full-viewport sheet for genuine keyboard
// testing -- Escape to close, Tab/Shift+Tab to feel the focus trap.
//
// No `--accent` anywhere on this page or in MobileNavSheet: the active item
// below reads through ink weight (bold) plus a left rule, matching every
// other "current" signal in this system. No `rounded-*` class.

import { useState } from 'react';
import { MobileNavSheet } from '../../components/MobileNavSheet';

const NAV_ITEMS = [
  { label: 'Product', href: '/product' },
  { label: 'App', href: '/app' },
  { label: 'Proof', href: '/proof' },
  { label: 'Verify', href: '/verify' },
  { label: 'Build', href: '/build' },
];

const MOBILE_WIDTH = 375;
const MOBILE_HEIGHT = 667;

function MobileFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
      <div className="flex flex-col gap-2">
        <span className="text-data text-muted font-sans">{label}</span>
        <div
          style={{
            width: `${MOBILE_WIDTH}px`,
            height: `${MOBILE_HEIGHT}px`,
            minWidth: `${MOBILE_WIDTH}px`,
            position: 'relative',
            overflow: 'hidden',
            // Establishes a containing block for MobileNavSheet's
            // `fixed inset-0`, so it fills this frame rather than the
            // real browser viewport -- see header comment.
            transform: 'translateZ(0)',
          }}
          className="border border-boundary bg-surface"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

// ---- Nav item state demo (desktop width) ------------------------------------
// Same markup/classes MobileNavSheet uses for its `<nav>` items, duplicated
// here as plain static demo rows (not the live component) so the "focus"
// column can force `:focus-visible`'s ring open without a real focus event
// -- the same technique app/forms/page.tsx's `forcedFocusClass` uses for its
// four-state control matrix.
const ITEM_STATES = ['default', 'active', 'focus'] as const;
type ItemState = (typeof ITEM_STATES)[number];

function itemClass(state: ItemState): string {
  const base =
    'flex min-h-[44px] w-full max-w-sm items-center border-b border-boundary px-6 text-headline font-sans transition-colors duration-short ease-standard';
  if (state === 'active') {
    return [base, 'border-l-4 border-l-ink pl-5 font-bold text-ink'].join(' ');
  }
  if (state === 'focus') {
    return [
      base,
      'text-ink outline outline-2 outline-offset-2 outline-ink',
    ].join(' ');
  }
  return [base, 'text-ink hover:bg-surface-raised'].join(' ');
}

export default function MobileNavPage() {
  const [liveOpen, setLiveOpen] = useState(false);

  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Mobile navigation sheet, nav states, focus states</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>MobileNavSheet</code> (<code>design-system/lab/components/</code>
        ) is the full-height, full-width overlay Phase 2&apos;s global header
        uses on narrow viewports, with exactly the five items from Part1 §7 --
        Product, App, Proof, Verify, Build -- plus a footer <code>Status</code>{' '}
        link kept visually separate from the main list. Every row (including
        the close control) has a real 44px minimum tap target height, not just
        generous-looking padding.
      </p>

      <section className="flex flex-col gap-3">
        <h2>Sheet -- closed vs. open, at 375px</h2>
        <p style={{ maxWidth: '72ch' }}>
          Both frames below are exactly 375px wide (RESPONSIVE.md §1&apos;s
          mobile tier, same preview width <code>/grid</code> uses). Closed
          shows the collapsed page chrome with its menu trigger; open shows{' '}
          <code>MobileNavSheet</code> itself, contained to the frame via the
          transform trick described in this page&apos;s header comment.
        </p>
        <div className="flex flex-wrap gap-6">
          <MobileFrame label="Closed">
            <div className="flex items-center justify-between border-b border-boundary px-4">
              <span className="text-body text-ink font-sans font-bold">Bondsman</span>
              <button
                type="button"
                aria-label="Open menu"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-headline text-ink"
              >
                ☰
              </button>
            </div>
          </MobileFrame>

          <MobileFrame label="Open">
            <MobileNavSheet
              open
              onClose={() => {}}
              items={NAV_ITEMS}
              currentPath="/proof"
            />
          </MobileFrame>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Live sheet (real viewport, keyboard-operable)</h2>
        <p style={{ maxWidth: '72ch' }}>
          This toggle mounts the actual component full-screen, exactly as
          Phase 2 will use it. Try Escape to close, and Tab/Shift+Tab once
          open to feel the focus trap -- it cycles through the close control,
          the five items, and Status, never escaping to the page behind it.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLiveOpen(true)}
            className="border border-boundary bg-surface-raised px-3 py-1.5 text-body text-ink font-sans transition-colors duration-short ease-standard hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Open menu
          </button>
          <span className="text-data text-muted font-sans">
            Currently {liveOpen ? 'open' : 'closed'}
          </span>
        </div>
        <MobileNavSheet
          open={liveOpen}
          onClose={() => setLiveOpen(false)}
          items={NAV_ITEMS}
          currentPath="/proof"
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2>Nav item states -- desktop width</h2>
        <p style={{ maxWidth: '72ch' }}>
          Default, active, and focus, using the same classes{' '}
          <code>MobileNavSheet</code>&apos;s <code>&lt;nav&gt;</code> items
          render. Active reads through ink weight (bold text) plus a left
          rule -- never a colour swap. No <code>--accent</code> anywhere.
        </p>
        <div className="flex flex-col border border-boundary" style={{ maxWidth: '24rem' }}>
          {ITEM_STATES.map((state) => (
            <div key={state} className={itemClass(state)}>
              <span>Proof</span>
              <span className="ml-auto text-data text-muted font-sans">{state}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Footer Status row</h2>
        <p style={{ maxWidth: '72ch' }}>
          Rendered with <code>mt-auto</code> inside the sheet so it always
          sits at the bottom of the viewport regardless of item count, with a
          top rule and muted ink separating it from the five main items --
          visually and semantically a different tier of navigation, not a
          sixth item.
        </p>
      </section>
    </main>
  );
}
