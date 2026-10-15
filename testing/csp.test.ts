import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, inlineScripts, withContentSecurityPolicy } from "../csp";

/** The shape of the index.html React Router writes in SPA mode. */
const PAGE = [
  '<!DOCTYPE html><html lang="en"><head><meta charSet="utf-8"/><meta name="viewport" content="width=device-width"/>',
  '<link rel="modulepreload" href="/assets/entry.client-abc.js"/></head><body><div class="flex-1"></div>',
  "<script>window.__reactRouterContext = {\"basename\":\"/\"};</script>",
  '<script type="module" async="">import "/assets/entry.client-abc.js";</script>',
  '<script src="/assets/other.js"></script><script></script></body></html>',
].join("");

const sha256 = (text: string) => `'sha256-${createHash("sha256").update(text).digest("base64")}'`;

/** The sources of one directive. */
function directive(policy: string, name: string): string[] {
  const found = policy.split("; ").find((d) => d.split(" ")[0] === name);
  return found ? found.split(" ").slice(1) : [];
}

describe("inlineScripts", () => {
  it("finds the scripts written into the page, not the ones it loads", () => {
    expect(inlineScripts(PAGE)).toEqual([
      'window.__reactRouterContext = {"basename":"/"};',
      'import "/assets/entry.client-abc.js";',
    ]);
  });
});

describe("contentSecurityPolicy", () => {
  it("allows our own scripts and the page's inline ones by hash, and nothing inline besides", () => {
    const policy = contentSecurityPolicy(inlineScripts(PAGE));
    expect(directive(policy, "script-src")).toEqual([
      "'self'",
      sha256('window.__reactRouterContext = {"basename":"/"};'),
      sha256('import "/assets/entry.client-abc.js";'),
    ]);
    expect(policy).not.toContain("unsafe-eval");
    expect(directive(policy, "style-src")).not.toContain("'unsafe-inline'");
  });

  it("closes what lore could otherwise reach for", () => {
    const policy = contentSecurityPolicy([]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
    expect(directive(policy, "base-uri")).toEqual(["'self'"]);
    expect(directive(policy, "form-action")).toEqual(["'self'"]);
  });

  it("lets the site talk to a PocketBase on another origin", () => {
    expect(directive(contentSecurityPolicy([], "/"), "connect-src")).toEqual(["'self'"]);
    const elsewhere = contentSecurityPolicy([], "http://localhost:8090/");
    expect(directive(elsewhere, "connect-src")).toEqual(["'self'", "http://localhost:8090"]);
    expect(directive(elsewhere, "img-src")).toContain("http://localhost:8090");
    expect(directive(elsewhere, "media-src")).toEqual(["'self'", "http://localhost:8090", "blob:"]);
  });

  it("plays songs from our own origin and previews new ones as blobs, and nothing else", () => {
    expect(directive(contentSecurityPolicy([]), "media-src")).toEqual(["'self'", "blob:"]);
  });

  it("lists a script that appears twice once", () => {
    expect(directive(contentSecurityPolicy(["a()", "a()"]), "script-src")).toEqual(["'self'", sha256("a()")]);
  });
});

describe("withContentSecurityPolicy", () => {
  it("puts the policy right after the charset, before anything the page loads", () => {
    const html = withContentSecurityPolicy(PAGE);
    const meta = html.indexOf('<meta http-equiv="Content-Security-Policy"');
    expect(meta).toBe(html.indexOf('<meta charSet="utf-8"/>') + '<meta charSet="utf-8"/>'.length);
    expect(meta).toBeLessThan(html.indexOf("<link"));
    expect(meta).toBeLessThan(html.indexOf("<script"));
    expect(html.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*"\/>/, "")).toBe(PAGE);
  });

  it("refuses a page with nowhere to put it", () => {
    expect(() => withContentSecurityPolicy("<html><head></head></html>")).toThrow(/charset/);
  });
});
