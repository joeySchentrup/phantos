import { useEffect, useState } from "react";
import { isDungeonMaster, onDungeonMasterChange } from "~/backend/api";

/**
 * Whether the visitor is signed in as a Dungeon Master. Starts false so the
 * prerendered shell and the first client render agree, then catches up.
 */
export function useDungeonMaster(): boolean {
  const [isDm, setIsDm] = useState(false);

  useEffect(() => {
    setIsDm(isDungeonMaster());
    return onDungeonMasterChange(setIsDm);
  }, []);

  return isDm;
}
