import { useEffect, useState } from "react";

/**
 * Renders a lore document. The markdown pipeline (and DOMPurify, which needs a
 * DOM) is loaded only in the browser, so it never runs during the SPA prerender.
 */
export default function LoreMarkdown({ content, title }: { content: string; title?: string }) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("~/lib/markdown").then(({ renderLore }) => {
      if (!cancelled) setHtml(renderLore(content, title));
    });
    return () => {
      cancelled = true;
    };
  }, [content, title]);

  if (html === null) {
    return (
      <div className="space-y-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="skeleton h-4 rounded" style={{ width: `${88 - (i % 3) * 14}%` }} />
        ))}
      </div>
    );
  }

  return <div className="prose-lore" dangerouslySetInnerHTML={{ __html: html }} />;
}
