'use client';

// Drawer: dismissible, non-blocking side panel that reveals additional detail
// on demand -- RESPONSIVE.md §4's "Rail vs. Drawer" section, Task 15's stated
// instantiation ("transaction/receipt detail"). Per that section's rules,
// enforced here rather than left to callers:
//
// - Opens from an explicit user action, closes on Escape or its own close
//   control, and has NO backdrop that blocks interaction with the rest of
//   the page -- unlike Dialog below, this component renders no
//   `fixed inset-0` scrim, so the page behind it stays reachable.
// - Escape always closes it, unconditionally -- there is no `blocking` prop
//   here at all, because RESPONSIVE.md §4 is explicit that a Drawer must
//   never be "repurposed to feel more serious" by making it non-dismissible.
//   If a flow needs a non-dismissible, focus-trapped confirmation, that flow
//   uses Dialog with `blocking`, never this component.
// - Per the same section, a Drawer must never hold, request, or submit any
//   state that changes money -- that constraint is on call sites (this file
//   has no opinion on `children`), but see app/overlays/page.tsx for the
//   worked example of what stays out of a Drawer and moves to a blocking
//   Dialog instead.
//
// No `--accent` anywhere: the panel's chrome reads through `--surface-raised`
// (fill) and `--boundary` (the single left border), matching
// components/Button.tsx's convention of carrying every distinction through
// ink weight and rules rather than a third colour. No `rounded-*` class
// appears, matching Task 11/12/13/14's convention of plain `border` even
// though `--radius` resolves to `0px`.

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export function Drawer({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Escape always closes -- no `blocking` escape hatch on this component (see
  // header comment). Focus is moved to the close control on open so keyboard
  // users land somewhere sensible, but -- deliberately, per "non-blocking" --
  // no Tab-cycling trap is installed the way Dialog's `blocking` mode does:
  // a Drawer never prevents the user from tabbing back out to the rest of
  // the page.
  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const titleId = `drawer-title-${title.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <div
      role="dialog"
      aria-labelledby={titleId}
      className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col gap-4 border-l border-boundary bg-surface-raised p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-headline text-ink font-sans">
          {title}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="border border-boundary bg-surface-raised px-2 py-1 text-body text-ink font-sans transition-colors duration-short ease-standard hover:border-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}
