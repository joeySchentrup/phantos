import type { HeroSummary } from "~/types/hero";
import type { Player } from "~/types/player";

/** PocketBase's shortest password. */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Whether `player` may write for the hero: their backstory and their updates.
 * Only an approved player, and only for the hero they play. The server's
 * rules decide in the end; this only says what to offer.
 */
export function playsHero(player: Pick<Player, "approved" | "hero"> | null, heroId: string): boolean {
  return !!player && player.approved && !!player.hero && player.hero === heroId;
}

/** "Daymond Greystone (Joey)", how a hero is offered to choose from; a DM also sees which are drafts. */
export function heroChoiceLabel(hero: Pick<HeroSummary, "name" | "player" | "published">): string {
  const player = hero.player?.trim();
  return `${hero.name}${player ? ` (${player})` : ""}${hero.published ? "" : " — draft"}`;
}
