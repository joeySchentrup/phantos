export type LoreCategory = "tale" | "chronicle" | "myth" | "dispatch" | "codex" | "dragon" | "map";

export type LoreAttribute = "light" | "dark" | "fire" | "ice" | "earth" | "arcane" | "divine";

/** Everything a card needs — the feed never downloads document bodies. */
export interface LoreSummary {
  id: string;
  collectionId: string;
  collectionName?: string;
  slug: string;
  title: string;
  category: LoreCategory;
  attribute: LoreAttribute;
  author: string;
  summary: string;
  cover: string;
  word_count: number;
  published: boolean;
  /** In-universe year: negative for BC, positive for AC, 0 for undated. */
  year: number;
  circa: boolean;
  created: string;
}

export interface LoreEntry extends LoreSummary {
  content: string;
  updated: string;
}

export interface SearchHit extends LoreSummary {
  snippet: string;
}

export interface FeaturedImage {
  id: string;
  collectionId: string;
  collectionName?: string;
  image: string;
  caption: string;
  created: string;
}
