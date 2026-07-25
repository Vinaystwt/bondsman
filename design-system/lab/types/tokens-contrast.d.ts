// Ambient declaration for design-system/TOKENS/contrast.mjs (Task 6). That
// file is a plain, untyped .mjs module shared with a Node test runner
// (design-system/TOKENS/test/contrast.test.mjs), so it deliberately has no
// TypeScript of its own; this shim lets the lab (which runs with
// `allowJs: false`) import it with types instead of turning on project-wide
// JS checking just for one file.
//
// A relative `declare module '../../../TOKENS/contrast.mjs'` specifier here
// would resolve relative to *this* .d.ts file's own location, not relative
// to whichever page imports it, so it wouldn't match app/color/page.tsx's
// import specifier. A wildcard match on the extension avoids that mismatch
// and covers any future lab page that imports contrast.mjs the same way.
declare module '*/TOKENS/contrast.mjs' {
  export function hexToRgb(hex: string): { r: number; g: number; b: number };
  export function relativeLuminance(hex: string): number;
  export function contrastRatio(hexA: string, hexB: string): number;
}
