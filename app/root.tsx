import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";

import type { Route } from "./+types/root";
import "./app.css";
import SiteHeader from "./components/SiteHeader";
import { ATTRIBUTE_GLYPHS } from "./lib/lore";
import { SECTIONS } from "./lib/sections";

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=Cinzel:wght@500;600;700;800&family=Spectral+SC:wght@500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400..800;1,8..60,400..700&display=swap",
  },
  // Only the seven attribute glyphs, so the Japanese font stays a few KB.
  {
    rel: "stylesheet",
    href: `https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@900&text=${encodeURIComponent(ATTRIBUTE_GLYPHS)}&display=swap`,
  },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];

/**
 * Rendered on every page, including the error boundary. Uses plain anchors
 * rather than <Link> so it can't depend on router context being available.
 */
function Footer() {
  return (
    <footer className="mt-20 border-t border-[#f2c14e]/15 bg-black/30">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-[#c9b78f] sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="font-heading tracking-[0.14em] uppercase text-[0.72rem]">
          Phantos · A campaign archive of the world of Phanatos
        </p>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          {SECTIONS.map((s) => (
            <a key={s.path} href={s.path} className="hover:text-[#f4e6c3] transition-colors">
              {s.label}
            </a>
          ))}
          <a href="/dm" className="hover:text-[#f4e6c3] transition-colors">
            Dungeon Master
          </a>
        </nav>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0e0805" />
        <Meta />
        <Links />
      </head>
      {/* Flex column so the footer sits below the content on short pages
          rather than floating mid-screen. */}
      <body className="min-h-screen flex flex-col">
        <div className="flex-1">{children}</div>
        <Footer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return (
    <>
      <SiteHeader />
      <Outlet />
    </>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "A card was lost";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "No such card" : "Error";
    details =
      error.status === 404
        ? "That page isn't in the archive."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pt-24 text-center">
      <p className="eyebrow">Phantos</p>
      <h1 className="font-heading mt-3 text-4xl font-bold gold-text">{message}</h1>
      <p className="mt-4 text-lg text-[#c9b78f]">{details}</p>
      <a href="/" className="btn btn-gold mt-8">
        Return to the archive
      </a>
      {stack && (
        <pre className="mt-8 w-full overflow-x-auto p-4 text-left text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}
