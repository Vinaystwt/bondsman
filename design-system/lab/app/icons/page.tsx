// Icon reference sheet (Task 23). Renders every icon in
// `components/icons/` at 16/24/32px, labelled by name, so the full set can
// be eyeballed together for consistency of chamfer angle, fill weight, and
// optical size across the three rendered sizes.
//
// No `--accent` anywhere on this page: the icons render in `text-ink` by
// default and the "in context" row below demonstrates the same artwork
// inheriting `text-muted` and `text-destructive` instead, per
// ICONOGRAPHY.md's "color is never hardcoded" rule.

import type { ReactElement } from 'react';
import {
  CopyIcon,
  ExternalLinkIcon,
  CheckmarkIcon,
  WarningIcon,
  ErrorIcon,
  InfoIcon,
  ChevronIcon,
  CloseIcon,
  HamburgerIcon,
  WalletIcon,
  ClockIcon,
  ChallengeIcon,
  type IconProps,
} from '../../components/icons';

const SIZES = [16, 24, 32] as const;

const ICONS: { name: string; Icon: (props: IconProps) => ReactElement }[] = [
  { name: 'copy', Icon: CopyIcon },
  { name: 'external-link', Icon: ExternalLinkIcon },
  { name: 'checkmark', Icon: CheckmarkIcon },
  { name: 'warning', Icon: WarningIcon },
  { name: 'error', Icon: ErrorIcon },
  { name: 'info', Icon: InfoIcon },
  { name: 'chevron (down)', Icon: (p: IconProps) => <ChevronIcon {...p} direction="down" /> },
  { name: 'chevron (up)', Icon: (p: IconProps) => <ChevronIcon {...p} direction="up" /> },
  { name: 'close', Icon: CloseIcon },
  { name: 'hamburger', Icon: HamburgerIcon },
  { name: 'wallet', Icon: WalletIcon },
  { name: 'clock / countdown', Icon: ClockIcon },
  { name: 'challenge / watchdog', Icon: ChallengeIcon },
];

export default function IconsPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="font-sans text-headline text-ink">Iconography</h1>
      <p className="mt-2 max-w-prose text-body text-muted">
        Every icon is hand-built (no external icon library), filled not
        stroked, zero curve commands, corners cut at the mark&apos;s own
        ~41.7&deg;/62.68&deg; chamfer angles where a cut is needed. See{' '}
        <code className="font-mono text-mono">ICONOGRAPHY.md</code> for the
        full construction rule.
      </p>

      <table className="mt-8 w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-boundary">
            <th className="py-2 pr-4 font-sans text-body font-normal text-muted">Icon</th>
            <th className="py-2 pr-4 font-sans text-body font-normal text-muted">16px</th>
            <th className="py-2 pr-4 font-sans text-body font-normal text-muted">24px</th>
            <th className="py-2 pr-4 font-sans text-body font-normal text-muted">32px</th>
          </tr>
        </thead>
        <tbody>
          {ICONS.map(({ name, Icon }) => (
            <tr key={name} className="border-b border-boundary">
              <td className="py-3 pr-4 font-mono text-mono text-ink">{name}</td>
              {SIZES.map((size) => (
                <td key={size} className="py-3 pr-4 align-middle text-ink">
                  <Icon size={size} title={name} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <h2 className="mt-10 font-sans text-subhead text-ink">In context</h2>
      <p className="mt-2 max-w-prose text-body text-muted">
        Same artwork, no accent: color is inherited from the surrounding
        ink/muted/destructive/warning/positive context, never hardcoded on
        the icon itself.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-6">
        <span className="flex items-center gap-2 text-ink">
          <CheckmarkIcon size={20} title="resolved" /> text-ink
        </span>
        <span className="flex items-center gap-2 text-muted">
          <InfoIcon size={20} title="info" /> text-muted
        </span>
        <span className="flex items-center gap-2 text-warning">
          <WarningIcon size={20} title="warning" /> text-warning
        </span>
        <span className="flex items-center gap-2 text-destructive">
          <ErrorIcon size={20} title="error" /> text-destructive
        </span>
        <span className="flex items-center gap-2 text-positive">
          <CheckmarkIcon size={20} title="success" /> text-positive
        </span>
      </div>
    </main>
  );
}
