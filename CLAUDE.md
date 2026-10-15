# Phantos — Claude Code Guide

## Project Overview

**Phantos** is the lore archive for a D&D campaign set on the world of Phanatos. Visitors browse and search the lore, follow it through time on the Chronicle, a zoomable timeline, find it on the Atlas, a chart they pan and zoom, meet the powers of the world in the Pantheon, follow the party in Heroes, see what each hero holds in Electrum, and listen to the campaign's Songs with their lyrics. Players join at `/players` and claim their hero; once a Dungeon Master approves them, they can write that hero's backstory and post updates to their page, and nothing else. Dungeon Masters sign in to add and edit lore, pantheon members and heroes, approve players, post updates to a hero's page, add songs, award and spend electrum and stock its shop, upload card art, choose the featured image, add eras and points to the timeline, and keep the Atlas: add places, draw realms and terrain, and drag them into place. The site is styled like a duel-monster card game: each entry is a card.

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
├── routes/            # home, lore (archive + search), loreEntry, pantheon, pantheonEntry, chronicle, atlas,
│                      #   heroes, heroEntry, electrum (routed, but not a section in the top bar),
│                      #   songsLayout (the player around songs and songEntry), songs, songEntry,
│                      #   players (join and sign in; linked from the footer, like dm),
│                      #   dm, dmEditor, dmPantheonEditor, dmHeroEditor, dmSongEditor,
│                      #   comingSoon (not routed; the face-down page for a section still to be built)
├── backend/
│   ├── api.ts         # ALL PocketBase calls — touch this for data changes
│   └── pocketbaseClient.ts
├── components/        # CardShell, LoreCard, PantheonCard, HeroCard, HeroUpdates, BackstoryEditor, PlayersPanel,
│                      #   PantheonPicker, PantheonPlates, Timeline,
│                      #   ChronicleDesk, YearField, AtlasChart, AtlasKey, AtlasDesk, FeaturedVision, SiteHeader,
│                      #   ElectrumBanner, ElectrumCoin, ElectrumLedger, ElectrumShop, LevelUpCalculator,
│                      #   SongPlayer (the provider, the <audio> element and the player panel), …
├── lib/
│   ├── lore.ts        # categories/attributes, levels, title + snippet helpers
│   ├── pantheon.ts    # ranks, their order and levels, type line + epithet helpers
│   ├── heroes.ts      # type line, epithet, class label
│   ├── songs.ts       # the play queue's rules: posting order, shuffle, next/previous; durations
│   ├── electrum.ts    # stars from electrum, ledger totals, level up steps
│   ├── players.ts     # whether a player writes for a hero, how heroes are offered to choose from
│   ├── chronicle.ts   # years ↔ axis, graduations, lane and era packing for the timeline
│   ├── atlas.ts       # chart geometry: paths, hit-testing, name tiers, the pan/zoom maths, the DM's tools
│   ├── markdown.ts    # markdown-it + footnotes + pandoc-style anchors + DOMPurify, with lore's own rules
│   └── sections.ts    # top-level nav; a section that isn't `live` shows as coming soon
└── types/             # lore.ts, pantheon.ts, chronicle.ts, hero.ts, electrum.ts, atlas.ts, player.ts, song.ts
pb_migrations/         # schema, lore seed (reads LORE_DIR), first DM from env, chronicle, pantheon, heroes, atlas and electrum schema + seeds, players
pb_hooks/              # search and RSS feed routes, slug/word-count/summary hooks, chronicle, atlas and electrum upkeep, first-DM bootstrap
lore/                  # the original documents (seed source, copied into the image)
csp.ts                 # the Content-Security-Policy the build writes into index.html (react-router.config.ts)
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
- `heroes`: name, slug, player, species, class, subclass, background, alignment, faith, attribute, summary, backstory (markdown), portrait, published
  - Identity only — no stats (level included) or inventory. Same rules as lore: public reads published heroes, DMs write and see drafts.
  - An approved player can read their own hero, draft or not, and update it; a hook keeps that update to `backstory`.
- `hero_updates`: hero (relation, cascade delete), title (optional), body (markdown, 4,000 characters at most). The running list beneath a hero's backstory, newest first.
  - Readable when the hero is published (or by a DM, or the hero's approved player). DMs write; the hero's approved player can post one, but only DMs edit or delete them.
- `players`: auth collection for the people at the table. name, hero (relation), approved.
  - Anyone can sign up, claiming a published hero; a sign-up is never approved, whatever it sends. Only DMs approve, change a player's hero or remove one, and a hero has one approved player at most.
  - A player and the DMs read a player's record; DMs also see the email (`manageRule`). Deleting a hero empties its player's `hero`.
- `electrum_accounts`: name, amount, spent, hero (relation, at most one account a hero)
  - The ledger. `name` is the player; `amount` is what is held, `spent` what has been spent, both whole and never negative.
  - An account with no `hero` waits for one: the hero editor offers it to a new hero. Deleting a hero empties `hero` and keeps the account.
  - A hero's stars come from `amount` (`electrumStars()` in `app/lib/electrum.ts`): 12 at 10,000, scaling down linearly and never rounded up, except that any electrum at all is worth the first star.
- `electrum_shop`: name, price, description. Every price is a flat whole number of electrum, 1 at least.
- `electrum_levels`: level, cost. What reaching each level costs: the one price that isn't flat, so it is precalculated and seeded (40 + 10 × l × (l − 1)), never computed on the site.
  - Anyone can read all three electrum collections. Only DMs write.
- `card_art` (on `lore`, `pantheon` and `heroes`): a 720×720 square copy of the record's image (`cover` / `image` / `portrait`) that the cards load instead of the original. WebP when made in the browser; the backfill migration's copies keep the original's format until the DM desk re-makes them.
- `charts`: name, slug, dateline, description, width, height, land (json: closed coastlines), land_centre, compass, seas (json: `{ name, x, y, size }`), underlay, published
  - One sheet of the Atlas. Positions on it are chart units: whole numbers from 0 to `width` and `height`; a point is `[x, y]`.
  - A chart with no `land` is face down. `underlay` is unused so far (a hand-drawn chart to trace, later).
- `places`: chart (relation, cascade delete), name, kind (capital, city, port, fortress, ruin), x, y, realm, lore (relation), published
  - A pin that draws its lore entry's card. Deleting the entry leaves the place cardless.
  - `realm` is display text: the realm the place is said to stand in. The site sets it when a DM adds or drags a place.
- `realms`: chart (relation, cascade delete), name, standing, tone (0–5), label, points (json, three corners or more), lore (relation), published
  - `label` is where the name is written; empty means the middle of the corners.
- `features`: chart (relation, cascade delete), name, kind (mountains, forest, river, lake), points (json), spread, published
  - A forest or lake is one point (its heart) and a `spread` of 8–80; a range or river is a line of two points or more, with spread 0.
  - Places, realms and features are readable when they and their chart are published (or by a DM); only DMs write.
- `songs`: title, slug, credit, audio (an MP3, 50 MB at most), duration (whole seconds; 0 = not known), lyrics (plain text, line breaks kept), published
  - Same rules as lore: public reads published songs, DMs write and see drafts.
  - Posting order (`created`) is the play order and the songs' numbering. `duration` is measured by the DM's browser when the MP3 is chosen.
- `featured_images`: image, caption. DMs upload them; the newest one is the home page hero.
- `dungeon_masters`: auth collection for DMs. There is no public sign-up (that is `players`).

## Server-side Hooks (`pb_hooks/`)

- On every lore save:
  - normalize line endings to `\n`;
  - make a unique slug;
  - recompute `word_count`;
  - fill a blank `summary` from the opening lines.
- On every pantheon save: normalize line endings, make a unique slug, and fill a blank `summary`.
- On every hero save: normalize the backstory's line endings, trim the identity fields, make a unique slug, and fill a blank `summary`. A summary that was made from the backstory follows it; one written by hand stays.
- On a hero update by a player: refuse any change but the backstory (`keepPlayerToBackstory`).
- On a player sign-up (anyone but a DM or superuser): unapproved, and the hero must be published and have no approved player.
- On every player save: collapse the name to a single line, and refuse a second approved player for a hero.
- On every hero update save: normalize line endings and trim the heading and body.
- On every song save: collapse the title and credit to a single line, make a unique slug, round `duration`, and normalize the lyrics' line endings (keeping the line breaks, dropping trailing spaces).
- On every electrum account and shop item save: collapse the name (and an item's description) to a single line.
- On every era save: trim the text, and refuse an era that ends before it begins.
- On every point save: collapse the text to a single line.
- On every chart save: trim the text, make a unique slug, and default the size to 1400 × 700.
- On every place, realm and feature save: trim the names, round every coordinate to a whole chart unit and clamp it to the chart. A realm with fewer than three corners is refused, as is a range or river with fewer than two points or a forest or lake with more than one; `tone` is clamped to 0–5 and `spread` to 8–80.
- On every lore, pantheon and hero save, `syncCardArt` drops `card_art` when the image changed (or went) without a new copy coming with it.
- On every save in any collection, `checkUploadNames` refuses an upload whose name doesn't end in `.png`, `.jpg`, `.jpeg`, `.jfif`, `.webp` or `.gif`. PocketBase checks a file's content but serves it by the name the uploader chose, so an image named `x.js` would go out as a script from our own origin. A file field for anything but images needs its extensions added there.
- `GET /api/phantos/search?q=&category=`: ranked search with snippets; drafts only for DMs.
- `GET /api/phantos/feed.xml`: the 50 newest published lore entries as RSS 2.0, card text only; never drafts, whoever asks. Its links are absolute: `SITE_URL` when set (local dev sets it to the Vite server), else the address the request came in on, with the scheme a proxy forwards.

PocketBase runs each handler in an isolated runtime: handlers must `require(`${__hooks}/phantos/lib.js`)` rather than close over outer variables. On a brand-new database `onBootstrap` runs before migrations, which is why the first DM is created by a migration.

## Conventions

- All data access goes through `app/backend/api.ts`; components never call PocketBase directly.
- Card internals are sized in `cqw` (container units). The card's outer element is the container, so never put `cqw` sizes on that element itself.
- Category → frame colour and attribute → orb are defined once in `app/lib/lore.ts` and `app/app.css` (`[data-frame]`, `[data-attribute]`). Pantheon ranks are frames too, defined in `app/lib/pantheon.ts` and the same `[data-frame]` block.
- `LoreCard`, `PantheonCard` and `HeroCard` all print onto `CardShell`, which owns the frame, the tilt and the foil. Change card behaviour there, not in one of them.
- Cards get their picture from `cardArtUrl()` (card art, else the 480px thumbnail) and never a `srcset` of the original: at 2× density that picked the 1600px version and made the lists slow. Full pages use the 1600px thumbnail and link the original. Every editor that uploads an image must also send `card_art` from `tryMakeCardArt()` (`app/lib/cardArt.ts`); `CardArtPanel` on the DM desk fills in what's missing.
- Changing a collection's fields through the local admin UI makes PocketBase write a migration file into `pb_migrations/`. Write schema changes as migrations by hand and don't commit generated ones.
- Years are whole numbers: negative for BC, positive for AC (the Age of Concord). There is no year zero, so 0 always means "not set". Format and convert them with `app/lib/chronicle.ts`, never by hand.
- Every file field takes images, named like images (`checkUploadNames` in the hooks), except those listed in `OTHER_UPLOADS` there: so far only `songs.audio`, which takes `.mp3`. A new non-image field needs its entry there, its `mimeTypes`, and, if the browser plays it from a blob, the CSP's `media-src` (`csp.ts`).
- The Songs section has exactly one `<audio>` element, in `SongPlayerProvider` (mounted by `routes/songsLayout.tsx`). Pages play through `useSongPlayer()`, never an `<audio>` of their own (the DM editor's preview is outside the section). The queue's rules are pure functions in `app/lib/songs.ts` with tests.
- Electrum is awarded and spent with `adjustElectrum()`, which sends PocketBase's `amount+` / `amount-` modifiers so the server does the sum. Only an outright correction writes `amount` itself.
- The timeline's row heights are constants in `app/components/Timeline.tsx` that the `.tl-*` rules in `app/app.css` match. Change them together.
- The Atlas positions everything by percentages of one box (`.atlas-sheet`), which carries the pan and zoom as a single transform. Names, pins, handles and stroke widths are scaled back by `1/z` so they hold their size; put that counter-scale on a wrapper, never on the pin itself, or it loses its hover scale.
- Chart geometry and the view maths live in `app/lib/atlas.ts` as pure functions with tests. `AtlasChart` owns only the view, the hover and the gesture in progress; `routes/atlas.tsx` owns the records, the tool and the selection, and saves a drag once, when it ends.
- The chart's handles cancel their `pointerdown` (so a drag can't select text), which stops the browser sending `dblclick`. Count double presses with `secondPress()` in `AtlasChart` instead.
- Places, realms and features are listed by `@rowid`: the order they were added is the order they are drawn, and the last one drawn is the one a click finds.
- Tailwind drops `app.css` component classes it can't find written out in the source, so never build a class name from pieces (`tl-cluster--${kind}`).
- Lore, backstories and hero updates are HTML-capable markdown that DMs read while signed in, so `renderLore()` (`app/lib/markdown.ts`) keeps them to laying out their own text: no `<style>`, forms or form controls, SVG or MathML; a `style` attribute keeps only `width`, `text-align` and `vertical-align`; a class only the markdown plugins' (`footnote-*`, `language-*`); no `data-*`. Loosen those rules there, deliberately, and extend `testing/markdown.test.ts`.
- The Content-Security-Policy is a `<meta>` the build writes into `index.html` (`csp.ts`, from `buildEnd` in `react-router.config.ts`): scripts from our origin plus the hashes of React Router's inline ones, no `<style>` elements, forms only to our origin. A new third-party origin (a font, an API) has to be added in `csp.ts`. `npm run dev` doesn't apply it; a built copy served by PocketBase does.
- Text helpers in `app/lib/lore.ts` (`plainText`, `autoSummary`) mirror those in `pb_hooks/phantos/lib.js`. Keep them in step. The same goes for the category labels the RSS feed prints (`CATEGORY_LABELS` there, `CATEGORIES` here); `testing/feed.test.ts` checks them.
- The hooks module is CommonJS and the package is ESM, so a test can't import it: `testing/feed.test.ts` evaluates the file instead. That works while the module touches PocketBase's globals (`$app`, `$os`) only inside its functions.
- What a player may do is decided by the rules in `1791331200_players.js` and the hooks. `playsHero()` only decides what the site offers; it is not a permission check. Rules read `@request.auth.approved` from the database on each request, so an approval or a revoke takes hold at once; the site refreshes the player's own record once a page load (`refreshPlayer()`).
- Path alias `~/*` → `./app/*`. Route components are default exports.

## Verifying Work

Run `npm test`, `npm run typecheck` and `npm run build`. For UI changes, run the app against a local PocketBase and check the home page, `/lore?q=…`, an entry, the feed at `/api/phantos/feed.xml` on PocketBase's own port (its links should open entries), `/chronicle` (zoom, pan, a cluster, a hover card), `/atlas` (wheel zoom, pan, a pin's card, a realm; as a DM, each tool, a drag of a pin and of a handle, and a desk form), `/pantheon` and a member's page, `/heroes` and a hero's page (with an update posted as a DM, and its electrum banner), `/players` (join with a hero, the pending state, a DM's approval on the desk, then the hero's page as that player: edit the backstory and post an update), `/electrum` (the calculator; as a DM, an award, a spend and a shop item), `/songs` (play one and let it run into the next, shuffle, open a song's lyrics while it plays; as a DM, add a song with an MP3 and lyrics), and the DM editors at desktop and phone widths. When a change loads something new (a script, font, image host or API), also serve the build from PocketBase (`--publicDir=build/client`) and check the browser console for Content Security Policy violations.
