/**
 * The song player's rules, kept apart from the player so they can be tested.
 *
 * Songs play in the order they were posted. Playing one song carries on to the
 * song posted after it, and so on to the last; shuffle plays every song once,
 * in a random order. A queue is a list of song ids and an index into it.
 */

/** Pressing "previous" this far into a song starts it again instead. */
export const RESTART_AFTER_SECONDS = 3;

/** "3:07", or "1:02:03" for something an hour long; "" when the length isn't known. */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = String(total % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${secs}` : `${minutes}:${secs}`;
}

/** Every song in posting order, starting at `startId` (or the first song). */
export function orderQueue(ids: string[], startId?: string): { queue: string[]; index: number } {
  const index = startId ? ids.indexOf(startId) : 0;
  return { queue: [...ids], index: ids.length ? Math.max(index, 0) : -1 };
}

/**
 * Every song once, in a random order (Fisher–Yates). `first` leads the queue,
 * so turning shuffle on doesn't interrupt the song that's playing.
 */
export function shuffleQueue(ids: string[], first?: string, random: () => number = Math.random): string[] {
  const rest = ids.filter((id) => id !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  return first && ids.includes(first) ? [first, ...rest] : rest;
}

/** The index to play when a song ends or "next" is pressed; null at the end of the queue. */
export function nextIndex(queue: string[], index: number): number | null {
  return index + 1 < queue.length ? index + 1 : null;
}

/** What "previous" does: start this song again, or go back to the one before. */
export function previousIndex(index: number, time: number): { index: number; restart: boolean } {
  if (time > RESTART_AFTER_SECONDS || index <= 0) return { index: Math.max(index, 0), restart: true };
  return { index: index - 1, restart: false };
}

/** Song numbers follow posting order: the first song posted is No. 1. */
export function songNumber(ids: string[], id: string): number {
  return ids.indexOf(id) + 1;
}

/** How long an audio file runs, in whole seconds (0 if the browser can't tell). Browser-only. */
export function audioDuration(file: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (seconds: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(seconds) && seconds > 0 ? Math.round(seconds) : 0);
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => done(audio.duration);
    audio.onerror = () => done(0);
    audio.src = url;
  });
}
