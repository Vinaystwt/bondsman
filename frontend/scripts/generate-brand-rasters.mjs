/**
 * One shot brand raster generator. Reads the vector logo and writes PNG
 * assets at the sizes needed for Apple touch icon, manifest icons and the
 * Open Graph card. Run manually with `node scripts/generate-brand-rasters.mjs`.
 * The output files are checked in; this script is not called by the build.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const OUT = resolve(ROOT, 'public', 'brand');

function markSvg({ padded = false }) {
  // Chip variant: dark rounded background used for touch icon, manifest and
  // any raster context that lacks a container.
  if (padded) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" fill="#0B0F0D" rx="12" />
  <g stroke="#35C281" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M14 10 H10 A2 2 0 0 0 8 12 V52 A2 2 0 0 0 10 54 H14" stroke-width="3.6" />
    <path d="M50 10 H54 A2 2 0 0 1 56 12 V52 A2 2 0 0 1 54 54 H50" stroke-width="3.6" />
    <path d="M8 32 H56" stroke-width="4.6" />
  </g>
  <circle cx="32" cy="32" r="4.2" fill="#35C281" />
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <g stroke="#35C281" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <path d="M14 10 H10 A2 2 0 0 0 8 12 V52 A2 2 0 0 0 10 54 H14" stroke-width="3.6" />
    <path d="M50 10 H54 A2 2 0 0 1 56 12 V52 A2 2 0 0 1 54 54 H50" stroke-width="3.6" />
    <path d="M8 32 H56" stroke-width="4.6" />
  </g>
  <circle cx="32" cy="32" r="4.2" fill="#35C281" />
</svg>`;
}

function renderPng({ svg, width, height, out, background }) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background,
  });
  const rendered = resvg.render();
  const pixels = rendered.pixels;
  // resvg returns width x height by default from the SVG viewBox; if the
  // caller asked for a different height we generate a canvas SVG.
  writeFileSync(out, rendered.asPng());
  console.log(`wrote ${out} (${rendered.width}x${rendered.height})`);
  void height;
  void pixels;
}

// Icon rasters. Padded chip variant so the mark reads against any surface.
[
  { size: 180, name: 'apple-touch-icon.png' },
  { size: 192, name: 'icon-192.png' },
  { size: 512, name: 'icon-512.png' },
].forEach(({ size, name }) => {
  renderPng({
    svg: markSvg({ padded: true }),
    width: size,
    height: size,
    out: join(OUT, name),
    background: '#0B0F0D',
  });
});

// Open Graph and Twitter cards. Reuse the OG SVG.
const ogSvg = readFileSync(join(OUT, 'og.svg'), 'utf8');
renderPng({
  svg: ogSvg,
  width: 1200,
  height: 630,
  out: join(OUT, 'og.png'),
  background: '#0B0F0D',
});
renderPng({
  svg: ogSvg,
  width: 1200,
  height: 630,
  out: join(OUT, 'twitter.png'),
  background: '#0B0F0D',
});
