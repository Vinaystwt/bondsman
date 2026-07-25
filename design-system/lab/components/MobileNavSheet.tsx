'use client';

// MobileNavSheet: full-height, full-width navigation overlay for narrow
// viewports -- Phase 2's global header (Part1 §7) instantiates this
// directly with the exact 5-item list (Product/App/Proof/Verify/Build) plus
// a footer Status row.
//
// Distinct from Drawer (design-system/lab/components/Drawer.tsx), which is
// an explicitly non-blocking, non-full-screen side panel for read-only
// detail: this sheet covers the entire viewport (`fixed inset-0`, no partial
// reveal of the page behind it) because it *replaces* the page's primary
// navigation while open, not a supplementary detail panel. It is still
// freely dismissible -- Escape and the close control both work
// unconditionally, same as Drawer -- there is no `blocking` mode here; a
// full-screen nav sheet is never the "cannot be dismissed" case RESPONSIVE.md
// §4 reserves for Dialog with `blocking`.
//
// Because it occupies the whole screen (unlike Drawer, which leaves the
// rest of the page reachable), focus is trapped inside it while open --
// the same Tab/Shift+Tab cycling Dialog's `blocking` mode uses -- so a
// keyboard/screen-reader user tabbing through the sheet's links and the
// footer Status link never falls through into inert page content sitting
// behind a full-bleed overlay.
//
// Every nav item and the close control get a real, explicit 44px minimum
// tap target height (`min-h-[44px]`) -- not just comfortable-looking
// padding -- because this is the primary mobile navigation surface; small
// targets here are a hard accessibility failure, not a taste call. Part1's
// A11Y.md does not exist yet, but 44px is that document's stated future
// floor and Task 25 is expected to check it.
//
// No `--accent` anywhere: the active item (the item matching the current
// path, when provided) reads through ink weight (bold) plus a left rule,
// exactly like every other "current state" signal in this system --
// never a third colour. No `rounded-*` class.

import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function MobileNavSheet({
  open,
  onClose,
  items,
  currentPath,
}: {
  open: boolean;
  onClose: () => void;
  items: { label: string; href: string }[];
  /** Optional: when an item's `href` matches, it renders as the active nav state. */
  currentPath?: string;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    closeButtonRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Full-screen sheet: trap Tab/Shift+Tab inside it, same mechanism as
      // Dialog's `blocking` mode, so focus never lands on page content
      // sitting behind the overlay.
      if (e.key === 'Tab') {
        const container = panelRef.current;
        if (!container) return;
        const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
        if (focusable.length === 0) return;
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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Navigation"
      aria-modal="true"
      className="fixed inset-0 z-40 flex flex-col bg-surface"
    >
      <div className="flex items-center justify-between border-b border-boundary px-4">
        <span className="text-body text-muted font-sans">Menu</span>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex min-h-[44px] min-w-[44px] items-center justify-center text-headline text-ink transition-colors duration-short ease-standard hover:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        >
          ✕
        </button>
      </div>

      <nav aria-label="Primary" className="flex flex-col">
        {items.map((item) => {
          const active = currentPath === item.href;
          return (
            <a
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex min-h-[44px] items-center border-b border-boundary px-6 text-headline font-sans transition-colors duration-short ease-standard',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
                active
                  ? 'border-l-4 border-l-ink pl-5 font-bold text-ink'
                  : 'text-ink hover:bg-surface-raised',
              ].join(' ')}
            >
              {item.label}
            </a>
          );
        })}
      </nav>

      <a
        href="/status"
        className="mt-auto flex min-h-[44px] items-center border-t border-boundary px-6 text-body text-muted font-sans transition-colors duration-short ease-standard hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        Status
      </a>
    </div>
  );
}
