import type { HeroSummary } from "./hero";

/** One account on the ledger. */
export interface ElectrumAccount {
  id: string;
  /** Whose account it is: the player. */
  name: string;
  /** Electrum held now. */
  amount: number;
  /** Electrum spent in the shop so far. */
  spent: number;
  /** The hero the account belongs to; "" while it waits for one. */
  hero: string;
  /** The hero's card, when the visitor may see them. */
  expand?: { hero?: HeroSummary };
}

export type ElectrumAccountInput = Pick<ElectrumAccount, "name" | "amount" | "spent" | "hero">;

/** Something electrum buys, at a flat price. */
export interface ShopItem {
  id: string;
  name: string;
  price: number;
  description: string;
}

export type ShopItemInput = Omit<ShopItem, "id">;

/** What it costs to reach `level` from the one before. */
export interface LevelCost {
  id: string;
  level: number;
  cost: number;
}
