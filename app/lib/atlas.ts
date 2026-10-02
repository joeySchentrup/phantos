import type { ChartPoint, Feature, FeatureKind, Place, PlaceKind, Realm } from "~/types/atlas";

// ---------------------------------------------------------------------------
// The house style
// ---------------------------------------------------------------------------

/** Realm tints, by `tone`. The same six as the Chronicle's eras (`[data-tone]` in app.css). */
export const TONES = ["#f1cf4a", "#b07be0", "#f0713f", "#5fb6ea", "#c9925a", "#3fc7aa"];

/** What the Dungeon Master calls each tone. */
export const TINTS = ["Gold", "Violet", "Ember", "Sky", "Umber", "Teal"];

/** How strongly each tone is laid over the land; the paler ones need a little more. */
export const TONE_OPACITY = [0.26, 0.22, 0.22, 0.24, 0.26, 0.22];

export const PLACE_KINDS: Record<PlaceKind, { glyph: string; label: string; size: number; glyphSize: number }> = {
  capital: { glyph: "★", label: "Capital", size: 26, glyphSize: 13 },
  city: { glyph: "●", label: "City", size: 20, glyphSize: 9 },
  port: { glyph: "◆", label: "Port", size: 20, glyphSize: 10 },
  fortress: { glyph: "■", label: "Fortress", size: 20, glyphSize: 9 },
  ruin: { glyph: "○", label: "Ruin", size: 20, glyphSize: 11 },
};

export const FEATURE_KINDS: Record<FeatureKind, { glyph: string; label: string }> = {
  mountains: { glyph: "▲", label: "Mountain range" },
  forest: { glyph: "♣", label: "Forest" },
  river: { glyph: "≈", label: "River" },
  lake: { glyph: "◯", label: "Lake" },
};

/** The chart that opens first. */
export const DEFAULT_CHART_SLUG = "hurly";

// ---------------------------------------------------------------------------
// The Dungeon Master's tools
// ---------------------------------------------------------------------------

export type AtlasTool = "select" | "add-place" | "draw-realm" | "draw-range" | "draw-forest" | "draw-river";

export const TOOLS: { id: AtlasTool; label: string; hint: string }[] = [
  {
    id: "select",
    label: "Select",
    hint: "Select a place, a realm or terrain on the chart to edit it below. Drag a place, or a selected item’s handles, to move it. Scroll or pinch to zoom.",
  },
  { id: "add-place", label: "Add a place", hint: "Click the chart where the place stands. It opens in the Places form." },
  { id: "draw-realm", label: "Draw a realm", hint: "Click the chart corner by corner, then finish the realm." },
  { id: "draw-range", label: "Draw a range", hint: "Click along the spine of the range, peak by peak, then finish." },
  { id: "draw-forest", label: "Plant a forest", hint: "Click the chart at the heart of the forest." },
  { id: "draw-river", label: "Draw a river", hint: "Click along the river from source to mouth, then finish." },
];

/** What is selected on the chart: one place, realm or piece of terrain. */
export interface AtlasSelection {
  type: "place" | "realm" | "feature";
  id: string;
}

/** Which layers of the chart are showing. */
export interface AtlasLayers {
  realms: boolean;
  terrain: boolean;
  places: boolean;
}

/** A record as the Dungeon Master has just changed it. */
export type AtlasEdit =
  | { type: "place"; record: Place }
  | { type: "realm"; record: Realm }
  | { type: "feature"; record: Feature };

/** The tools that take several clicks, and how many before the shape can be finished. */
export const DRAFT_TOOLS: Partial<Record<AtlasTool, { noun: string; needs: number }>> = {
  "draw-realm": { noun: "realm", needs: 3 },
  "draw-range": { noun: "range", needs: 2 },
  "draw-river": { noun: "river", needs: 2 },
};

/** A forest's or lake's spread: its radius, in chart units. */
export const SPREAD_MIN = 8;
export const SPREAD_MAX = 80;
export const DEFAULT_SPREAD = 20;
export const NEW_FOREST_SPREAD = 22;

/** A forest or lake is drawn this much flatter than it is wide. */
const SQUASH = 0.8;

export function isRound(kind: FeatureKind): boolean {
  return kind === "forest" || kind === "lake";
}

export function clampSpread(spread: number): number {
  return Math.max(SPREAD_MIN, Math.min(SPREAD_MAX, Math.round(spread) || DEFAULT_SPREAD));
}

/** The spread that puts a forest's or lake's edge under the pointer. */
export function spreadTo(heart: ChartPoint, x: number, y: number): number {
  return clampSpread(Math.hypot(x - heart[0], (y - heart[1]) / SQUASH));
}

/**
 * A feature's points and spread as another kind needs them. Between a range
 * and a river, or a forest and a lake, nothing moves; across the two shapes a
 * line gathers to its middle, and a heart stretches into a line as wide as it was.
 */
export function reshape(
  feature: { kind: FeatureKind; points: ChartPoint[]; spread: number },
  kind: FeatureKind
): { points: ChartPoint[]; spread: number } {
  if (isRound(kind) === isRound(feature.kind)) {
    return { points: feature.points, spread: isRound(kind) ? clampSpread(feature.spread) : 0 };
  }
  if (isRound(kind)) return { points: [centroid(feature.points)], spread: DEFAULT_SPREAD };
  const [x, y] = feature.points[0] ?? [0, 0];
  const reach = feature.spread || DEFAULT_SPREAD;
  return { points: [[x - reach, y], [x + reach, y]], spread: 0 };
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

function r1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** A curve through every point: Catmull-Rom, written as cubic Béziers (tension 1/6). */
export function smoothPath(points: ChartPoint[], closed: boolean): string {
  const n = points.length;
  if (n < 2) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  const count = closed ? n : n - 1;
  for (let i = 0; i < count; i++) {
    let p0 = points[(i - 1 + n) % n];
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    let p3 = points[(i + 2) % n];
    if (!closed) {
      if (i === 0) p0 = p1;
      if (i + 2 >= n) p3 = p2;
    }
    d +=
      ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)},${r1(p1[1] + (p2[1] - p0[1]) / 6)}` +
      ` ${r1(p2[0] - (p3[0] - p1[0]) / 6)},${r1(p2[1] - (p3[1] - p1[1]) / 6)}` +
      ` ${p2[0]},${p2[1]}`;
  }
  return closed ? `${d} Z` : d;
}

/** A closed polygon with straight sides. */
export function polygonPath(points: ChartPoint[]): string {
  if (!points.length) return "";
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) d += ` L${points[i][0]},${points[i][1]}`;
  return `${d} Z`;
}

/**
 * A row of peaks along the spine, one every 16 units. Alternate peaks sit a
 * little lower and every third stands taller, so a range doesn't look ruled.
 */
export function mountainPath(spine: ChartPoint[]): string {
  let d = "";
  let k = 0;
  for (let i = 0; i + 1 < spine.length; i++) {
    const a = spine[i];
    const b = spine[i + 1];
    const steps = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 16));
    for (let s = 0; s < steps; s++, k++) {
      const t = s / steps;
      const x = a[0] + (b[0] - a[0]) * t;
      const y = a[1] + (b[1] - a[1]) * t + (k % 2 ? 4 : 0);
      const h = k % 3 === 1 ? 15 : 11;
      const w = 8;
      d +=
        `M${r1(x - w)},${r1(y)} L${r1(x)},${r1(y - h)} L${r1(x + w)},${r1(y)} Z ` +
        `M${r1(x)},${r1(y - h)} L${r1(x + w * 0.45)},${r1(y - h * 0.1)} `;
    }
  }
  return d;
}

/** Trees on a sunflower spiral, the nearer ones drawn over the farther. */
export function forestPath(cx: number, cy: number, spread: number): string {
  const n = Math.max(5, Math.round((spread * spread) / 55));
  const trees: [number, number, number][] = [];
  for (let i = 0; i < n; i++) {
    const radius = spread * Math.sqrt((i + 0.5) / n);
    const angle = i * 2.39996;
    trees.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle) * SQUASH, 4.5 + (i % 3)]);
  }
  trees.sort((p, q) => p[1] - q[1]);

  let d = "";
  for (const tree of trees) {
    const x = r1(tree[0]);
    const y = r1(tree[1]);
    const s = tree[2];
    d +=
      `M${r1(x - s)},${y} a${s},${s} 0 1 0 ${2 * s},0 a${s},${s} 0 1 0 ${-2 * s},0 Z ` +
      `M${x},${r1(y + s)} L${x},${r1(y + s + 3)} `;
  }
  return d;
}

/** A three-lobed shore with two short waves inside. */
export function lakePath(cx: number, cy: number, spread: number): string {
  const shore: ChartPoint[] = [];
  for (let i = 0; i < 9; i++) {
    const angle = (i / 9) * Math.PI * 2;
    const wobble = 1 + 0.18 * Math.sin(angle * 3 + 1);
    shore.push([r1(cx + spread * wobble * Math.cos(angle)), r1(cy + spread * 0.62 * wobble * Math.sin(angle))]);
  }
  return (
    smoothPath(shore, true) +
    ` M${r1(cx - spread * 0.5)},${r1(cy + 1)} q4,-3 8,0 t8,0` +
    ` M${r1(cx - spread * 0.2)},${r1(cy + 7)} q4,-3 8,0 t8,0`
  );
}

/** The ring drawn round a selected forest or lake. */
export function ringPath(cx: number, cy: number, radius: number): string {
  const ring: ChartPoint[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    ring.push([r1(cx + radius * Math.cos(angle)), r1(cy + radius * SQUASH * Math.sin(angle))]);
  }
  return smoothPath(ring, true);
}

// ---------------------------------------------------------------------------
// Geometry and hit-testing
// ---------------------------------------------------------------------------

/** Ray casting: does the point lie inside the polygon? */
export function pointInPolygon(x: number, y: number, points: ChartPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i];
    const [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(x: number, y: number, a: ChartPoint, b: ChartPoint): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length2 = dx * dx + dy * dy;
  const t = length2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / length2)) : 0;
  return Math.hypot(x - (a[0] + t * dx), y - (a[1] + t * dy));
}

/** The middle of a set of points, on a whole chart unit. */
export function centroid(points: ChartPoint[]): ChartPoint {
  if (!points.length) return [0, 0];
  const sum = points.reduce<ChartPoint>((s, p) => [s[0] + p[0], s[1] + p[1]], [0, 0]);
  return [Math.round(sum[0] / points.length), Math.round(sum[1] / points.length)];
}

interface TerrainShape {
  kind: FeatureKind;
  points: ChartPoint[];
  spread?: number;
}

/**
 * The terrain under a point, the last drawn first. `z` is the zoom: the
 * target keeps a few screen pixels of slack however far out the reader is.
 */
export function hitTerrain<F extends TerrainShape>(x: number, y: number, features: F[], z: number): F | null {
  const slack = 4 / z;
  for (let i = features.length - 1; i >= 0; i--) {
    const feature = features[i];
    if (!feature.points.length) continue;
    if (isRound(feature.kind)) {
      const heart = feature.points[0];
      const radius = (feature.spread || DEFAULT_SPREAD) + slack;
      const dx = (x - heart[0]) / radius;
      const dy = (y - heart[1]) / (radius * SQUASH);
      if (dx * dx + dy * dy <= 1) return feature;
    } else {
      // Peaks stand above their spine, so a range is tested a little lower.
      const mountains = feature.kind === "mountains";
      const reach = (mountains ? 14 : 8) + slack;
      const yy = mountains ? y + 6 : y;
      for (let j = 0; j + 1 < feature.points.length; j++) {
        if (distanceToSegment(x, yy, feature.points[j], feature.points[j + 1]) <= reach) return feature;
      }
    }
  }
  return null;
}

/** The realm a point lies in. Where realms overlap, the last one wins. */
export function hitRealm<R extends { points: ChartPoint[] }>(x: number, y: number, realms: R[]): R | null {
  for (let i = realms.length - 1; i >= 0; i--) {
    if (pointInPolygon(x, y, realms[i].points)) return realms[i];
  }
  return null;
}

/** The realm a place is in: the one it names, else the one whose borders it stands inside. */
export function placeRealm(place: { x: number; y: number; realm?: string }, realms: { name: string; points: ChartPoint[] }[]): string {
  return place.realm || hitRealm(place.x, place.y, realms)?.name || "";
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

/** Zoom at which cities, ports, fortresses, ruins and seas are named. */
export const NAME_TIER_2_AT = 1.5;
/** Zoom at which ranges, forests, rivers and lakes are named. */
export const NAME_TIER_1_AT = 2.2;

/**
 * How deep the names go at this zoom. Tier 3 names realms and capitals only;
 * tier 2 adds the other places and the seas; tier 1 adds the terrain.
 */
export function nameTier(z: number): 1 | 2 | 3 {
  if (z >= NAME_TIER_1_AT) return 1;
  if (z >= NAME_TIER_2_AT) return 2;
  return 3;
}

/** A realm's name is sized to its width, in screen pixels before the label's own scale. */
export function labelSize(realm: { name: string; points: ChartPoint[] }): number {
  const xs = realm.points.map((p) => p[0]);
  const width = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
  return Math.max(6, Math.min(10, Math.round((width * 0.8) / Math.max(4, realm.name.length))));
}

/** Where a realm's name is written. */
export function realmLabel(realm: { label?: ChartPoint | null; points: ChartPoint[] }): ChartPoint {
  return realm.label?.length === 2 ? realm.label : centroid(realm.points);
}

/** Where terrain is named: above a range or river, beneath a forest or lake. */
export function terrainLabel(feature: TerrainShape): ChartPoint {
  const spread = feature.spread || DEFAULT_SPREAD;
  const at = feature.points[feature.kind === "river" ? Math.floor(feature.points.length / 2) : 0] ?? [0, 0];
  if (feature.kind === "mountains") return [at[0], at[1] - 14];
  if (feature.kind === "forest") return [at[0], at[1] + spread + 7];
  if (feature.kind === "lake") return [at[0], at[1] + spread * 0.62 + 8];
  return [at[0], at[1] - 8];
}

// ---------------------------------------------------------------------------
// The view
// ---------------------------------------------------------------------------

/**
 * How the chart sits in its frame: `z` is the zoom, and `tx` and `ty` are how
 * far the chart's corner is shifted — `tx` as a percentage of the frame's
 * width, `ty` of the chart's own height at that width.
 */
export interface View {
  z: number;
  tx: number;
  ty: number;
}

/** The frame's inside, in pixels. */
export interface Frame {
  width: number;
  height: number;
}

interface Sheet {
  width: number;
  height: number;
}

export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 6;
/** What one press of a zoom button does. */
export const ZOOM_STEP = 1.6;

export function clampZoom(z: number): number {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
}

/** The height the chart takes when it is as wide as the frame, in pixels. */
export function sheetHeight(frame: Frame, chart: Sheet): number {
  return (frame.width * chart.height) / chart.width;
}

/** Where the opening view centres: the chart's own choice, else the middle of its land. */
export function landCentre(chart: Sheet & { land?: ChartPoint[][] | null; land_centre?: ChartPoint | null }): ChartPoint {
  if (chart.land_centre?.length === 2) return chart.land_centre;
  const points = (chart.land ?? []).flat();
  if (!points.length) return [chart.width / 2, chart.height / 2];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

/** The opening view: `z` with `centre` in the middle of the frame. */
export function initialView(chart: Sheet, frame: Frame, centre: ChartPoint, z: number): View {
  return {
    z,
    tx: 50 - (centre[0] / chart.width) * 100 * z,
    ty: (frame.height / sheetHeight(frame, chart)) * 50 - (centre[1] / chart.height) * 100 * z,
  };
}

/** A pixel inside the frame, in the units of `tx` and `ty`. */
export function frameToView(px: number, py: number, frame: Frame, chart: Sheet): [number, number] {
  return [(px / frame.width) * 100, (py / sheetHeight(frame, chart)) * 100];
}

/** Zooms to `z`, keeping whatever is under `(fx, fy)` where it is. */
export function zoomAbout(view: View, z: number, fx: number, fy: number): View {
  const next = clampZoom(z);
  return {
    z: next,
    tx: fx - ((fx - view.tx) * next) / view.z,
    ty: fy - ((fy - view.ty) * next) / view.z,
  };
}

/** The chart position under a pixel inside the frame, on a whole chart unit. */
export function pointerToChart(px: number, py: number, view: View, frame: Frame, chart: Sheet): ChartPoint {
  const [fx, fy] = frameToView(px, py, frame, chart);
  return [
    Math.round(((fx - view.tx) / view.z) * (chart.width / 100)),
    Math.round(((fy - view.ty) / view.z) * (chart.height / 100)),
  ];
}

/** Where a chart position falls in the frame, as percentages of the frame's width and height. */
export function chartToFrame(x: number, y: number, view: View, frame: Frame, chart: Sheet): [number, number] {
  return [
    view.tx + (x / chart.width) * 100 * view.z,
    ((view.ty + (y / chart.height) * 100 * view.z) * sheetHeight(frame, chart)) / frame.height,
  ];
}
