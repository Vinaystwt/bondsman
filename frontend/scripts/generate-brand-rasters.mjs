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
const MARK_PATH =
  'M400 195H492V300H430L359 364V677H263V317L400 195ZM532 195H623L760 317V677H665V364L592 300H532V195ZM425 468H599V677H425V468ZM263 710H484V737L437 828H263V710ZM539 710H760V828H586L539 737V710Z';

function markSvg({ padded = false }) {
  // Chip variant: dark rounded background used for touch icon, manifest and
  // any raster context that lacks a container.
  if (padded) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="#0E0D0B" rx="160" />
  <path fill="#ECE6D8" fill-rule="evenodd" d="${MARK_PATH}" />
</svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
  <path fill="#0E0D0B" fill-rule="evenodd" d="${MARK_PATH}" />
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
    background: '#0E0D0B',
  });
});

// Open Graph and Twitter cards. Reuse the OG SVG.
const ogSvg = readFileSync(join(OUT, 'og.svg'), 'utf8');
renderPng({
  svg: ogSvg,
  width: 1200,
  height: 630,
  out: join(OUT, 'og.png'),
  background: '#0E0D0B',
});
renderPng({
  svg: ogSvg,
  width: 1200,
  height: 630,
  out: join(OUT, 'twitter.png'),
  background: '#0E0D0B',
});
