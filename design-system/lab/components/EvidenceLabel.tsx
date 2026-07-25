// EvidenceLabel: the exception-case legend chip for Historical/Blueprint
// content, per PRINCIPLES.md Principle 2 ("Live, Historical, and Blueprint
// differ in construction, not just in label"). Per Part1 §25, badges are
// reserved for genuine confusion risk -- across most of the product, Live is
// told apart from Historical/Blueprint through construction (fill vs.
// outline, activity vs. inertness), never a label on every element. This
// component is that narrow exception: a quiet chip plus a "?" legend
// trigger, for the few screens (the template picker, a `/proof/N` header,
// `/build` sections) where the brief calls out genuine confusion risk.
//
// There is deliberately no `'live'` member in `EvidenceLabelKind` -- Live is
// the *absence* of a label (Part1 §25: "Live default is usually
// unlabelled"), so the type system itself makes `<EvidenceLabel
// kind="live" />` a compile error rather than relying on a convention no one
// enforces at the call site. Phase 2 renders nothing at all for live
// content; this component only ever fires for the other two kinds.
//
// No `--accent` anywhere: the chip is `--muted`/`--boundary`, the same quiet
// chrome the data-display page's `Badge`/`Tag` atoms use, so it reads as
// restrained metadata, not an emphasis device. No `rounded-*`, matching
// every other atom in this system (tokens.css: "Corners are cut (chamfered),
// not rounded"). The tooltip reuses the data-display page's pure-CSS
// `group-hover`/`group-focus-within` pattern -- no JS state, so no `use
// client` -- which makes the legend reachable by keyboard focus on the "?"
// trigger, not just a mouse hover.

export type EvidenceLabelKind = 'historical' | 'blueprint';

const COPY: Record<EvidenceLabelKind, string> = {
  historical: 'Historical — a completed, recorded outcome.',
  blueprint: 'Blueprint — a design proposal, not executable in this build.',
};

export function EvidenceLabel({ kind }: { kind: EvidenceLabelKind }) {
  return (
    <span className="group relative inline-flex items-center gap-1">
      <span
        className="border border-boundary bg-surface-raised px-1.5 py-0.5 font-sans text-data uppercase tracking-wide text-muted"
        style={{ fontSize: '0.7rem' }}
      >
        {kind}
      </span>
      <button
        type="button"
        aria-label={`What does "${kind}" mean?`}
        className="border border-boundary px-1 font-sans text-muted transition-colors duration-short ease-standard hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        style={{ fontSize: '0.7rem' }}
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-56 whitespace-normal border border-ink bg-ink px-2 py-1 text-data text-surface-raised opacity-0 transition-opacity duration-short ease-standard group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {COPY[kind]}
      </span>
    </span>
  );
}
