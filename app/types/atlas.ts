import type { LoreSummary } from "./lore";

/** A position in chart units: `[x, y]`, whole numbers inside the chart's width and height. */
export type ChartPoint = [number, number];

export type PlaceKind = "capital" | "city" | "port" | "fortress" | "ruin";

export type FeatureKind = "mountains" | "forest" | "river" | "lake";

/** A sea's name, written across the water. */
export interface Sea {
  name: string;
  x: number;
  y: number;
  size: "large" | "small";
}

/** One chart of the Atlas: the land, and the sheet it is drawn on. */
export interface Chart {
  id: string;
  collectionId: string;
  collectionName?: string;
  name: string;
  slug: string;
  dateline: string;
  description: string;
  width: number;
  height: number;
  /** Closed coastlines, drawn smoothed. Empty while the chart is face down. */
  land: ChartPoint[][] | null;
  /** Where the opening view centres; the middle of the land when absent. */
  land_centre: ChartPoint | null;
  compass: ChartPoint | null;
  seas: Sea[] | null;
  underlay: string;
  published: boolean;
}

/** A point on the chart that draws a lore card. */
export interface Place {
  id: string;
  chart: string;
  name: string;
  kind: PlaceKind;
  x: number;
  y: number;
  /** The realm the place is said to stand in. Display only; "" leaves it to the borders. */
  realm: string;
  /** The id of the lore entry whose card this place draws; "" for none. */
  lore: string;
  published: boolean;
  /** The card itself, when the place was fetched with it. */
  expand?: { lore?: LoreSummary };
}

/** A political region: a polygon with a tint. */
export interface Realm {
  id: string;
  chart: string;
  name: string;
  standing: string;
  /** 0–5, an index into `TONES`. */
  tone: number;
  /** Where the name is written; the middle of the corners when absent. */
  label: ChartPoint | null;
  points: ChartPoint[];
  lore: string;
  published: boolean;
}

/** Terrain. A forest or lake is one point (its heart) and a spread; a range or river is a line. */
export interface Feature {
  id: string;
  chart: string;
  name: string;
  kind: FeatureKind;
  points: ChartPoint[];
  spread: number;
  published: boolean;
}

export type ChartInput = Omit<Chart, "id" | "collectionId" | "collectionName" | "underlay">;
export type PlaceInput = Omit<Place, "id" | "expand">;
export type RealmInput = Omit<Realm, "id">;
export type FeatureInput = Omit<Feature, "id">;
