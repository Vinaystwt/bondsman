// Form controls lab: input, textarea, select, checkbox, radio (grouped),
// slider, and an "address chip" concept, each wrapped in the shared `Field`
// component (components/Field.tsx) and each rendered across four forced
// visual states -- default, focus, error, disabled -- as a table (control
// rows x state columns), matching the layout Task 11's /buttons page used
// for its variant x state matrix, per PRINCIPLES.md Principle 4 ("chooses a
// table... before it chooses a repeated card grid").
//
// Deviation from the Task 12 brief, documented the same way Task 11 and
// Field.tsx document theirs: the brief's sample `Field` rendered its error
// text with `text-consequential`. That token is reserved exclusively for the
// slash moment (PRINCIPLES.md Principle 3 names "form-validation errors" as
// explicitly out of bounds for it) so every error state below reads through
// Field using `--destructive` instead -- see Field.tsx's header comment for
// the full reasoning. No control on this page uses `--accent`: focus is
// always a plain `--ink` outline (an `outline` utility on native controls;
// a `peer-focus-visible` ring on the visually-hidden checkbox/radio inputs),
// matching Button's "ink weight, rules, motion -- never a third colour" rule
// from components/Button.tsx.
//
// Static server component -- no hooks, no event handlers, just native form
// elements and Tailwind classes -- matching the lab's convention for pages
// with no real interactivity beyond what the browser gives native controls
// for free (see app/color/page.tsx's header comment).

import type { ReactElement } from 'react';
import { Field } from '../../components/Field';

const STATES = ['default', 'focus', 'error', 'disabled'] as const;
type DemoState = (typeof STATES)[number];

const STATE_LABEL: Record<DemoState, string> = {
  default: 'default',
  focus: 'focus',
  error: 'error',
  disabled: 'disabled',
};

// Shared base for every text-entry control (input, textarea, select). Border
// colour and the forced focus ring are applied per-state on top of this by
// `borderClass`/`forcedFocusClass` below, never by swapping in `--accent`.
const CONTROL_BASE =
  'w-full max-w-xs border bg-surface-raised text-ink text-body font-sans px-3 py-2 ' +
  'placeholder:text-muted transition-[border-color,box-shadow] duration-short ease-standard ' +
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ' +
  'disabled:opacity-40 disabled:cursor-not-allowed';

// Real `:focus-visible` already covers genuine keyboard/mouse focus (see
// CONTROL_BASE above); this only forces the same ring open on the one demo
// cell labelled "focus" so it screenshots correctly without a real focus
// event, mirroring Button.tsx's `forcedStateClasses`.
function forcedFocusClass(state: DemoState): string {
  return state === 'focus' ? 'outline outline-2 outline-offset-2 outline-ink' : '';
}

function borderClass(state: DemoState): string {
  return state === 'error' ? 'border-destructive' : 'border-boundary';
}

function captionFor(control: string, state: DemoState): string {
  return `${control} state="${state}"`;
}

function Caption({ text }: { text: string }) {
  return (
    <code className="font-mono" style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>
      {text}
    </code>
  );
}

function InputDemo({ state }: { state: DemoState }) {
  const id = `input-${state}`;
  const disabled = state === 'disabled';
  const error = state === 'error';
  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Field
        id={id}
        label="Wallet address"
        help="The address that will fund this bond."
        error={error ? 'Not a valid on-chain address.' : undefined}
      >
        <input
          id={id}
          name={id}
          type="text"
          placeholder="0x…"
          defaultValue={error ? '0xnotreal' : disabled ? '0x71C7…9d3a' : undefined}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          className={[CONTROL_BASE, borderClass(state), forcedFocusClass(state)].join(' ')}
        />
      </Field>
      <Caption text={captionFor('input', state)} />
    </div>
  );
}

function TextareaDemo({ state }: { state: DemoState }) {
  const id = `textarea-${state}`;
  const disabled = state === 'disabled';
  const error = state === 'error';
  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Field
        id={id}
        label="Dispute notes"
        help="Visible to the watchdog reviewing this challenge."
        error={error ? 'Notes are required to submit a challenge.' : undefined}
      >
        <textarea
          id={id}
          name={id}
          rows={3}
          placeholder="Describe the fault…"
          defaultValue={disabled ? 'Restored from your last session.' : undefined}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          className={[CONTROL_BASE, borderClass(state), forcedFocusClass(state), 'resize-none'].join(' ')}
        />
      </Field>
      <Caption text={captionFor('textarea', state)} />
    </div>
  );
}

function SelectDemo({ state }: { state: DemoState }) {
  const id = `select-${state}`;
  const disabled = state === 'disabled';
  const error = state === 'error';
  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Field
        id={id}
        label="Verifier"
        help="Chosen automatically by policy for this risk tier."
        error={error ? 'No verifier is deployed for this policy yet.' : undefined}
      >
        <div className="relative w-full max-w-xs">
          <select
            id={id}
            name={id}
            defaultValue="uptime"
            disabled={disabled}
            aria-invalid={error || undefined}
            aria-describedby={error ? `${id}-error` : `${id}-help`}
            className={[CONTROL_BASE, borderClass(state), forcedFocusClass(state), 'appearance-none pr-8'].join(
              ' ',
            )}
          >
            <option value="uptime">Uptime verifier</option>
            <option value="latency">Latency verifier</option>
            <option value="custom">Custom verifier</option>
          </select>
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink"
          >
            ▾
          </span>
        </div>
      </Field>
      <Caption text={captionFor('select', state)} />
    </div>
  );
}

// Checkbox: unfilled outline square by default, solid ink fill when checked
// -- the same fill/outline grammar tokens.css and Principle 2 use for
// evidence class, reused here for control state (checked = a settled fact
// about this form, not a drawing of one). The native input stays in the DOM
// as `sr-only` (not `display:none`) so screen readers still see a real
// checkbox; the visible square is a sibling `<span>` driven by `peer-checked`/
// `peer-focus-visible`, never a decorative-only div.
function CheckboxDemo({ state }: { state: DemoState }) {
  const id = `checkbox-${state}`;
  const disabled = state === 'disabled';
  const error = state === 'error';
  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Field
        id={id}
        label="Terms"
        help="Required before this bond can be funded."
        error={error ? 'You must accept the bond terms to continue.' : undefined}
      >
        <label
          htmlFor={id}
          className={[
            'inline-flex items-center gap-2 text-body text-ink font-sans',
            disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
          ].join(' ')}
        >
          <input
            id={id}
            name={id}
            type="checkbox"
            defaultChecked={disabled}
            disabled={disabled}
            aria-invalid={error || undefined}
            aria-describedby={error ? `${id}-error` : `${id}-help`}
            className="peer sr-only"
          />
          <span
            aria-hidden
            className={[
              'h-5 w-5 border bg-surface-raised peer-checked:bg-ink transition-colors duration-short ease-standard',
              borderClass(state),
              state === 'focus'
                ? 'outline outline-2 outline-offset-2 outline-ink'
                : 'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
            ].join(' ')}
          />
          I accept the bond terms
        </label>
      </Field>
      <Caption text={captionFor('checkbox', state)} />
    </div>
  );
}

// Radio group: two options sharing one labelled `<fieldset>`/`<legend>`, per
// FORMS.md's grouping rule -- `Field`'s own `label` stays the visual heading
// every other control uses (no `htmlFor`, since `<label for>` cannot target a
// `<fieldset>`), and the `<legend>` (visually hidden, same text) carries the
// group's real accessible name. Same filled-square grammar as the checkbox
// above, one size down.
function RadioGroupDemo({ state }: { state: DemoState }) {
  const groupId = `radio-${state}`;
  const disabled = state === 'disabled';
  const error = state === 'error';
  const options: Array<{ value: string; text: string }> = [
    { value: '30d', text: '30-day challenge window' },
    { value: '7d', text: '7-day challenge window' },
  ];
  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Field
        label="Challenge window"
        help="Applies to every action created from this policy."
        error={error ? 'Select a challenge window before continuing.' : undefined}
      >
        <fieldset
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${groupId}-error` : `${groupId}-help`}
          className="m-0 flex flex-col gap-2 border-0 p-0"
        >
          <legend className="sr-only">Challenge window</legend>
          {options.map((opt, i) => {
            const optionId = `${groupId}-${opt.value}`;
            return (
              <label
                key={opt.value}
                htmlFor={optionId}
                className={[
                  'inline-flex items-center gap-2 text-body text-ink font-sans',
                  disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer',
                ].join(' ')}
              >
                <input
                  id={optionId}
                  name={groupId}
                  type="radio"
                  value={opt.value}
                  defaultChecked={i === 0}
                  disabled={disabled}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={[
                    'h-4 w-4 border bg-surface-raised peer-checked:bg-ink transition-colors duration-short ease-standard',
                    borderClass(state),
                    state === 'focus'
                      ? 'outline outline-2 outline-offset-2 outline-ink'
                      : 'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ink',
                  ].join(' ')}
                />
                {opt.text}
              </label>
            );
          })}
        </fieldset>
      </Field>
      <Caption text={captionFor('radio group', state)} />
    </div>
  );
}

// Slider: native `<input type="range">` with the browser's default circular
// thumb overridden by `.ds-range` in app/globals.css (a plain Tailwind
// utility class cannot reach the `::-webkit-slider-thumb`/`::-moz-range-thumb`
// pseudo-elements) -- squared off to match this system's zero-curve rule.
// Focus still works as a plain `outline` utility on the input itself.
function SliderDemo({ state }: { state: DemoState }) {
  const id = `slider-${state}`;
  const disabled = state === 'disabled';
  const error = state === 'error';
  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Field
        id={id}
        label="Bond amount"
        help="Minimum bond for this policy's risk tier is 1,000."
        error={error ? 'Bond amount is below the policy minimum.' : undefined}
      >
        <input
          id={id}
          name={id}
          type="range"
          min={0}
          max={5000}
          step={100}
          defaultValue={error ? 400 : 2800}
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          className={[
            'ds-range',
            'w-full max-w-xs',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
            error ? 'ds-range-error' : '',
            state === 'focus' ? 'outline outline-2 outline-offset-2 outline-ink' : '',
          ].join(' ')}
        />
      </Field>
      <Caption text={captionFor('slider', state)} />
    </div>
  );
}

// "Address chip" concept: a resolved, already-selected on-chain address
// (a verifier, a watchdog, a payer) presented as a compact control rather
// than a free-text input -- the value is not typed, it is picked and then
// displayed, so the field renders as a chip-shaped button with a "Change"
// affordance instead of a text box. The address itself renders in the
// system's monospace numeral face per PRINCIPLES.md Principle 1 ("any value
// that is a hash, address... renders in the system's monospace numeral
// face"); the "Change" affordance stays in the sans prose face because it is
// UI chrome describing the address, not the address itself.
function AddressChipDemo({ state }: { state: DemoState }) {
  const id = `address-chip-${state}`;
  const disabled = state === 'disabled';
  const error = state === 'error';
  return (
    <div style={{ display: 'grid', gap: '0.5rem', justifyItems: 'start' }}>
      <Field
        id={id}
        label="Verifier address"
        help="Resolved automatically from the selected verifier contract."
        error={error ? 'This verifier address could not be resolved on-chain.' : undefined}
      >
        <button
          id={id}
          type="button"
          disabled={disabled}
          aria-invalid={error || undefined}
          aria-describedby={error ? `${id}-error` : `${id}-help`}
          className={[
            'inline-flex w-full max-w-xs items-center justify-between gap-3 border bg-surface-raised px-3 py-2',
            'transition-[border-color,box-shadow] duration-short ease-standard',
            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            borderClass(state),
            forcedFocusClass(state),
          ].join(' ')}
        >
          <span className="font-mono text-mono text-ink">
            {error ? '0x0000…0000' : '0x9F2b7a1C…C41a'}
          </span>
          <span className="text-body text-muted font-sans">Change</span>
        </button>
      </Field>
      <Caption text={captionFor('address chip', state)} />
    </div>
  );
}

const CONTROLS: Array<{ key: string; label: string; render: (state: DemoState) => ReactElement }> = [
  { key: 'input', label: 'Input', render: (state) => <InputDemo state={state} /> },
  { key: 'textarea', label: 'Textarea', render: (state) => <TextareaDemo state={state} /> },
  { key: 'select', label: 'Select', render: (state) => <SelectDemo state={state} /> },
  { key: 'checkbox', label: 'Checkbox', render: (state) => <CheckboxDemo state={state} /> },
  { key: 'radio', label: 'Radio group', render: (state) => <RadioGroupDemo state={state} /> },
  { key: 'slider', label: 'Slider', render: (state) => <SliderDemo state={state} /> },
  { key: 'address-chip', label: 'Address chip', render: (state) => <AddressChipDemo state={state} /> },
];

export default function FormsPage() {
  return (
    <main>
      <p>
        <a href="/">&larr; Back to lab index</a>
      </p>
      <h1>Form controls</h1>
      <p style={{ maxWidth: '72ch' }}>
        Seven controls (<code>input</code>, <code>textarea</code>, <code>select</code>,{' '}
        <code>checkbox</code>, <code>radio group</code>, <code>slider</code>, <code>address chip</code>)
        across four forced states (<code>default</code>, <code>focus</code>, <code>error</code>,{' '}
        <code>disabled</code>) &mdash; 28 cells, every one wrapped in the shared{' '}
        <code>Field</code> component (<code>components/Field.tsx</code>). No cell uses{' '}
        <code>--accent</code>: focus is always a plain <code>--ink</code> outline. Error state is
        always <code>--destructive</code>, never <code>--consequential</code> &mdash; see{' '}
        <code>Field.tsx</code>&rsquo;s header comment and <code>FORMS.md</code> for why. Full
        grouping, hierarchy, and pairing rules live in{' '}
        <code>design-system/FORMS.md</code>.
      </p>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  borderBottom: '1px solid var(--boundary)',
                  padding: '0.5rem',
                }}
              >
                Control
              </th>
              {STATES.map((state) => (
                <th
                  key={state}
                  className="font-mono"
                  style={{
                    textAlign: 'left',
                    borderBottom: '1px solid var(--boundary)',
                    padding: '0.5rem',
                    fontWeight: 400,
                  }}
                >
                  {STATE_LABEL[state]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CONTROLS.map((control) => (
              <tr key={control.key}>
                <th
                  scope="row"
                  style={{
                    textAlign: 'left',
                    verticalAlign: 'top',
                    borderBottom: '1px solid var(--boundary)',
                    padding: '1rem 0.5rem',
                    fontWeight: 600,
                  }}
                >
                  {control.label}
                </th>
                {STATES.map((state) => (
                  <td
                    key={`${control.key}-${state}`}
                    style={{
                      borderBottom: '1px solid var(--boundary)',
                      padding: '1rem 0.5rem',
                      verticalAlign: 'top',
                    }}
                  >
                    {control.render(state)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
