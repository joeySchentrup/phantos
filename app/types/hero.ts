import type { LoreAttribute } from "./lore";

/** Everything a hero card needs — lists leave the backstory out. */
export interface HeroSummary {
  id: string;
  collectionId: string;
  collectionName?: string;
  slug: string;
  name: string;
  player: string;
  species: string;
  class: string;
  subclass: string;
  background: string;
  alignment: string;
  faith: string;
  attribute: LoreAttribute;
  summary: string;
  portrait: string;
  /** The small square copy of `portrait` the cards load; "" until one is made. */
  card_art?: string;
  published: boolean;
  created: string;
}

export interface Hero extends HeroSummary {
  backstory: string;
  updated: string;
}

/** One entry in the running list beneath a hero's backstory. */
export interface HeroUpdate {
  id: string;
  hero: string;
  title: string;
  /** Markdown. */
  body: string;
  created: string;
  updated: string;
}

export interface HeroUpdateInput {
  hero: string;
  title: string;
  body: string;
}
