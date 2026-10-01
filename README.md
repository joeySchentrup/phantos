# Phantos

A website supporting the Phantos universe: a searchable archive of the campaign's lore, styled like a duel-monster card game.

- **Lore archive.** Every document from [`lore/`](lore/) lives in PocketBase and is seeded on first start. Each entry is shown as a card: the frame colour is the category, the orb is the element, and the stars show its length.
- **Search.** Full-text search across titles, voices, card text and whole documents, with highlighted snippets.
- **Chronicle.** A timeline of the ages at `/chronicle`, read left to right. Drag to pan; pinch, Ctrl + scroll or the buttons to zoom. Eras run as bands across the top, lore sits above the line as titles (hover for the card, click to read it), and short events sit below it. Where things crowd together they gather into a "+N" marker that opens as you zoom in.
- **Featured image.** The hero at the top of the home page. The DM uploads it, with an optional caption, from the DM desk.
- **Dungeon Master tools.** Sign in at `/dm` to add, edit, draft and delete lore. You can import `.md` files directly, and upload an image for any card: it becomes the card's art and appears above the text. Give an entry an in-universe date to put it on the Chronicle. On the Chronicle page itself, signed-in DMs get forms to add eras and points (events of up to 255 characters).
- **Coming soon.** Atlas, Pantheon and Heroes are linked from the top navigation as face-down cards.

## Stack

Same stack and deployment as [shear-madness](https://github.com/Schentrup-Software/shear-madness):

- **Frontend:** React 19, React Router 7 (SPA mode), TypeScript, Tailwind CSS 3, Vite 6
- **Backend:** PocketBase 0.40, with JS hooks in [`pb_hooks/`](pb_hooks/) and migrations in [`pb_migrations/`](pb_migrations/)
- **Deploy:** one Docker image. PocketBase serves the API and the built SPA on port 8080. GitHub Actions pushes `ghcr.io/joeyschentrup/phantos:latest` on every push to `main`.

## Running locally

```bash
npm install
bash .devcontainer/start-pocketbase.sh   # PocketBase on :8090 — creates the schema and seeds the lore
npm run dev                              # http://localhost:5173
```

The devcontainer runs the PocketBase script for you. The script:

- downloads PocketBase;
- applies the migrations, which create the collections and import everything in `lore/`;
- creates a local superuser (`admin@local.test` / `admin12345678`, admin UI at http://localhost:8090/_/);
- creates a Dungeon Master (`dm@local.test` / `dungeonmaster`);
- points Vite at the local server.

To use a different local DM login, put `DM_EMAIL` and `DM_PASSWORD` in a `.env` file (see [`.env.example`](.env.example)).

```bash
npm test           # unit tests (vitest)
npm run typecheck  # React Router typegen + tsc
npm run build      # production SPA in build/client
```

## Deploying

```bash
docker run -d -p 8080:8080 \
  -v phantos_data:/pb/pb_data \
  -e DM_EMAIL=dm@example.com -e DM_PASSWORD='a long password' \
  ghcr.io/joeyschentrup/phantos:latest
```

- **Mount a volume at `/pb/pb_data`.** The database and every uploaded image live there.
- **First start.** The migrations create the collections and seed the archive from the lore files baked into the image (`/pb/lore`). This runs once. Later DM edits are never overwritten.
- **Upgrading.** New migrations run on the next start. The Chronicle migrations add the date fields, date the seeded lore (skipping any entry that already has a date or whose URL name has changed), and seed the eras and events.
- **`DM_EMAIL` / `DM_PASSWORD`** create the first Dungeon Master if that account doesn't exist yet. You can also add DMs from the admin UI at `/_/` under **dungeon_masters**. There is no public sign-up.
- **Chronicle.** A timeline of the ages at `/chronicle`, read left to right. Drag to pan; pinch, Ctrl + scroll or the buttons to zoom. Eras run as bands across the top, lore sits above the line as titles (hover for the card, click to read it), and short events sit below it. Where things crowd together they gather into a "+N" marker that opens as you zoom in.
- **Featured image.** Until the DM uploads one, the home page shows the six dragons instead.

## How the lore is organised

| Frame (category) | Card style | Holds |
|---|---|---|
| Tale | Normal (gold) | Stories, poems, plays |
| Chronicle | Effect (orange) | Histories, nations, biographies |
| Myth | Spell (green) | Creation myths, scripture, prophecy |
| Dispatch | Trap (magenta) | In-world papers, reports, treatises, secrets |
| Codex | Ritual (blue) | Calendars, languages, tables, rules |
| Recollection | Fusion (violet) | The Primal Dragons in their own words |
| Map | Xyz (black) | Maps of the world |

Attributes follow the six Primal Dragons, plus the divine:

| Attribute | Glyph | Dragon |
|---|---|---|
| Light | 光 | Ouro'ras |
| Dark | 闇 | Golestandt |
| Fire | 炎 | Vlaurunga |
| Ice | 氷 | Yvander |
| Earth | 地 | Rokesh |
| Arcane | 魔 | Quintara Lotus |
| Divine | 神 | Kalistos |

A card's level (1–12 stars) comes from its word count.

## Dates

Years follow the lore's own count: **BC** before the Treaty of Heraklion and **AC**, the Age of Concord, after it. There is no year zero. In the database a year is a whole number, negative for BC and positive for AC, with 0 meaning "undated". A date can be marked *circa*.

The seeded lore was dated from what the documents say; [`pb_migrations/1790812801_date_seeded_lore.js`](pb_migrations/1790812801_date_seeded_lore.js) lists every date and the reasoning behind the uncertain ones. The eras and events seeded onto the timeline come from the two history documents ([`1790812802_seed_chronicle.js`](pb_migrations/1790812802_seed_chronicle.js)). All of it can be edited by a Dungeon Master afterwards.
