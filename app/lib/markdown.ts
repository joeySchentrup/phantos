import DOMPurify from "dompurify";
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

/** Renders a lore document to sanitized HTML. Browser-only (DOMPurify needs a DOM). */
export function renderLore(content: string, title?: string): string {
  const source = title ? stripLeadingTitle(content, title) : content;
  return DOMPurify.sanitize(md.render(source), { ADD_ATTR: ["target"] });
}
