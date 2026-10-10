// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CATEGORIES, CATEGORY_ORDER } from "~/lib/lore";

/**
 * The hooks module is CommonJS for PocketBase's VM and this package is ESM, so
 * it is evaluated here and not imported. It only reaches for PocketBase's
 * globals ($app, $os) inside its functions.
 */
function loadHooks(): Record<string, (...args: any[]) => any> {
  const module = { exports: {} };
  new Function("module", readFileSync("pb_hooks/phantos/lib.js", "utf8"))(module);
  return module.exports;
}

const { feedXml, requestOrigin, siteUrl } = loadHooks();

const SITE = "https://phantos.example";
const SELF = `${SITE}/api/phantos/feed.xml`;

const entry = {
  id: "abc123def456ghi",
  slug: "the-ember-choir",
  title: "The Ember Choir",
  category: "tale",
  author: "Kedgelony de Korland",
  summary: "In the halls beneath Korland.",
  created: "2026-10-01 00:44:08.123Z",
};

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  expect(doc.querySelector("parsererror")).toBeNull();
  return doc;
}

/** The text of an item's child, by its tag name as written (`dc:creator`). */
function field(item: Element, tag: string): string | undefined {
  return [...item.children].find((child) => child.tagName === tag)?.textContent ?? undefined;
}

afterEach(() => vi.unstubAllGlobals());

describe("feedXml", () => {
  it("describes the archive and points at itself", () => {
    const doc = parse(feedXml(SITE, SELF, [entry]));
    const channel = doc.querySelector("rss[version='2.0'] > channel")!;

    expect(field(channel, "title")).toBe("Phantos — Lore Archive");
    expect(field(channel, "link")).toBe(`${SITE}/lore`);
    expect(field(channel, "lastBuildDate")).toBe("Thu, 01 Oct 2026 00:44:08 GMT");
    const self = [...channel.children].find((child) => child.tagName === "atom:link")!;
    expect(self.getAttribute("href")).toBe(SELF);
    expect(self.getAttribute("rel")).toBe("self");
  });

  it("writes an entry as its card text, linked to its page", () => {
    const item = parse(feedXml(SITE, SELF, [entry])).querySelector("item")!;

    expect(field(item, "title")).toBe("The Ember Choir");
    expect(field(item, "link")).toBe(`${SITE}/lore/the-ember-choir`);
    expect(field(item, "pubDate")).toBe("Thu, 01 Oct 2026 00:44:08 GMT");
    expect(field(item, "category")).toBe("Tale");
    expect(field(item, "dc:creator")).toBe("Kedgelony de Korland");
    expect(field(item, "description")).toBe("In the halls beneath Korland.");
  });

  it("identifies an entry by its id, so a new slug isn't a new entry", () => {
    const guid = (slug: string) => parse(feedXml(SITE, SELF, [{ ...entry, slug }])).querySelector("guid")!;

    expect(guid("the-ember-choir").textContent).toBe("phantos-lore-abc123def456ghi");
    expect(guid("renamed").textContent).toBe("phantos-lore-abc123def456ghi");
    expect(guid("renamed").getAttribute("isPermaLink")).toBe("false");
  });

  it("keeps the order it is given", () => {
    const items = [entry, { ...entry, id: "older", title: "An Older Tale" }];
    const titles = [...parse(feedXml(SITE, SELF, items)).querySelectorAll("item > title")].map((t) => t.textContent);
    expect(titles).toEqual(["The Ember Choir", "An Older Tale"]);
  });

  it("escapes markup and drops characters XML can't carry", () => {
    const title = `Fish & Chips <b>"at"</b> « La pierre » 🐉`;
    const xml = feedXml(SITE, SELF, [{ ...entry, title: `${title}\u0000\u0008`, summary: "a < b && b > c", author: "R&D" }]);
    const item = parse(xml).querySelector("item")!;

    expect(field(item, "title")).toBe(title);
    expect(field(item, "description")).toBe("a < b && b > c");
    expect(field(item, "dc:creator")).toBe("R&D");
    expect(xml).not.toContain("<b>");
  });

  it("leaves out what an entry doesn't have", () => {
    const item = parse(feedXml(SITE, SELF, [{ ...entry, author: "", summary: "", category: "ballad", created: "" }]))
      .querySelector("item")!;

    expect([...item.children].map((child) => child.tagName)).toEqual(["title", "link", "guid"]);
  });

  it("is still a feed when the archive is empty", () => {
    const doc = parse(feedXml(SITE, SELF, []));
    expect(doc.querySelectorAll("item")).toHaveLength(0);
    expect(doc.querySelector("lastBuildDate")).toBeNull();
  });

  it("names each category as the site does", () => {
    for (const category of CATEGORY_ORDER) {
      const item = parse(feedXml(SITE, SELF, [{ ...entry, category }])).querySelector("item")!;
      expect(field(item, "category")).toBe(CATEGORIES[category].label);
    }
  });
});

describe("where the feed says the site is", () => {
  const request = (host: string, forwardedProto: string, tls = false) => ({
    request: { host, header: { get: (name: string) => (name === "X-Forwarded-Proto" ? forwardedProto : "") } },
    isTLS: () => tls,
  });

  it("takes the scheme a proxy forwards, else the connection's own", () => {
    expect(requestOrigin(request("phantos.example", "https"))).toBe("https://phantos.example");
    expect(requestOrigin(request("phantos.example", "HTTPS, http"))).toBe("https://phantos.example");
    expect(requestOrigin(request("localhost:8090", ""))).toBe("http://localhost:8090");
    expect(requestOrigin(request("phantos.example", "", true))).toBe("https://phantos.example");
    expect(requestOrigin(request("phantos.example", "javascript"))).toBe("http://phantos.example");
  });

  it("prefers SITE_URL when it is set", () => {
    vi.stubGlobal("$os", { getenv: () => " http://localhost:5173/ " });
    expect(siteUrl("http://localhost:8090")).toBe("http://localhost:5173");

    vi.stubGlobal("$os", { getenv: () => "" });
    expect(siteUrl("http://localhost:8090")).toBe("http://localhost:8090");
  });
});
