# Phantos

A website supporting the Phantos universe: a searchable archive of the campaign's lore, styled like a duel-monster card game.

- **Lore archive.** Every document from [`lore/`](lore/) lives in PocketBase and is seeded on first start. Each entry is shown as a card: the frame colour is the category, the orb is the element, and the stars show its length.
- **Search.** Full-text search across titles, voices, card text and whole documents, with highlighted snippets.
- **Pantheon.** The powers of Phanatos at `/pantheon`, laid out like the archive: searchable, filtered by rank, one card each. A member's page ends with the cards of every lore entry that refers to them, and every lore entry ends with the members it names.
- **Chronicle.** A timeline of the ages at `/chronicle`, read left to right. Drag to pan; pinch, Ctrl + scroll or the buttons to zoom. Eras run as bands across the top, lore sits above the line as titles (hover for the card, click to read it), and short events sit below it. Where things crowd together they gather into a "+N" marker that opens as you zoom in.
- **Heroes.** The party at `/heroes`, one card each, searchable. A hero's page holds who they are (player, species, class, background, alignment, faith; no stats or inventory), their backstory, and beneath it a running list of updates, newest first.
- **Featured image.** The hero at the top of the home page. The DM uploads it, with an optional caption, from the DM desk.
- **Dungeon Master tools.** Sign in at `/dm` to add, edit, draft and delete lore. You can import `.md` files directly, and upload an image for any card: it becomes the card's art and appears above the text. Give an entry an in-universe date to put it on the Chronicle, and pick the pantheon members it refers to. Add pantheon members of your own, with a portrait, from the Pantheon page. On the Chronicle page itself, signed-in DMs get forms to add eras and points (events of up to 255 characters). Add heroes and edit their backstories from the Heroes page; post, edit and delete a hero's updates on the hero's own page.
- **Coming soon.** Atlas is linked from the top navigation as a face-down card.

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
- **Upgrading.** New migrations run on the next start. The Chronicle migrations add the date fields, date the seeded lore (skipping any entry that already has a date or whose URL name has changed), and seed the eras and events. The Pantheon migrations create the pantheon, copy the Primal Dragons' portraits from their recollections, and link the seeded lore to the members it names (skipping any entry that already has links). The Heroes migrations create the heroes and their updates, and seed Daymond Greystone (skipped if his URL name is taken).
- **`DM_EMAIL` / `DM_PASSWORD`** create the first Dungeon Master if that account doesn't exist yet. You can also add DMs from the admin UI at `/_/` under **dungeon_masters**. There is no public sign-up.
- **Pantheon.** The powers of Phanatos at `/pantheon`, laid out like the archive: searchable, filtered by rank, one card each. A member's page ends with the cards of every lore entry that refers to them, and every lore entry ends with the members it names.
- **Chronicle.** A timeline of the ages at `/chronicle`, read left to right. Drag to pan; pinch, Ctrl + scroll or the buttons to zoom. Eras run as bands across the top, lore sits above the line as titles (hover for the card, click to read it), and short events sit below it. Where things crowd together they gather into a "+N" marker that opens as you zoom in.
- **Featured image.** Until the DM uploads one, the home page shows the six dragons instead.

## Heroes

A hero card has its own frame, orange running into green like a pendulum card. Its orb is whichever element the DM picks, and in place of stars it reads `[HERO CARD]`. The type line is species / class: `[Variant Aasimar / Bard]`.

The site keeps a character's identity, not their sheet: name, player, species, class and subclass, background, alignment, faith, a portrait and a markdown backstory. Level and other stats stay on the character sheet. Updates are short markdown notes (up to 4,000 characters) with an optional heading, shown newest first beneath the backstory. Deleting a hero deletes their updates; an unpublished hero's updates are hidden along with them.

One hero is seeded, Daymond Greystone, with his player's backstory ([`1790985601_seed_heroes.js`](pb_migrations/1790985601_seed_heroes.js)).

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

## The Pantheon

A member's rank is its card frame, and its stars follow its rank:

| Rank | Frame | Seeded members |
|---|---|---|
| Creator | Gold | Kalistos |
| Primal Dragon | Pearl | Ouro'ras, Golestandt, Vlaurunga, Yvander, Quintara Lotus, Rokesh |
| Twin | Day into night | Quint, Erosia |
| Greater Dragon | Ruby | The fifteen, from Jinshi to Glaedwyn |
| Power | Slate | None: for whatever the Dungeon Master adds |

A member has one element, or two if it is a child of two (the Greater Dragons); both orbs show on the card.

The 24 seeded members are written from the lore documents ([`1790899201_seed_pantheon.js`](pb_migrations/1790899201_seed_pantheon.js)). Each Primal Dragon takes its portrait from the card art of its recollection, if that entry has any when the migration runs. The seeded lore is linked to every member it names ([`1790899202_link_lore_to_pantheon.js`](pb_migrations/1790899202_link_lore_to_pantheon.js)).

## Dates

Years follow the lore's own count: **BC** before the Treaty of Heraklion and **AC**, the Age of Concord, after it. There is no year zero. In the database a year is a whole number, negative for BC and positive for AC, with 0 meaning "undated". A date can be marked *circa*.

The seeded lore was dated from what the documents say; [`pb_migrations/1790812801_date_seeded_lore.js`](pb_migrations/1790812801_date_seeded_lore.js) lists every date and the reasoning behind the uncertain ones. The eras and events seeded onto the timeline come from the two history documents ([`1790812802_seed_chronicle.js`](pb_migrations/1790812802_seed_chronicle.js)). All of it can be edited by a Dungeon Master afterwards.
