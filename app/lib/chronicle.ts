import type { Era } from "~/types/chronicle";

/**
 * Time on the Chronicle.
 *
 * A year is a whole number: negative for BC, positive for AC, and 0 for "not
 * set" (the Hurlen count has no year zero). To draw years on a line they are
 * mapped to an axis where 1 BC and 1 AC sit side by side: 1 AC is 0, 2 AC is
 * 1, 1 BC is -1.
 */

export type YearSuffix = "BC" | "AC";

export const POINT_MAX_LENGTH = 255;

export function formatYear(year: number, circa = false): string {
  if (!year) return "";
  return `${circa ? "c. " : ""}${Math.abs(year)} ${year < 0 ? "BC" : "AC"}`;
}

/** "c. 9500 BC – 8500 BC", "Before c. 10000 BC", "304 AC – present". */
export function formatEraRange(era: Pick<Era, "start_year" | "end_year" | "circa">): string {
  const start = formatYear(era.start_year, era.circa);
  const end = formatYear(era.end_year);
  if (!start && !end) return "All of time";
  if (!start) return `Before ${formatYear(era.end_year, era.circa)}`;
  if (!end) return `${start} – present`;
  return `${start} – ${end}`;
}

export function splitYear(year: number): { value: number; suffix: YearSuffix } {
  return { value: Math.abs(year), suffix: year < 0 ? "BC" : "AC" };
}

export function joinYear(value: number, suffix: YearSuffix): number {
  const whole = Math.floor(Math.abs(value));
  if (!Number.isFinite(whole) || !whole) return 0;
  return suffix === "BC" ? -whole : whole;
}

export function yearToAxis(year: number): number {
  return year > 0 ? year - 1 : year;
}

/** The year a position on the axis falls in. */
export function axisToYear(axis: number): number {
  const whole = Math.floor(axis);
  return whole >= 0 ? whole + 1 : whole;
}

// ---------------------------------------------------------------------------
// Graduations
// ---------------------------------------------------------------------------

const STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];

/** The smallest round step, in years, whose labels stay `minGap` pixels apart. */
export function tickStep(pxPerYear: number, minGap = 110): number {
  for (const step of STEPS) {
    if (step * pxPerYear >= minGap) return step;
  }
  return STEPS[STEPS.length - 1];
}

/** The unlabelled step between two labelled graduations; 0 when there is none. */
export function minorStep(step: number): number {
  if (step <= 1) return 0;
  return String(step).startsWith("5") ? step / 5 : step / 2;
}

/**
 * The years to mark between two axis positions: every multiple of `step`,
 * plus 1 AC — the year the count turns on, which is no multiple of anything.
 */
export function tickYears(fromAxis: number, toAxis: number, step: number): number[] {
  const years: number[] = [];
  const first = Math.ceil(fromAxis / step) * step;
  for (let axis = first; axis <= toAxis; axis += step) {
    if (axis < 0) years.push(axis);
    else if (axis === 0) years.push(1);
    else if (step > 1) years.push(axis);
    else years.push(axis + 1);
  }
  return years;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export interface Extent {
  /** Axis positions, not years. */
  min: number;
  max: number;
}

/** The stretch of the axis from the first dated thing to the last: at least a decade. */
export function timelineExtent(years: number[], eras: Pick<Era, "start_year" | "end_year">[]): Extent {
  const all = [...years, ...eras.flatMap((era) => [era.start_year, era.end_year])].filter(Boolean);
  if (!all.length) return { min: yearToAxis(-100), max: yearToAxis(100) };

  const min = yearToAxis(Math.min(...all));
  const max = yearToAxis(Math.max(...all));
  const pad = Math.max((10 - (max - min)) / 2, 0);
  return { min: min - pad, max: max + pad };
}

export interface EraBand<T> {
  era: T;
  row: number;
  /** Axis positions; an open end stops at the edge of the extent. */
  from: number;
  to: number;
}

/** Stacks eras into as few rows as will keep overlapping ones apart. */
export function packEras<T extends Pick<Era, "start_year" | "end_year">>(eras: T[], extent: Extent): EraBand<T>[] {
  const bands = eras
    .map((era) => ({
      era,
      row: 0,
      from: era.start_year ? yearToAxis(era.start_year) : extent.min,
      to: era.end_year ? yearToAxis(era.end_year) : extent.max,
    }))
    .sort((a, b) => a.from - b.from || b.to - a.to);

  const rowEnds: number[] = [];
  for (const band of bands) {
    let row = rowEnds.findIndex((end) => end <= band.from);
    if (row === -1) row = rowEnds.length;
    rowEnds[row] = band.to;
    band.row = row;
  }
  return bands;
}

export interface LaneItem {
  id: string;
  /** Pixels from the origin; the label starts here and runs right. */
  x: number;
  width: number;
}

export interface Cluster {
  x: number;
  ids: string[];
}

export interface LaneLayout {
  /** Lane 0 is nearest the axis. */
  lanes: Map<string, number>;
  /** Items that found no room, grouped where they fell. */
  clusters: Cluster[];
}

/**
 * Gives every label the nearest lane it fits in, working left to right.
 * Labels that fit nowhere are gathered into clusters to be opened by zooming.
 */
export function packLanes(items: LaneItem[], laneCount: number, gap = 10, clusterWidth = 44): LaneLayout {
  const lanes = new Map<string, number>();
  const clusters: Cluster[] = [];
  const laneEnds: number[] = Array.from({ length: Math.max(laneCount, 0) }, () => -Infinity);

  for (const item of [...items].sort((a, b) => a.x - b.x)) {
    const lane = laneEnds.findIndex((end) => end + gap <= item.x);
    if (lane !== -1) {
      lanes.set(item.id, lane);
      laneEnds[lane] = item.x + item.width;
      continue;
    }

    const last = clusters[clusters.length - 1];
    if (last && item.x - last.x <= clusterWidth) last.ids.push(item.id);
    else clusters.push({ x: item.x, ids: [item.id] });
  }

  return { lanes, clusters };
}
