'use client';

// Overlays lab (Task 15): Tabs, Accordion, Drawer, Dialog.
//
// Drawer and Dialog (design-system/lab/components/) are imported and reused
// verbatim, per this task's own interface note ("Phase 2 instantiates
// `Drawer` for transaction/receipt detail and `Dialog` for the
// submit-confirmation and tamper-test flows"). Tabs and Accordion are not in
// Task 15's "Create" file list, so -- in the same spirit as data-display/
// page.tsx's page-local Badge/Tag/Tooltip/StatusDot -- they stay page-local
// here as small components, free to be lifted into components/ later if a
// real reuse need shows up.
//
// This page is a client component (unlike the mostly-static
// forms/page.tsx): Tabs, Accordion, and the three overlay demos below all
// need real state (active tab, open accordion item, open/closed overlays),
// not just forced-state props on an otherwise-static render.
//
// RESPONSIVE.md §4 ("Rail vs. Drawer") is the load-bearing rule this page
// demonstrates, not just documents: the Drawer example below is read-only
// transaction detail (Task 15's stated instantiation) and holds no action
// that mutates money. The one flow that *does* change money -- submitting a
// bond payout -- is built as a **blocking** `Dialog` instead, per §4's
// "concrete distinguishing test": dismissing a payout mid-flight is not an
// acceptable, side-effect-free thing to allow, so it needs an explicit "yes,
// I mean this," never a plain Escape/click-outside close. A second,
// non-blocking `Dialog` (a keyboard-shortcuts note) is included for
// contrast -- it holds no money-changing state, so Escape and "Close" both
// work on it exactly like the brief's given `Dialog` sample.
//
// No `--accent` anywhere on this page: every affordance reads through
// `--ink`/`--boundary`/`--muted`/`--surface-raised`, matching every prior
// lab page. No `rounded-*` class appears.

import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { Drawer } from '../../components/Drawer';
import { Dialog } from '../../components/Dialog';
import { HashPill } from '../../components/HashPill';
import { CopyControl } from '../../components/CopyControl';

// ---- Tabs ------------------------------------------------------------------
// Real ARIA tabs pattern (WAI-ARIA APG "tabs"), not a row of divs with
// onClick: `role="tablist"`/`"tab"`/`"tabpanel"`, roving `tabIndex` (only the
// selected tab is in the Tab order; the rest are reached via arrow keys, per
// the pattern), and Left/Right/Home/End all move both focus and selection.
type TabItem = { id: string; label: string; content: ReactNode };

function Tabs({ label, items }: { label: string; items: TabItem[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusTab(index: number) {
    const next = (index + items.length) % items.length;
    setActiveIndex(next);
    tabRefs.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        focusTab(index + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        focusTab(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusTab(0);
        break;
      case 'End':
        e.preventDefault();
        focusTab(items.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div>
      <div role="tablist" aria-label={label} className="flex border-b border-boundary">
        {items.map((item, index) => {
          const selected = index === activeIndex;
          return (
            <button
              key={item.id}
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveIndex(index)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={[
                '-mb-px border-b-2 px-4 py-2 text-body font-sans transition-colors duration-short ease-standard',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                selected ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
              ].join(' ')}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      {items.map((item, index) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`panel-${item.id}`}
          aria-labelledby={`tab-${item.id}`}
          hidden={index !== activeIndex}
          className="flex flex-col gap-2 pt-4"
        >
          {item.content}
        </div>
      ))}
    </div>
  );
}

// ---- Accordion ---------------------------------------------------------------
// Real WAI-ARIA APG "accordion" pattern: each header is a native `<button>`
// (so Enter/Space work for free, unlike a `<div onClick>`) wrapped in an
// `<h3>`, `aria-expanded`/`aria-controls` on the header, `role="region"` +
// `aria-labelledby` on the panel, and ArrowUp/ArrowDown/Home/End move focus
// between headers the same way Tabs' arrow keys move between tabs.
type AccordionItem = { id: string; heading: string; content: ReactNode };

function Accordion({ items }: { items: AccordionItem[] }) {
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const headerRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function focusHeader(index: number) {
    const next = (index + items.length) % items.length;
    headerRefs.current[next]?.focus();
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        focusHeader(index + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusHeader(index - 1);
        break;
      case 'Home':
        e.preventDefault();
        focusHeader(0);
        break;
      case 'End':
        e.preventDefault();
        focusHeader(items.length - 1);
        break;
      default:
        break;
    }
  }

  return (
    <div className="flex flex-col border border-boundary">
      {items.map((item, index) => {
        const expanded = openId === item.id;
        return (
          <div key={item.id} className={index > 0 ? 'border-t border-boundary' : undefined}>
            <h3>
              <button
                ref={(el) => {
                  headerRefs.current[index] = el;
                }}
                type="button"
                aria-expanded={expanded}
                aria-controls={`accordion-panel-${item.id}`}
                id={`accordion-header-${item.id}`}
                onClick={() => setOpenId(expanded ? null : item.id)}
                onKeyDown={(e) => onKeyDown(e, index)}
                className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left text-body font-sans text-ink transition-colors duration-short ease-standard hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                {item.heading}
                <span aria-hidden className="font-mono text-muted">
                  {expanded ? '−' : '+'}
                </span>
              </button>
            </h3>
            <div
              role="region"
              id={`accordion-panel-${item.id}`}
              aria-labelledby={`accordion-header-${item.id}`}
              hidden={!expanded}
              className="px-4 pb-4 text-body font-sans text-ink"
              style={{ maxWidth: '72ch' }}
            >
              {item.content}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Sample data -------------------------------------------------------------
const RECEIPT_TX_HASH = 'e04a0a3297737934fcad42686d488b07238c0fce2f6d18174a515f03c7ef29ef';
const PAYOUT_AMOUNT = '2,520';

const TAB_ITEMS: TabItem[] = [
  {
    id: 'overview',
    label: 'Overview',
    content: (
      <p style={{ maxWidth: '72ch' }}>
        Action 27, currently in the evidence window. Posted amount is{' '}
        <span className="font-mono tabular-nums">2,800</span>; no payout has
        settled yet.
      </p>
    ),
  },
  {
    id: 'timeline',
    label: 'Timeline',
    content: (
      <p style={{ maxWidth: '72ch' }}>
        Bonded &rarr; Executed &rarr; Evidence submitted &rarr; Challenged &rarr;
        awaiting resolution. See <code>/data-display</code> for the full
        <code> TimelineNode</code> rendering of this sequence.
      </p>
    ),
  },
  {
    id: 'verifiers',
    label: 'Verifiers',
    content: (
      <p style={{ maxWidth: '72ch' }}>
        <code>uptime-verifier</code> is the deployed verifier attached to this
        policy; see <code>/data-display</code> for its full registry row.
      </p>
    ),
  },
];

const ACCORDION_ITEMS: AccordionItem[] = [
  {
    id: 'what-is-a-challenge',
    heading: 'What happens if a challenge is upheld?',
    content: (
      <p>
        The bonded amount is split per the policy&apos;s slash terms: a
        portion moves to the reserve, a portion rewards the challenger. That
        split is a settled, on-chain fact -- it is never shown or confirmed
        through this Accordion, only through the ledger and a blocking Dialog
        at submission time.
      </p>
    ),
  },
  {
    id: 'evidence-window',
    heading: 'How long is the evidence window?',
    content: <p>Fixed per policy; shown on the action&apos;s own timeline, not repeated here.</p>,
  },
  {
    id: 'verifier-role',
    heading: 'What does a verifier actually check?',
    content: (
      <p>
        A verifier attests to a specific condition (uptime, latency,
        delivery) named in the policy -- it does not itself move funds.
      </p>
    ),
  },
];

export default function OverlaysPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [payoutStatus, setPayoutStatus] = useState<'idle' | 'submitted'>('idle');

  function confirmPayout() {
    setPayoutStatus('submitted');
    setPayoutDialogOpen(false);
  }

  function cancelPayout() {
    setPayoutDialogOpen(false);
  }

  return (
    <main className="flex flex-col gap-8">
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Tabs, accordion, drawer, dialog</h1>
      <p style={{ maxWidth: '72ch' }}>
        <code>Drawer</code> and <code>Dialog</code> (
        <code>design-system/lab/components/</code>) plus two page-local
        keyboard-operable patterns, Tabs and Accordion. The Drawer/Dialog
        split follows <code>RESPONSIVE.md</code> §4 exactly: a Drawer reveals
        read-only detail and is always safely dismissible; anything that
        changes money uses a blocking <code>Dialog</code> instead, which
        disables Escape, disables backdrop-click dismissal, and traps focus
        inside the panel until an explicit choice is made.
      </p>

      <section className="flex flex-col gap-3">
        <h2>Tabs</h2>
        <p style={{ maxWidth: '72ch' }}>
          Real <code>role=&quot;tablist&quot;</code>/<code>tab</code>/
          <code>tabpanel</code> pattern with roving <code>tabIndex</code>:
          click a tab, or focus the tablist and use Left/Right/Home/End --
          only the selected tab sits in the page&apos;s Tab order.
        </p>
        <Tabs label="Action 27 detail" items={TAB_ITEMS} />
      </section>

      <section className="flex flex-col gap-3">
        <h2>Accordion</h2>
        <p style={{ maxWidth: '72ch' }}>
          Native <code>&lt;button&gt;</code> headers (Enter/Space work with no
          extra wiring), plus Up/Down/Home/End to move focus between headers.
          One item opens by default; click a header, or focus it and press
          Enter/Space, to toggle.
        </p>
        <Accordion items={ACCORDION_ITEMS} />
      </section>

      <section className="flex flex-col gap-3">
        <h2>Drawer -- read-only transaction detail</h2>
        <p style={{ maxWidth: '72ch' }}>
          Task 15&apos;s stated instantiation. Non-blocking: the page behind it
          stays reachable (no backdrop), and Escape always closes it -- try
          pressing Escape once it&apos;s open. It holds no action that mutates
          money; the receipt hash below is read-only, paired with the same{' '}
          <code>CopyControl</code> every long identifier in this system uses.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="border border-boundary bg-surface-raised px-3 py-1.5 text-body text-ink font-sans transition-colors duration-short ease-standard hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Open transaction detail
          </button>
          <span className="text-data text-muted font-sans">
            Currently {drawerOpen ? 'open' : 'closed'}
          </span>
        </div>
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Receipt detail -- Action 27">
          <div className="flex flex-col gap-3">
            <p className="text-body text-ink font-sans">
              Read-only settlement receipt. Nothing on this panel submits or
              changes state -- it only displays an already-sealed transaction.
            </p>
            <div className="flex flex-col gap-1">
              <span className="text-data text-muted font-sans">Settlement tx</span>
              <div className="flex items-center gap-2">
                <HashPill hash={RECEIPT_TX_HASH} href={`https://cspr.live/deploy/${RECEIPT_TX_HASH}`} />
                <CopyControl value={RECEIPT_TX_HASH} variant="inline" />
              </div>
            </div>
          </div>
        </Drawer>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Dialog -- non-blocking (informational)</h2>
        <p style={{ maxWidth: '72ch' }}>
          A dialog that holds no money-changing state: dismissing it any time
          is side-effect free, so <code>blocking</code> is left at its default
          (<code>false</code>). Escape and the Close button both work.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setInfoDialogOpen(true)}
            className="border border-boundary bg-surface-raised px-3 py-1.5 text-body text-ink font-sans transition-colors duration-short ease-standard hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Open keyboard shortcuts
          </button>
          <span className="text-data text-muted font-sans">
            Currently {infoDialogOpen ? 'open' : 'closed'}
          </span>
        </div>
        <Dialog open={infoDialogOpen} onClose={() => setInfoDialogOpen(false)} title="Keyboard shortcuts">
          <ul className="flex flex-col gap-1 text-body text-ink font-sans">
            <li>
              <span className="font-mono">Left/Right</span> -- move between tabs
            </li>
            <li>
              <span className="font-mono">Up/Down</span> -- move between accordion headers
            </li>
            <li>
              <span className="font-mono">Esc</span> -- close this dialog
            </li>
          </ul>
        </Dialog>
      </section>

      <section className="flex flex-col gap-3">
        <h2>Dialog -- blocking (pre-submit confirmation, money-changing)</h2>
        <p style={{ maxWidth: '72ch' }}>
          The genuine case <code>RESPONSIVE.md</code> §4 and Part 1 §9 Type 3
          call out: submitting this payout moves real funds out of the bond
          reserve, so it is never a Drawer with a confirm button bolted on --
          it is this <code>blocking</code> Dialog. While it is open, Escape
          does nothing, clicking the backdrop does nothing, and Tab cycles
          only between Cancel and Confirm -- try tabbing past Confirm and
          watch focus wrap back to Cancel instead of escaping to the page.
          The only way out is an explicit choice.
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPayoutDialogOpen(true)}
            className="border border-ink bg-ink px-3 py-1.5 text-body text-surface-raised font-sans transition-colors duration-short ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            Submit bond payout
          </button>
          <span className="text-data text-muted font-sans">
            {payoutStatus === 'submitted'
              ? 'Payout submitted (demo only -- no real transaction sent)'
              : `Currently ${payoutDialogOpen ? 'open' : 'closed'}`}
          </span>
        </div>
        <Dialog
          open={payoutDialogOpen}
          onClose={cancelPayout}
          title="Confirm bond payout"
          blocking
        >
          <div className="flex flex-col gap-4">
            <p className="text-body text-ink font-sans" style={{ maxWidth: '60ch' }}>
              This submits an on-chain transaction paying out{' '}
              <span className="font-mono tabular-nums">{PAYOUT_AMOUNT}</span>{' '}
              from the bond reserve to the challenger. This cannot be undone
              once broadcast.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelPayout}
                className="border border-boundary bg-surface-raised px-3 py-1.5 text-body text-ink font-sans transition-colors duration-short ease-standard hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPayout}
                className="border border-ink bg-ink px-3 py-1.5 text-body text-surface-raised font-sans transition-colors duration-short ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                Confirm payout
              </button>
            </div>
          </div>
        </Dialog>
      </section>
    </main>
  );
}
