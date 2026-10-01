/**
 * Years on the Hurlen count: negative for BC, positive for AC (the Age of
 * Concord). There is no year zero, so 0 means "not set".
 */
export interface Era {
  id: string;
  name: string;
  /** 0 = since the beginning. */
  start_year: number;
  /** 0 = still going. */
  end_year: number;
  circa: boolean;
  description: string;
}

/** A short note pinned to a year. Anything longer belongs in lore. */
export interface TimelinePoint {
  id: string;
  text: string;
  year: number;
  circa: boolean;
}

export type EraInput = Omit<Era, "id">;
export type TimelinePointInput = Omit<TimelinePoint, "id">;
