// Shared chamfer geometry for the icon set.
//
// This encodes ICONOGRAPHY.md's construction rule as code instead of leaving
// it to per-icon eyeballing: every corner cut in this directory is built
// from one of the two exact angles measured in LOGO_READING.md ("Stroke
// weight and terminal treatment"), never an arbitrary bevel and never a
// rounded corner --
//
//   - PRIMARY  ~41.7deg from horizontal -- the pillar chamfer, used on
//     structural/body corners (the default for most icon frames).
//   - BASE     62.68deg from horizontal -- the base-slab chamfer, reserved
//     for an icon's own "footing" element (wallet.tsx's bottom edge,
//     clock.tsx's stand, challenge.tsx's shield point) exactly the way the
//     logo reserves the steeper angle for its base slabs, not its pillars.
//
// Every path built here is straight-line-only (M/L/Z) -- no C/S/Q/T/A
// commands anywhere in this directory, matching LOGO_READING.md's "zero
// curve commands ... confirmed by parsing every path token."

export const PRIMARY_RATIO = Math.tan((41.7 * Math.PI) / 180); // ~0.892
export const BASE_RATIO = Math.tan((62.68 * Math.PI) / 180); // ~1.933

export type CornerCut = { dx: number; dy: number } | null;

export interface RectCorners {
  tl?: CornerCut;
  tr?: CornerCut;
  br?: CornerCut;
  bl?: CornerCut;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build one closed, straight-line-only rectangle boundary with independently
 * choosable per-corner chamfer cuts (or no cut, for a square corner).
 */
export function chamferedRect(x: number, y: number, w: number, h: number, corners: RectCorners = {}): string {
  const pts: [number, number][] = [];

  // top-left
  if (corners.tl) {
    pts.push([x, y + corners.tl.dy]);
    pts.push([x + corners.tl.dx, y]);
  } else {
    pts.push([x, y]);
  }
  // top-right
  if (corners.tr) {
    pts.push([x + w - corners.tr.dx, y]);
    pts.push([x + w, y + corners.tr.dy]);
  } else {
    pts.push([x + w, y]);
  }
  // bottom-right
  if (corners.br) {
    pts.push([x + w, y + h - corners.br.dy]);
    pts.push([x + w - corners.br.dx, y + h]);
  } else {
    pts.push([x + w, y + h]);
  }
  // bottom-left
  if (corners.bl) {
    pts.push([x + corners.bl.dx, y + h]);
    pts.push([x, y + h - corners.bl.dy]);
  } else {
    pts.push([x, y + h]);
  }

  return `M${pts.map(([px, py]) => `${round(px)},${round(py)}`).join('L')}Z`;
}

/** Convenience: same chamfer cut on all four corners, one ratio. */
export function chamferAll(x: number, y: number, w: number, h: number, leg: number, ratio = PRIMARY_RATIO): string {
  const cut = { dx: leg, dy: round(leg * ratio) };
  return chamferedRect(x, y, w, h, { tl: cut, tr: cut, br: cut, bl: cut });
}

/**
 * Chamfer an isosceles triangle (apex up, horizontal base) at all three
 * vertices, the same "cut every point at one of the two measured angles"
 * rule chamferAll/chamferedRing apply to rectangles -- but a triangle vertex
 * isn't a rectangle corner, so it needs its own construction:
 *
 *   - The apex sits between two mirrored slanted edges (neither horizontal
 *     nor vertical). A symmetric cut across it is necessarily a flat
 *     horizontal segment -- there is no dx/dy pair that makes a *symmetric*
 *     apex cut land on the 41.7deg/62.68deg family without tilting the tip
 *     off-center, so the apex is truncated by a plain horizontal line
 *     (`apexDrop` below the apex) rather than an angled chamfer.
 *   - Each base vertex sits between the horizontal base edge and a slanted
 *     side edge -- not two perpendicular edges like a rectangle corner --
 *     so the cut can't reuse chamferAll's shared dx/dy leg directly. Instead
 *     we walk a fixed distance `baseLeg` up the slanted edge, then solve
 *     algebraically for the distance along the horizontal base edge that
 *     makes the connecting segment's absolute angle from horizontal exactly
 *     equal to atan(ratio) -- the same provable target chamferAll uses,
 *     reached by solving rather than by construction.
 *
 * All three vertices are derived from the same apex/base inputs -- nothing
 * here is a hand-typed coordinate.
 */
export function chamferedIsoTriangle(
  apex: [number, number],
  baseY: number,
  baseHalfWidth: number,
  apexDrop: number,
  baseLeg: number,
  ratio = BASE_RATIO,
): string {
  const baseLeft: [number, number] = [apex[0] - baseHalfWidth, baseY];
  const baseRight: [number, number] = [apex[0] + baseHalfWidth, baseY];

  // Apex: flat horizontal cut, `apexDrop` below the apex, found by
  // intersecting the horizontal line y = apex.y + apexDrop with each side
  // edge (a straight-line lerp from apex to the corresponding base vertex).
  const apexCutPoint = (base: [number, number]): [number, number] => {
    const t = apexDrop / (base[1] - apex[1]);
    return [apex[0] + t * (base[0] - apex[0]), apex[1] + apexDrop];
  };
  const apexL = apexCutPoint(baseLeft);
  const apexR = apexCutPoint(baseRight);

  // Base corners: walk `baseLeg` up the slanted edge from the corner, then
  // solve for the point along the horizontal base edge that makes the
  // connecting segment's angle from horizontal exactly atan(ratio).
  const baseCornerCut = (corner: [number, number], otherBase: [number, number]): [[number, number], [number, number]] => {
    const dxSlant = apex[0] - corner[0];
    const dySlant = apex[1] - corner[1];
    const slantLen = Math.sqrt(dxSlant * dxSlant + dySlant * dySlant);
    const uSlant: [number, number] = [dxSlant / slantLen, dySlant / slantLen];
    const uHoriz: [number, number] = [Math.sign(otherBase[0] - corner[0]), 0];

    const onSlant: [number, number] = [corner[0] + baseLeg * uSlant[0], corner[1] + baseLeg * uSlant[1]];
    const sy = corner[1] - onSlant[1]; // vertical run of the target segment
    const sxMag = Math.abs(sy) / ratio; // horizontal run solved from the target angle
    const sx = sxMag * uHoriz[0];
    const q = (sx - corner[0] + onSlant[0]) / uHoriz[0];
    const onHoriz: [number, number] = [corner[0] + q * uHoriz[0], corner[1]];

    return [onSlant, onHoriz];
  };

  const [brSlant, brHoriz] = baseCornerCut(baseRight, baseLeft);
  const [blSlant, blHoriz] = baseCornerCut(baseLeft, baseRight);

  const pts: [number, number][] = [apexL, apexR, brSlant, brHoriz, blHoriz, blSlant];
  return `M${pts.map(([px, py]) => `${round(px)},${round(py)}`).join('L')}Z`;
}

/**
 * A hollow frame: outer chamfered rect minus inner chamfered rect, combined
 * as one evenodd path (two closed subpaths). The inner cut uses a
 * proportionally smaller leg so the ring reads as an even-width border.
 */
export function chamferedRing(
  x: number,
  y: number,
  w: number,
  h: number,
  thickness: number,
  outerCorners: RectCorners,
  innerLegScale = 0.45,
): string {
  const inner: RectCorners = {};
  (['tl', 'tr', 'br', 'bl'] as const).forEach((k) => {
    const c = outerCorners[k];
    if (c) inner[k] = { dx: Math.max(c.dx * innerLegScale, 0.6), dy: Math.max(c.dy * innerLegScale, 0.6) };
  });
  const outer = chamferedRect(x, y, w, h, outerCorners);
  const innerPath = chamferedRect(x + thickness, y + thickness, w - 2 * thickness, h - 2 * thickness, inner);
  return `${outer} ${innerPath}`;
}
