// Field: the single label/help/error wrapper every form control in this
// system reuses (input, textarea, select, checkbox, radio, slider, address
// chip — see design-system/lab/app/forms/page.tsx). Task 12's brief supplied
// a starting shape for this component; one deviation from that starting
// shape is intentional and documented here for review, the same way Task 11
// documented its Button deviation in components/Button.tsx's header comment:
//
// The brief's sample rendered the error paragraph as `text-consequential`.
// That is wrong under this project's own rules and is corrected below to
// `text-destructive`. PRINCIPLES.md Principle 3 is explicit and reads as a
// hard requirement, not a style preference: the `consequential` accent is
// "used nowhere else in the entire system — not on form-validation errors,
// not on destructive buttons, not on warning banners, not on hover states"
// and appears *only* on the slashed portion of a resolved bond split. A form
// validation error is exactly the "form-validation errors" case Principle 3
// names as out-of-bounds for that token. This system already carries a
// separately-named `--destructive` token (tokens.css) for non-slash negative
// UI states (Task 11's `Button` `destructive` variant uses the same token),
// so form errors reuse that token instead of introducing a third meaning for
// `--consequential` or inventing a fourth colour.
//
// `--accent` is not used here either, per the same token-contract rule Task
// 11 followed: interactive/attention state (the error border on the control
// itself, focus rings) is carried by `--ink`/`--boundary` plus rules and
// weight, never a third colour (see forms/page.tsx's `FIELD_BASE`/error
// class wiring).
//
// `id` is an optional addition beyond the brief's required shape (label,
// help, error, children) so real forms can wire proper `htmlFor`/
// `aria-describedby` associations instead of relying on visual proximity
// alone: pass the same `id` you give the actual control, and reference
// `${id}-help` / `${id}-error` from that control's `aria-describedby`.
// Omitting `id` still renders a correct, if unassociated, label/control pair
// — every existing call site in forms/page.tsx supplies it.

import type { ReactNode } from 'react';

export function Field({
  label,
  help,
  error,
  children,
  id,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-body text-ink font-sans">
        {label}
      </label>
      {children}
      {help && !error && (
        <p id={id ? `${id}-help` : undefined} className="text-data text-muted font-sans">
          {help}
        </p>
      )}
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-data text-destructive font-sans">
          {error}
        </p>
      )}
    </div>
  );
}
