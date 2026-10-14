/**
 * A player's account: who they are, the hero they claimed, and whether a
 * Dungeon Master has approved them to write for that hero.
 */
export interface Player {
  id: string;
  name: string;
  email: string;
  /** The id of the hero they play; "" when they have none. */
  hero: string;
  approved: boolean;
  created: string;
  /** Their hero's name and URL name, on their own record when they may see the hero. */
  expand?: { hero?: { id: string; name: string; slug: string } };
}

export interface PlayerSignUp {
  name: string;
  email: string;
  password: string;
  /** The id of the hero they claim. */
  hero: string;
}
