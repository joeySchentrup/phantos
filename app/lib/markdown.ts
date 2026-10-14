import DOMPurify, { type Config } from "dompurify";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import footnote from "markdown-it-footnote";
import { headingSlug, stripLeadingTitle } from "./lore";

// The lore was exported from Google Docs: GFM tables, footnotes, pandoc-style
// heading anchors in the tables of contents, and the odd inline <u>.
const md = new MarkdownIt({ html: true, linkify: true, typographer: false })
  .use(footnote)
  .use(anchor, { slugify: headingSlug, tabIndex: false });

// Open external links in a new tab; in-page anchors stay put.
const defaultLinkOpen =
  md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet("href") ?? "";
  if (/^https?:\/\//i.test(href)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

/**
 * Lore is written by DMs and players and read by everyone, DMs signed in
 * included, so it may lay out its own text but never the page around it: no
 * stylesheets, nothing to type into or submit, no SVG or MathML.
 */
const SANITIZE: Config = {
  USE_PROFILES: { html: true },
  ADD_ATTR: ["target"],
  FORBID_TAGS: ["style", "form", "input", "button", "select", "option", "optgroup", "textarea", "datalist", "dialog"],
  // The site's CSS keys off data-frame and data-attribute.
  ALLOW_DATA_ATTR: false,
};

/**
 * What a style attribute may say: the column widths and alignment of the
 * exported tables, and markdown-it's own table alignment. Nothing that moves
 * a box (position, margins, transforms) or loads anything.
 */
const STYLE_RULES = new Map<string, RegExp>([
  ["width", /^\d{1,4}(\.\d+)?(px|%|em|rem)$/],
  ["text-align", /^(left|right|center|justify|start|end)$/],
  ["vertical-align", /^(top|middle|bottom|baseline)$/],
]);

/** The classes the markdown plugins write. Lore can't borrow the site's own (`fixed inset-0 z-50`). */
const LORE_CLASS = /^(footnotes|footnotes-sep|footnotes-list|footnote-item|footnote-ref|footnote-backref|language-[\w-]+)$/;

function allowedStyle(style: string): string {
  return style
    .split(";")
    .map((declaration) => {
      const colon = declaration.indexOf(":");
      const property = declaration.slice(0, colon).trim().toLowerCase();
      const value = declaration.slice(colon + 1).trim().toLowerCase();
      return colon !== -1 && STYLE_RULES.get(property)?.test(value) ? `${property}: ${value}` : "";
    })
    .filter(Boolean)
    .join("; ");
}

// Its own instance, so the hook below applies to lore and nothing else.
const purify = DOMPurify(window);
purify.addHook("uponSanitizeAttribute", (_node, data) => {
  if (data.attrName === "style") {
    data.attrValue = allowedStyle(data.attrValue);
  } else if (data.attrName === "class") {
    data.attrValue = data.attrValue
      .split(/\s+/)
      .filter((name) => LORE_CLASS.test(name))
      .join(" ");
  } else {
    return;
  }
  if (!data.attrValue) data.keepAttr = false;
});

/** Renders a lore document to sanitized HTML. Browser-only (DOMPurify needs a DOM). */
export function renderLore(content: string, title?: string): string {
  const source = title ? stripLeadingTitle(content, title) : content;
  return purify.sanitize(md.render(source), SANITIZE);
}
