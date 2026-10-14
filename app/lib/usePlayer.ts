import { useEffect, useState } from "react";
import { currentPlayer, onPlayerChange, refreshPlayer } from "~/backend/api";
import type { Player } from "~/types/player";

/**
 * The signed-in player, or null. Starts null so the prerendered shell and the
 * first client render agree, then catches up, and fetches the player afresh
 * once a page load: a DM may have approved them since they signed in.
 */
export function usePlayer(): Player | null {
  const [player, setPlayer] = useState<Player | null>(null);

  useEffect(() => {
    setPlayer(currentPlayer());
    refreshPlayer();
    return onPlayerChange(setPlayer);
  }, []);

  return player;
}
