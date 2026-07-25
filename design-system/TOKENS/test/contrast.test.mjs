import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { contrastRatio } from '../contrast.mjs';

function readTokens() {
  const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
  const tokens = {};
  for (const match of css.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8});/g)) {
    tokens[match[1]] = match[2];
  }
  return tokens;
}

// `destructive` is added to this list per PRINCIPLES.md Principle 3: it must
// be a separately-named token, never equal to `consequential` (the exclusive
// slash-only accent). VISUAL_LANGUAGE.md's Territory A section explicitly
// calls this out: "a `destructive` — a separately named token for destructive
// UI controls, never equal to `consequential`."
const REQUIRED_TOKENS = [
  'surface', 'surface-raised', 'ink', 'accent', 'positive', 'consequential',
  'warning', 'muted', 'boundary', 'destructive',
];

test('every required color token is defined', () => {
  const tokens = readTokens();
  for (const name of REQUIRED_TOKENS) {
    assert.ok(tokens[name], `missing --${name}`);
  }
});

const TEXT_PAIRS = [
  ['ink', 'surface'],
  ['muted', 'surface'],
  ['accent', 'surface'],
];

test('text-on-surface pairs meet WCAG AA (4.5:1)', () => {
  const tokens = readTokens();
  for (const [fg, bg] of TEXT_PAIRS) {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs 4.5:1`);
  }
});

// `destructive` is checked here, not in TEXT_PAIRS above. Reasoning: in this
// system destructive is the fill for a solid destructive UI control (a
// "delete"/"cancel bond" button, a destructive icon) — a graphical UI
// component that must be distinguishable from the page it sits on, not a
// paragraph of body text set directly on `surface`. That is the WCAG
// non-text/UI-component contrast class (3:1), the same class `boundary`
// (a hairline rule, also a graphical element) is checked against below —
// not the 4.5:1 text class used for `ink`/`muted`/`accent`, which do render
// as running prose or inline labels directly on `surface`.
const UI_PAIRS = [
  ['boundary', 'surface'],
  ['destructive', 'surface'],
];

test('UI boundary pairs meet WCAG AA for graphics (3:1)', () => {
  const tokens = readTokens();
  for (const [fg, bg] of UI_PAIRS) {
    const ratio = contrastRatio(tokens[fg], tokens[bg]);
    assert.ok(ratio >= 3, `${fg} on ${bg} is ${ratio.toFixed(2)}:1, needs 3:1`);
  }
});
