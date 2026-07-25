'use client';

// Dialog: centered, backdrop-covered overlay. `blocking` is the toggle
// RESPONSIVE.md §4 keys its "concrete distinguishing test" on: "if closing
// the overlay by pressing Escape or clicking outside it would be an
// acceptable, side-effect-free thing for the user to do at any point while
// it's open, it's a Drawer. If dismissing it needs to be preventable... it's
// a Dialog with `blocking`." Task 15's stated instantiations are the
// submit-confirmation flow and the tamper-test flow (Part1 §9 Type 3) -- see
// app/overlays/page.tsx for both, plus a non-blocking dialog for contrast.
//
// `blocking=true` does two real things, not just a visual affordance:
// - Escape is a no-op (the `onKey` handler below only calls `onClose` when
//   `!blocking`).
// - Focus is trapped inside the dialog: Tab/Shift+Tab cycle only through the
//   dialog's own focusable elements, via the `onKeyDown` Tab-interception
//   below, not merely a `tabIndex={-1}` on the container (a plain tabIndex
//   only makes the container itself programmatically focusable -- it does
//   nothing to stop Tab from walking focus out to the page behind the
//   backdrop, which is the actual trap requirement).
// - No close control is rendered when `blocking` (see JSX below): the only
//   way out is whatever affirmative action `children` provides (e.g.
//   Confirm/Cancel buttons), matching RESPONSIVE.md §4's "needs an explicit
//   'yes, I mean this,' not just 'close.'"
//
// No `--accent` anywhere: backdrop is `--ink` at reduced opacity, panel chrome
// is `--surface-raised`/`--boundary`, matching every other overlay in this
// system. No `rounded-*` class, per Task 11-14's convention.

import { useEffect, useRef } from 'react';
import type { ReactNode, KeyboardEvent as ReactKeyboardEvent } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  blocking = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  blocking?: boolean;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Move focus into the panel on open. Prefer the first focusable
    // descendant (e.g. a real Cancel/Confirm button) over the panel
    // container itself, so blocking dialogs land focus on an actual action
    // rather than an inert div.
    const firstFocusable = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panelRef.current)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        // Escape is disabled entirely while blocking -- not just "handled
        // differently" -- per RESPONSIVE.md §4.
        if (!blocking) onClose();
        return;
      }

      if (blocking && e.key === 'Tab') {
        const container = panelRef.current;
        if (!container) return;
        const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;
        const withinPanel = active instanceof Node && container.contains(active);

        if (e.shiftKey) {
          if (!withinPanel || active === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (!withinPanel || active === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, blocking, onClose]);

  if (!open) return null;

  const titleId = `dialog-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  // Blocking dialogs get no backdrop-click dismissal either -- the backdrop
  // below only carries an onClick when !blocking, so "click outside" is as
  // disabled as Escape for a blocking dialog (RESPONSIVE.md §4's test
  // applies to both dismissal paths, not just the keyboard one).
  function onBackdropClick() {
    if (!blocking) onClose();
  }

  function onPanelKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    // Stop a bare click/keydown on the panel from bubbling to the backdrop's
    // handler (not strictly needed since the backdrop and panel are
    // siblings-in-a-wrapper below, but keeps intent explicit if the DOM
    // shape changes later).
    e.stopPropagation();
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-ink/60"
      onClick={onBackdropClick}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role={blocking ? 'alertdialog' : 'dialog'}
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onPanelKeyDown}
        className="flex max-w-md flex-col gap-4 border border-boundary bg-surface-raised p-6"
      >
        <h2 id={titleId} className="text-headline text-ink font-sans">
          {title}
        </h2>
        {children}
        {!blocking && (
          <div>
            <button
              type="button"
              onClick={onClose}
              className="border border-boundary bg-surface-raised px-3 py-1.5 text-body text-ink font-sans transition-colors duration-short ease-standard hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
