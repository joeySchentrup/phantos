import type { ElectrumAccount, LevelCost } from "~/types/electrum";

/** The most stars a card carries, the same as a lore card's top level. */
export const MAX_STARS = 12;

/** The electrum that earns every star: the price of a Wish. */
export const ELECTRUM_FOR_ALL_STARS = 10000;

/**
 * A hero's stars are their electrum: all twelve at 10,000, and one fewer for
 * every twelfth of that they are short. Any electrum at all is worth the first
 * star; each star after it is earned whole, never rounded up.
 */
export function electrumStars(amount: number): number {
  if (!amount || amount <= 0) return 0;
  return Math.min(MAX_STARS, Math.max(1, Math.floor((amount * MAX_STARS) / ELECTRUM_FOR_ALL_STARS)));
}

/** What a typed amount comes to: a whole number, never negative. Anything else is 0. */
export function parseElectrum(text: string): number {
  const n = Math.round(Number(text));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Everything held, and everything spent, across the ledger. */
export function ledgerTotals(accounts: Pick<ElectrumAccount, "amount" | "spent">[]): { held: number; spent: number } {
  return accounts.reduce(
    (totals, account) => ({ held: totals.held + (account.amount || 0), spent: totals.spent + (account.spent || 0) }),
    { held: 0, spent: 0 }
  );
}

/** The account without a hero that is in this player's name, whatever its capitals. */
export function accountForPlayer<T extends Pick<ElectrumAccount, "name" | "hero">>(accounts: T[], player: string): T | undefined {
  const wanted = player.trim().toLowerCase();
  if (!wanted) return undefined;
  return accounts.find((account) => !account.hero && account.name.trim().toLowerCase() === wanted);
}

/**
 * The levels climbed going from `from` to `to`, each with its cost. Null when
 * there is nothing to climb or the table has no price for one of the levels.
 */
export function levelUpSteps(costs: Pick<LevelCost, "level" | "cost">[], from: number, to: number): { level: number; cost: number }[] | null {
  if (to <= from) return null;
  const steps: { level: number; cost: number }[] = [];
  for (let level = from + 1; level <= to; level++) {
    const row = costs.find((c) => c.level === level);
    if (!row) return null;
    steps.push({ level, cost: row.cost });
  }
  return steps;
}
