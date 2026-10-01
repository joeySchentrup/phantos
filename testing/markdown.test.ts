// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderLore } from "~/lib/markdown";

describe("renderLore", () => {
  it("renders footnotes from the exported timelines", () => {
    const html = renderLore(readFileSync("lore/History of Hurley (Catholic Lore).md", "utf8"));
    expect(html).toContain('class="footnote-ref"');
    expect(html).toContain('class="footnotes"');
  });

  it("renders GFM tables", () => {
    const html = renderLore(readFileSync("lore/Greater Dragons.md", "utf8"), "Greater Dragons");
    expect(html).toContain("<table>");
    expect(html).toContain("Cryomelle");
    // The title heading is shown by the page, not repeated in the body.
    expect(html).not.toContain("<h1");
  });

  it("gives headings the ids the table of contents links to", () => {
    const html = renderLore(readFileSync("lore/Chione_ Volume 1_ The Child of Destiney.md", "utf8"));
    expect(html).toContain('href="#book-one-the-child-of-prophecy"');
    expect(html).toContain('id="book-one-the-child-of-prophecy"');
  });

  it("strips scripts and event handlers", () => {
    const html = renderLore('Hello <img src=x onerror="alert(1)"><script>alert(2)</script> <u>world</u>');
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script");
    expect(html).toContain("<u>world</u>");
  });

  it("opens external links in a new tab", () => {
    const html = renderLore("[Dragons](https://example.com) and [a section](#top)");
    expect(html).toContain('href="https://example.com" target="_blank" rel="noopener noreferrer"');
    expect(html).toMatch(/<a href="#top">a section<\/a>/);
  });
});
