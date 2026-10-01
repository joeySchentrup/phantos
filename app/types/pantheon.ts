import type { LoreAttribute } from "./lore";

export type PantheonRank = "creator" | "primal" | "twin" | "greater" | "other";

/** Everything a pantheon card needs — lists leave the document body out. */
export interface PantheonSummary {
  id: string;
  collectionId: string;
  collectionName?: string;
  slug: string;
  name: string;
  rank: PantheonRank;
  /** One element, or the two a Greater Dragon is born of. */
  attributes: LoreAttribute[];
  domain: string;
  summary: string;
  image: string;
  published: boolean;
  created: string;
}

export interface PantheonMember extends PantheonSummary {
  content: string;
  updated: string;
}
