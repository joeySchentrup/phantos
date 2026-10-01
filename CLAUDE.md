# Phantos — Claude Code Guide

## Project Overview

**Phantos** is the lore archive for a D&D campaign set on the world of Phanatos. Visitors browse and search the lore. Dungeon Masters sign in to add and edit it, upload card art, and choose the featured image. The site is styled like a duel-monster card game: each entry is a card.

## Tech Stack

Mirrors Schentrup-Software/shear-madness:

- **Frontend**: React 19, React Router 7 (SPA mode), TypeScript 5
- **Styling**: Tailwind CSS 3.4, plus hand-written card components in `app/app.css`
- **Build**: Vite 6
- **Backend**: PocketBase 0.40, with JS hooks in `pb_hooks/` and migrations in `pb_migrations/`
- **Deployment**: one Docker image; PocketBase serves the built SPA from `pb_public` on :8080

## Commands

```bash
bash .devcontainer/start-pocketbase.sh  # local PocketBase on :8090 (schema + lore seed)
npm run dev        # Dev server at http://localhost:5173
npm test           # vitest unit tests (testing/)
npm run typecheck  # React Router typegen + tsc
npm run build      # Production SPA to build/client
```

## Project Structure

```
app/
├── routes/            # home, lore (archive + search), loreEntry, comingSoon, dm, dmEditor
├── backend/
│   ├── api.ts         # ALL PocketBase calls — touch this for data changes
│   └── pocketbaseClient.ts
├── components/        # LoreCard, FeaturedVision, SiteHeader, CardBack, LoreMarkdown, …
├── lib/
│   ├── lore.ts        # categories/attributes, levels, title + snippet helpers
│   ├── markdown.ts    # markdown-it + footnotes + pandoc-style anchors + DOMPurify
│   └── sections.ts    # top-level nav; the coming-soon sections live here
└── types/lore.ts
pb_migrations/         # schema, lore seed (reads LORE_DIR), first DM from env
pb_hooks/              # search route, slug/word-count/summary hooks, first-DM bootstrap
lore/                  # the original documents (seed source, copied into the image)
```

## Data Model (PocketBase Collections)

- `lore`: title, slug, category, attribute, author, summary, content (markdown), cover, word_count, published
  - Public can read published entries.
  - Only `dungeon_masters` can write, and they also see drafts.
- `featured_images`: image, caption. DMs upload them; the newest one is the home page hero.
- `dungeon_masters`: auth collection for DMs. There is no public sign-up.

## Server-side Hooks (`pb_hooks/`)

- On every lore save:
  - normalize line endings to `\n`;
  - make a unique slug;
  - recompute `word_count`;
  - fill a blank `summary` from the opening lines.
- `GET /api/phantos/search?q=&category=`: ranked search with snippets; drafts only for DMs.

PocketBase runs each handler in an isolated runtime: handlers must `require(`${__hooks}/phantos/lib.js`)` rather than close over outer variables. On a brand-new database `onBootstrap` runs before migrations, which is why the first DM is created by a migration.

## Conventions

- All data access goes through `app/backend/api.ts`; components never call PocketBase directly.
- Card internals are sized in `cqw` (container units). The card's outer element is the container, so never put `cqw` sizes on that element itself.
- Category → frame colour and attribute → orb are defined once in `app/lib/lore.ts` and `app/app.css` (`[data-frame]`, `[data-attribute]`).
- Text helpers in `app/lib/lore.ts` (`plainText`, `autoSummary`) mirror those in `pb_hooks/phantos/lib.js`. Keep them in step.
- Path alias `~/*` → `./app/*`. Route components are default exports.

## Verifying Work

Run `npm test`, `npm run typecheck` and `npm run build`. For UI changes, run the app against a local PocketBase and check the home page, `/lore?q=…`, an entry, and the DM editor at desktop and phone widths.
