import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const FRONTEND_ROOT = resolve(__dirname, '..');

/**
 * The copy audit collects visible product copy from every .tsx source in
 * app/ and components/ and asserts none of it contains a visible hyphen, en
 * dash or em dash. Technical identifiers (CSS class strings, endpoint
 * paths, code samples, package names, protocol identifiers) are excluded so
 * the assertion is meaningful.
 */

function collect(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      collect(full, out);
    } else if (/\.(tsx?|mjs)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function stringLiterals(src) {
  const out = [];
  const re = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  let m;
  while ((m = re.exec(src)) !== null) out.push(m[2]);
  return out;
}

const TAILWIND_PREFIXES = [
  'text-',
  'bg-',
  'border-',
  'hover:',
  'focus:',
  'focus-visible:',
  'sm:',
  'md:',
  'lg:',
  'xl:',
  '2xl:',
  'mt-',
  'mb-',
  'mx-',
  'ml-',
  'mr-',
  'my-',
  'py-',
  'px-',
  'p-',
  'pl-',
  'pr-',
  'pt-',
  'pb-',
  'gap-',
  'w-',
  'h-',
  'min-',
  'max-',
  'space-',
  'grid-',
  'flex-',
  'items-',
  'justify-',
  'rounded-',
  'overflow-',
  'whitespace-',
  'leading-',
  'font-',
  'tabular',
  'serial',
  'shrink-',
  'grow-',
  'top-',
  'bottom-',
  'left-',
  'right-',
  'inset-',
  'z-',
  'opacity-',
  'transition-',
  'duration-',
  'transform-',
  'translate-',
  'scale-',
  'rotate-',
  'first:',
  'last:',
  'not-',
  'sr-',
  'peer-',
  'group-',
  'aria-',
  'data-',
  'has-',
  'ring-',
  'shadow-',
  'decoration-',
  'underline-',
  'blur-',
  'backdrop-',
  'fill-',
  'stroke-',
  'accent-',
  'text-[',
  'motion-safe:',
  'motion-reduce:',
  'placeholder-',
  'placeholder:',
  'break-',
  'truncate',
  'italic',
  'not-italic',
  'block',
  'inline-block',
  'inline-flex',
  'inline-grid',
  'hidden',
];

function looksLikeCssClassList(str) {
  const tokens = str.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return false;
  const cssHits = tokens.filter((tok) =>
    TAILWIND_PREFIXES.some(
      (pfx) => tok === pfx || tok.startsWith(pfx) || tok.includes(':'),
    ),
  );
  return cssHits.length / tokens.length >= 0.55;
}

function looksLikeCodeSample(str) {
  if (str.includes('\n')) return true;
  if (str.includes('${')) return true;
  if (str.includes('{"') || str.includes('": ')) return true;
  if (/^(POST|GET|PUT|PATCH|DELETE|HTTP)\s/.test(str)) return true;
  if (/^\s*[{}[\]]/.test(str)) return true;
  return false;
}

function looksLikePath(str) {
  return /^(\.\.?|@|\/|https?:|~)/.test(str);
}

function looksLikeSchemaOrIdentifier(str) {
  // snake_case, kebab-case-only, dotted schema ids, uuid-ish
  if (/^[a-z0-9_.]+$/i.test(str)) return true;
  if (/^[a-z][a-z0-9-]*$/.test(str) && !/\s/.test(str)) return true;
  if (/^0x[0-9a-fA-F]+$/.test(str)) return true;
  return false;
}

function isVisibleCopy(str) {
  if (!str) return false;
  if (str.length < 6) return false;
  if (!/[a-zA-Z]/.test(str)) return false;
  if (!/\s/.test(str)) return false;
  if (looksLikePath(str)) return false;
  if (looksLikeCodeSample(str)) return false;
  if (looksLikeCssClassList(str)) return false;
  if (looksLikeSchemaOrIdentifier(str)) return false;
  // Must have at least two word characters separated by a space (real sentence).
  const words = str.split(/\s+/).filter((w) => /^[a-zA-Z']+$/.test(w));
  if (words.length < 2) return false;
  return true;
}

// Exempt substrings that ARE meant to appear verbatim as technical values.
const EXEMPT_TOKENS = [
  'casper:casper-test',
  'ui-monospace',
  'PAYMENT-SIGNATURE',
  'x402-facilitator',
  'account-hash-',
  'hash-',
  '@vinaystwt',
  'bondsman-mcp',
  'delivery-contradiction',
  'bond-policy',
  'prefers-reduced-motion',
  '#path-',
  'delivery_contradiction',
  'invoice_payout',
  'CEP-18',
  'x402',
];

function containsVisibleDash(str) {
  if (!/[-–—]/.test(str)) return false;
  const stripped = EXEMPT_TOKENS.reduce((acc, tok) => acc.split(tok).join(''), str);
  return /[-–—]/.test(stripped);
}

test('no user visible copy contains a hyphen, en dash or em dash', () => {
  const files = [
    ...collect(join(FRONTEND_ROOT, 'app')),
    ...collect(join(FRONTEND_ROOT, 'components')),
    ...collect(join(FRONTEND_ROOT, 'lib')),
  ];

  const offenders = [];
  for (const file of files) {
    // Skip the test file itself.
    if (file === __filename) continue;
    const src = readFileSync(file, 'utf8');
    for (const lit of stringLiterals(src)) {
      if (isVisibleCopy(lit) && containsVisibleDash(lit)) {
        offenders.push({ file, lit });
      }
    }
  }

  assert.deepEqual(
    offenders,
    [],
    `Found visible copy with dashes:\n${offenders
      .map((o) => `  ${o.file}: ${JSON.stringify(o.lit)}`)
      .join('\n')}`,
  );
});
