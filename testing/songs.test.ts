import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SECTIONS } from "~/lib/sections";
import { formatDuration, nextIndex, orderQueue, previousIndex, shuffleQueue, songNumber } from "~/lib/songs";

const IDS = ["first", "second", "third", "fourth", "fifth"];

/** A stand-in for Math.random that walks through fixed values. */
function sequence(...values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe("formatDuration", () => {
  it("writes minutes and seconds, and hours when there are any", () => {
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(187)).toBe("3:07");
    expect(formatDuration(187.9)).toBe("3:07");
    expect(formatDuration(3723)).toBe("1:02:03");
  });

  it("says nothing for a length it doesn't know", () => {
    expect(formatDuration(0)).toBe("");
    expect(formatDuration(NaN)).toBe("");
    expect(formatDuration(Infinity)).toBe("");
  });
});

describe("playing a single song", () => {
  it("queues every song in posting order, starting at the one chosen", () => {
    expect(orderQueue(IDS, "third")).toEqual({ queue: IDS, index: 2 });
    expect(orderQueue(IDS)).toEqual({ queue: IDS, index: 0 });
  });

  it("goes on to the song posted next, and stops after the last", () => {
    const { queue, index } = orderQueue(IDS, "fourth");
    expect(queue[nextIndex(queue, index)!]).toBe("fifth");
    expect(nextIndex(queue, 4)).toBeNull();
  });

  it("starts at the beginning if the song has gone", () => {
    expect(orderQueue(IDS, "missing").index).toBe(0);
    expect(orderQueue([], "missing").index).toBe(-1);
  });
});

describe("shuffle", () => {
  it("plays every song exactly once", () => {
    for (let n = 0; n < 20; n++) {
      const queue = shuffleQueue(IDS);
      expect([...queue].sort()).toEqual([...IDS].sort());
    }
  });

  it("is a proper Fisher–Yates shuffle", () => {
    // random() = 0 always swaps with the first: [a,b,c,d,e] -> [b,c,d,e,a]
    expect(shuffleQueue(IDS, undefined, () => 0)).toEqual(["second", "third", "fourth", "fifth", "first"]);
    // Just under 1 never moves anything.
    expect(shuffleQueue(IDS, undefined, () => 0.9999)).toEqual(IDS);
    expect(shuffleQueue(IDS, undefined, sequence(0.5, 0.1, 0.9, 0.3))).toHaveLength(5);
  });

  it("keeps the playing song first when shuffle is turned on mid-song", () => {
    const queue = shuffleQueue(IDS, "third", () => 0);
    expect(queue[0]).toBe("third");
    expect([...queue].sort()).toEqual([...IDS].sort());
  });

  it("ignores a lead song that isn't in the list", () => {
    expect(shuffleQueue(IDS, "missing", () => 0.9999)).toEqual(IDS);
  });
});

describe("previous", () => {
  it("restarts a song that is more than a few seconds in", () => {
    expect(previousIndex(3, 42)).toEqual({ index: 3, restart: true });
  });

  it("goes back a song near its start", () => {
    expect(previousIndex(3, 1)).toEqual({ index: 2, restart: false });
  });

  it("restarts the first song rather than going nowhere", () => {
    expect(previousIndex(0, 1)).toEqual({ index: 0, restart: true });
  });
});

describe("songNumber", () => {
  it("counts from the first song posted", () => {
    expect(songNumber(IDS, "first")).toBe(1);
    expect(songNumber(IDS, "fifth")).toBe(5);
  });
});

describe("the Songs section", () => {
  it("is in the top bar", () => {
    expect(SECTIONS.find((s) => s.path === "/songs")?.live).toBe(true);
  });

  it("takes MP3s for a song's audio and nothing else, from the server's point of view", () => {
    const schema = readFileSync("pb_migrations/1791417600_songs.js", "utf8");
    expect(schema).toContain("mimeTypes: ['audio/mpeg']");
    expect(readFileSync("pb_hooks/phantos/lib.js", "utf8")).toContain("'songs.audio': { extensions: ['.mp3'], kind: 'an MP3' }");
  });
});
