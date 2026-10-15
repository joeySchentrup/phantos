import { createHash } from "node:crypto";

/**
 * The site's Content-Security-Policy. The build writes it into index.html as a
 * <meta> tag (react-router.config.ts), and PocketBase serves that page for
 * every route, so it covers the whole SPA. The API, the uploaded files and the
 * admin UI at /_/ send their own headers.
 *
 * Scripts come from our own origin or are the inline ones React Router writes
 * into index.html, allowed by their hashes. An upload can't pass for a script
 * from our origin: a hook refuses any file not named as an image.
 */

/** The inline scripts in a page, exactly as written: every <script> without a src. */
export function inlineScripts(html: string): string[] {
  const scripts: string[] = [];
  for (const [, attributes, body] of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
    if (body && !/\bsrc\s*=/i.test(attributes)) scripts.push(body);
  }
  return scripts;
}

/** The CSP source that allows one inline script. */
export function scriptHash(script: string): string {
  return `'sha256-${createHash("sha256").update(script, "utf8").digest("base64")}'`;
}

/** The origin of VITE_POCKETBASE_URL when it is another one; empty when it is relative ("/", this origin). */
function apiOrigin(api: string | undefined): string {
  try {
    return api ? new URL(api).origin : "";
  } catch {
    return "";
  }
}

/** The policy for a page with these inline scripts, talking to PocketBase at `api`. */
export function contentSecurityPolicy(scripts: string[], api?: string): string {
  const pocketbase = apiOrigin(api);
  const directives: string[][] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", ...new Set(scripts.map(scriptHash))],
    // No <style> elements, so lore can't restyle the page; the style attributes
    // lore's tables keep (app/lib/markdown.ts) still apply.
    ["style-src", "'self'", "https://fonts.googleapis.com"],
    ["style-src-attr", "'unsafe-inline'"],
    ["font-src", "'self'", "https://fonts.gstatic.com"],
    // Lore may show a picture from anywhere; the previews of a new upload are blobs.
    ["img-src", "'self'", pocketbase, "data:", "blob:", "https:"],
    // Songs stream from PocketBase; a new upload is previewed (and measured) as a blob.
    ["media-src", "'self'", pocketbase, "blob:"],
    ["connect-src", "'self'", pocketbase],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
  ];
  return directives.map((sources) => sources.filter(Boolean).join(" ")).join("; ");
}

/** index.html with its policy, which has to come before anything the page loads: right after the charset. */
export function withContentSecurityPolicy(html: string, api?: string): string {
  const charset = /<meta charSet="utf-8"\s*\/?>/i;
  if (!charset.test(html)) throw new Error("index.html has no <meta charset> to put the Content-Security-Policy after.");
  const meta = `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(inlineScripts(html), api)}"/>`;
  return html.replace(charset, (tag) => tag + meta);
}
