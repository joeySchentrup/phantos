import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  autoSummary,
  estimateWords,
  headingSlug,
  highlightParts,
  levelFor,
  readingMinutes,
  searchTerms,
  stripLeadingTitle,
  titleFromFilename,
  titleScale,
  typeLine,
} from "~/lib/lore";

describe("levelFor", () => {
  it("gives maps and empty documents no level", () => {
    expect(levelFor(0)).toBe(0);
  });

  it("climbs with length and tops out at 12", () => {
    expect(levelFor(80)).toBe(1);
    expect(levelFor(150)).toBe(2);
    expect(levelFor(1000)).toBe(5);
    expect(levelFor(19999)).toBe(11);
    expect(levelFor(47000)).toBe(12);
  });
});

describe("readingMinutes", () => {
  it("never reports zero minutes for a real document", () => {
    expect(readingMinutes(40)).toBe(1);
    expect(readingMinutes(2300)).toBe(10);
    expect(readingMinutes(0)).toBe(0);
  });
});

describe("stripLeadingTitle", () => {
  it("drops a heading that repeats the title, ignoring formatting and punctuation", () => {
    const content = "# **Ashes of Dawn:**\n\n### **A Recollection of Vlarunga**\n\nI have always liked mortals.";
    expect(stripLeadingTitle(content, "Ashes of Dawn")).toBe(
      "### **A Recollection of Vlarunga**\n\nI have always liked mortals."
    );
  });

  it("drops a title split across a heading and subheading", () => {
    const content = "# **Dark-Ruler Ha-Des**\n\n## **The Last Emperor of Drynell**\n\nThere are names…";
    expect(stripLeadingTitle(content, "Dark-Ruler Ha-Des: The Last Emperor of Drynell")).toBe("There are names…");
  });

  it("matches curly apostrophes and accents", () => {
    const content = "# **Comment prendre soin d’une Pierre d’Amour**\n\nFélicitations !";
    expect(stripLeadingTitle(content, "Comment prendre soin d’une Pierre d’Amour")).toBe("Félicitations !");
  });

  it("leaves documents alone when the first heading is something else", () => {
    const content = "## Prologue: The Order from Korland\n\nThe stone citadel…";
    expect(stripLeadingTitle(content, "Alice")).toBe(content);
    expect(stripLeadingTitle("No heading here.", "Alice")).toBe("No heading here.");
  });
});

describe("headingSlug", () => {
  it("matches the anchors in the exported tables of contents", () => {
    expect(headingSlug("Book One: The Child of Prophecy")).toBe("book-one-the-child-of-prophecy");
    expect(headingSlug("Epilogue: For the Good of the Republic")).toBe("epilogue-for-the-good-of-the-republic");
    expect(headingSlug("The Twilight Weave: A Twili Creation Myth")).toBe("the-twilight-weave-a-twili-creation-myth");
  });

  it("keeps the anchors the Chione table of contents links to", () => {
    const chione = readFileSync("lore/Chione_ Volume 1_ The Child of Destiney.md", "utf8");
    const anchors = [...chione.matchAll(/\]\(#([^)]+)\)/g)].map((m) => m[1]);
    const headings = [...chione.matchAll(/^#{1,6}\s+(.+)$/gm)].map((m) => headingSlug(m[1].replace(/[*_]/g, "")));
    expect(anchors.length).toBeGreaterThan(0);
    for (const anchor of anchors) expect(headings).toContain(anchor);
  });
});

describe("search helpers", () => {
  it("splits a query into terms, trimming stray punctuation", () => {
    expect(searchTerms('  "snawk venom," Korland? ')).toEqual(["snawk", "venom", "Korland"]);
    expect(searchTerms("")).toEqual([]);
  });

  it("highlights every term, case-insensitively", () => {
    expect(highlightParts("Snawk venom of the snawks", ["snawk"])).toEqual([
      { text: "Snawk", match: true },
      { text: " venom of the ", match: false },
      { text: "snawk", match: true },
      { text: "s", match: false },
    ]);
  });

  it("treats regex characters in a query literally", () => {
    expect(highlightParts("What (really) happened?", ["(really)"])).toEqual([
      { text: "What ", match: false },
      { text: "(really)", match: true },
      { text: " happened?", match: false },
    ]);
  });
});

describe("card text", () => {
  it("builds the type line from the voice, falling back to the attribute", () => {
    expect(typeLine("dragon", "fire", "Vlaurunga")).toBe("[Recollection / Vlaurunga]");
    expect(typeLine("tale", "earth", "")).toBe("[Tale / Earth]");
  });

  it("shrinks long names but not short ones", () => {
    expect(titleScale("Alice")).toBe(1);
    expect(titleScale("What Happened in Doran")).toBeCloseTo(13 / 22);
    expect(titleScale("Empire Secures the Sky: Kobold Alliance with the Harpies of Neua")).toBe(0.45);
  });

  it("turns exported filenames back into titles", () => {
    expect(titleFromFilename("Chione_ Volume 1_ The Child of Destiney.md")).toBe("Chione: Volume 1: The Child of Destiney");
    expect(titleFromFilename("Vlarunga_s Kids.md")).toBe("Vlarunga's Kids");
  });

  it("fills blank card text from the opening lines, like the server does", () => {
    const content = "# The Ember Choir\r\n\r\nIn the halls beneath **Korland**.[^1]\r\n\r\n| A | B |\r\n|---|---|\r\n\r\n[^1]: Note.";
    expect(autoSummary(content)).toBe("In the halls beneath Korland. A B Note.");
    expect(autoSummary("word ".repeat(100)).endsWith("…")).toBe(true);
  });

  it("estimates words without counting markup", () => {
    expect(estimateWords("# Title\n\n| a | b |\n|---|---|\n\nOne **two** three.")).toBe(6);
  });
});
