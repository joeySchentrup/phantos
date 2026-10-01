# Phantos — Claude Code Guide

## Project Overview

**Phantos** is the lore archive for a D&D campaign set on the world of Phanatos. Visitors browse and search the lore, follow it through time on the Chronicle, a zoomable timeline, and meet the powers of the world in the Pantheon. Dungeon Masters sign in to add and edit lore and pantheon members, upload card art, choose the featured image, and add eras and points to the timeline. The site is styled like a duel-monster card game: each entry is a card.

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
├── routes/            # home, lore (archive + search), loreEntry, pantheon, pantheonEntry, chronicle,
│                      #   comingSoon, dm, dmEditor, dmPantheonEditor
├── backend/
│   ├── api.ts         # ALL PocketBase calls — touch this for data changes
│   └── pocketbaseClient.ts
├── components/        # CardShell, LoreCard, PantheonCard, PantheonPicker, PantheonPlates, Timeline,
│                      #   ChronicleDesk, YearField, FeaturedVision, SiteHeader, …
├── lib/
│   ├── lore.ts        # categories/attributes, levels, title + snippet helpers
│   ├── pantheon.ts    # ranks, their order and levels, type line + epithet helpers
│   ├── chronicle.ts   # years ↔ axis, graduations, lane and era packing for the timeline
│   ├── markdown.ts    # markdown-it + footnotes + pandoc-style anchors + DOMPurify
│   └── sections.ts    # top-level nav; the coming-soon sections live here
└── types/             # lore.ts, pantheon.ts, chronicle.ts
pb_migrations/         # schema, lore seed (reads LORE_DIR), first DM from env, chronicle and pantheon schema + seeds
pb_hooks/              # search route, slug/word-count/summary hooks, chronicle checks, first-DM bootstrap
lore/                  # the original documents (seed source, copied into the image)
```

## Data Model (PocketBase Collections)

- `lore`: title, slug, category, attribute, author, summary, content (markdown), cover, word_count, published, year, circa, pantheon
  - Public can read published entries.
  - Only `dungeon_masters` can write, and they also see drafts.
  - `year` is the in-universe date that places the entry on the Chronicle; 0 keeps it off.
  - `pantheon` is a relation to the members the entry refers to. The link is stored only here: a member's page finds its lore by this field.
- `pantheon`: name, slug, rank, attributes (one element, or two for a child of two), domain, summary, content (markdown), image, published
  - Same rules as lore: public reads published members, DMs write and see drafts.
  - Deleting a member removes it from every lore entry that linked to it.
- `eras`: name, start_year, end_year, circa, description. Bands across the timeline. A start of 0 is "since the beginning"; an end of 0 is "still going".
- `timeline_points`: text (255 characters at most), year, circa. Short notes pinned to a year; anything longer is lore.
  - Anyone can read eras and points. Only DMs can write them.
- `featured_images`: image, caption. DMs upload them; the newest one is the home page hero.
- `dungeon_masters`: auth collection for DMs. There is no public sign-up.

## Server-side Hooks (`pb_hooks/`)

- On every lore save:
  - normalize line endings to `\n`;
  - make a unique slug;
  - recompute `word_count`;
  - fill a blank `summary` from the opening lines.
- On every pantheon save: normalize line endings, make a unique slug, and fill a blank `summary`.
- On every era save: trim the text, and refuse an era that ends before it begins.
- On every point save: collapse the text to a single line.
- `GET /api/phantos/search?q=&category=`: ranked search with snippets; drafts only for DMs.

PocketBase runs each handler in an isolated runtime: handlers must `require(`${__hooks}/phantos/lib.js`)` rather than close over outer variables. On a brand-new database `onBootstrap` runs before migrations, which is why the first DM is created by a migration.

## Conventions

- All data access goes through `app/backend/api.ts`; components never call PocketBase directly.
- Card internals are sized in `cqw` (container units). The card's outer element is the container, so never put `cqw` sizes on that element itself.
- Category → frame colour and attribute → orb are defined once in `app/lib/lore.ts` and `app/app.css` (`[data-frame]`, `[data-attribute]`). Pantheon ranks are frames too, defined in `app/lib/pantheon.ts` and the same `[data-frame]` block.
- `LoreCard` and `PantheonCard` both print onto `CardShell`, which owns the frame, the tilt and the foil. Change card behaviour there, not in one of the two.
- Years are whole numbers: negative for BC, positive for AC (the Age of Concord). There is no year zero, so 0 always means "not set". Format and convert them with `app/lib/chronicle.ts`, never by hand.
- The timeline's row heights are constants in `app/components/Timeline.tsx` that the `.tl-*` rules in `app/app.css` match. Change them together.
- Tailwind drops `app.css` component classes it can't find written out in the source, so never build a class name from pieces (`tl-cluster--${kind}`).
- Text helpers in `app/lib/lore.ts` (`plainText`, `autoSummary`) mirror those in `pb_hooks/phantos/lib.js`. Keep them in step.
- Path alias `~/*` → `./app/*`. Route components are default exports.

## Verifying Work

Run `npm test`, `npm run typecheck` and `npm run build`. For UI changes, run the app against a local PocketBase and check the home page, `/lore?q=…`, an entry, `/chronicle` (zoom, pan, a cluster, a hover card), `/pantheon` and a member's page, and the DM editors at desktop and phone widths.
