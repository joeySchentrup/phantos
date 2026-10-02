# Phantos

A website supporting the Phantos universe: a searchable archive of the campaign's lore, styled like a duel-monster card game.

- **Lore archive.** Every document from [`lore/`](lore/) lives in PocketBase and is seeded on first start. Each entry is shown as a card: the frame colour is the category, the orb is the element, and the stars show its length.
- **Search.** Full-text search across titles, voices, card text and whole documents, with highlighted snippets.
- **Pantheon.** The powers of Phanatos at `/pantheon`, laid out like the archive: searchable, filtered by rank, one card each. A member's page ends with the cards of every lore entry that refers to them, and every lore entry ends with the members it names.
- **Chronicle.** A timeline of the ages at `/chronicle`, read left to right. Drag to pan; pinch, Ctrl + scroll or the buttons to zoom. Eras run as bands across the top, lore sits above the line as titles (hover for the card, click to read it), and short events sit below it. Where things crowd together they gather into a "+N" marker that opens as you zoom in.
- **Heroes.** The party at `/heroes`, one card each, searchable. A hero's page holds who they are (player, species, class, background, alignment, faith; no stats or inventory), their backstory, and beneath it a running list of updates, newest first.
- **Electrum.** The currency the party earns at the table. A blue banner on each hero's page shows what they hold and opens `/electrum`: the ledger of every account, the electrum shop, and a level up cost calculator. What a hero holds sets the stars on their card. See [Electrum](#electrum).
- **Fast card images.** Cards load a small square copy of each image ("card art", 720×720 WebP), not the original, so the lists stay quick; a lore entry's, member's or hero's own page still shows the full image. See [Card art](#card-art).
- **Featured image.** The hero at the top of the home page. The DM uploads it, with an optional caption, from the DM desk.
- **Dungeon Master tools.** Sign in at `/dm` to add, edit, draft and delete lore. You can import `.md` files directly, and upload an image for any card: it becomes the card's art and appears above the text. Give an entry an in-universe date to put it on the Chronicle, and pick the pantheon members it refers to. Add pantheon members of your own, with a portrait, from the Pantheon page. On the Chronicle page itself, signed-in DMs get forms to add eras and points (events of up to 255 characters). Add heroes and edit their backstories from the Heroes page; post, edit and delete a hero's updates on the hero's own page. Give a hero an electrum account in their editor; award, spend and correct electrum, and add to the shop, on the Electrum page. On the Atlas page, signed-in DMs get tools to add places, draw realms, ranges and rivers and plant forests, and drag any of them into place.
- **Atlas.** The charts of the known world at `/atlas`, drawn in ink on parchment. Drag to pan; scroll, pinch or the buttons to zoom. Realms and capitals are always named; cities and seas appear as you zoom in, then ranges, forests and rivers. Select a place to draw its lore card, or a realm to read its standing. See [The Atlas](#the-atlas).

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
- **Upgrading.** New migrations run on the next start. The Chronicle migrations add the date fields, date the seeded lore (skipping any entry that already has a date or whose URL name has changed), and seed the eras and events. The Pantheon migrations create the pantheon, copy the Primal Dragons' portraits from their recollections, and link the seeded lore to the members it names (skipping any entry that already has links). The Heroes migrations create the heroes and their updates, and seed Daymond Greystone (skipped if his URL name is taken). The card art migrations add the `card_art` field and make a card copy of every existing image, so the lists are fast as soon as the new version starts. The Atlas migrations create the charts and seed the chart of Hurly (skipped if a chart called `hurly` already exists). The Electrum migrations create the ledger, the shop and the level up costs and seed them from the DM's spreadsheet (an account, item or level that is already there is left alone).
- **`DM_EMAIL` / `DM_PASSWORD`** create the first Dungeon Master if that account doesn't exist yet. You can also add DMs from the admin UI at `/_/` under **dungeon_masters**. There is no public sign-up.
- **Pantheon.** The powers of Phanatos at `/pantheon`, laid out like the archive: searchable, filtered by rank, one card each. A member's page ends with the cards of every lore entry that refers to them, and every lore entry ends with the members it names.
- **Chronicle.** A timeline of the ages at `/chronicle`, read left to right. Drag to pan; pinch, Ctrl + scroll or the buttons to zoom. Eras run as bands across the top, lore sits above the line as titles (hover for the card, click to read it), and short events sit below it. Where things crowd together they gather into a "+N" marker that opens as you zoom in.
- **Featured image.** Until the DM uploads one, the home page shows the six dragons instead.

## Card art

Cards are drawn about 300px wide, but the images behind them can be 4,000px photos or multi-megabyte PNGs, and even PocketBase's thumbnails of a PNG are PNGs. So each lore entry, pantheon member and hero keeps two images: the original (shown on its own page) and `card_art`, a 720×720 copy cropped to the card's square picture box. Cards only ever load the copy, or a 480px thumbnail while there isn't one.

Card copies are made three ways:

- **When an image is uploaded** through the site's editors, the DM's browser makes a WebP copy and saves it with the image.
- **On upgrade**, a migration makes a copy of every existing image with PocketBase's own resizer. It can't write WebP, so a JPEG gets a JPEG copy and a PNG a PNG copy.
- **On the DM desk**, a Card Art panel runs by itself whenever a DM opens the desk. It makes a WebP copy of any image still without one, and replaces the migration's JPEG/PNG copies with WebP. This also catches images uploaded through the admin UI at `/_/`.

If an image is replaced without a new copy (through `/_/`, say), the server drops the out-of-date copy and the desk makes a new one. The four seeded maps went from 6.7 MB to 292 KB of card images on a high-density screen.

## Heroes

A hero card has its own frame, orange running into green like a pendulum card. Its orb is whichever element the DM picks. Its stars are the hero's [electrum](#electrum), not their level; a hero with no electrum reads `[HERO CARD]` instead. The type line is species / class: `[Variant Aasimar / Bard]`.

The site keeps a character's identity, not their sheet: name, player, species, class and subclass, background, alignment, faith, a portrait and a markdown backstory. Level and other stats stay on the character sheet. Updates are short markdown notes (up to 4,000 characters) with an optional heading, shown newest first beneath the backstory. Deleting a hero deletes their updates; an unpublished hero's updates are hidden along with them.

One hero is seeded, Daymond Greystone, with his player's backstory ([`1790985601_seed_heroes.js`](pb_migrations/1790985601_seed_heroes.js)).

## Electrum

Electrum is earned at the table and spent in the electrum shop. The page at `/electrum` is not in the top bar: it is reached from the blue banner above a hero's backstory.

- **The ledger.** One account per player: what they hold and what they have spent. An account belongs to at most one hero, and an account with no hero yet is still listed, under its own name. A signed-in DM opens **Adjust** on a row to award electrum, to spend it (it leaves what is held and is added to what is spent), or to set the figures outright.
- **Stars.** A hero card carries 12 stars at 10,000 electrum held and scales down in a straight line from there: one star for every 833⅓, earned whole and never rounded up. The first star is the exception: any electrum at all earns it, so the second comes at 1,667.
- **Accounts and heroes.** The hero editor has an account field. It offers every account that has no hero yet, and picks the one in the hero's player's name if there is one; otherwise it opens a new account. Deleting a hero leaves their account on the ledger, without a hero.
- **The shop.** Every item has a flat price, a whole number of electrum. DMs add, edit and delete items on the page.
- **Level up cost.** The one price that isn't flat. It is worked out ahead for each level and stored, and the calculator adds up the levels between where a hero is and where they are going.

The seed ([`1791244801_seed_electrum.js`](pb_migrations/1791244801_seed_electrum.js)) copies the DM's spreadsheet: six accounts (2,370 electrum held, 1,645 spent), the shop, and the level up costs for levels 4 to 20, which follow 40 + 10 × l × (l − 1). The sheet prices enhancing a weapon at 100 × the bonus reached; it is seeded as three flat items, +1 to +3. Joey's account is tied to Daymond Greystone; the other five wait for their heroes.

## The Atlas

A chart is drawn entirely in vector, from four kinds of record:

| Record | What it is | How a DM makes one |
|---|---|---|
| Chart | The sheet: its coastline, its seas' names, a dateline and a description | In the admin UI at `/_/` for now; a chart with no land yet shows as face down |
| Place | A pin that draws a lore card: capital, city, port, fortress or ruin | **Add a place**, then click the chart |
| Realm | A political region: a polygon, a tint and a standing | **Draw a realm**, click its corners, then finish |
| Terrain | A mountain range, forest, river or lake | **Draw a range** or **Draw a river** along its line; **Plant a forest** at its heart |

Everything is placed in chart units, whole numbers from 0 to the chart's width and height (1400 × 700 for Hurly). With **Select**, a DM drags a pin to move a place, and the handles of a selected realm or piece of terrain to reshape it: a forest or lake moves by its heart and resizes by its edge. A drag is saved when it ends. Names, kinds, tints, standings and lore cards are edited in the desk under the chart, where a lake is made by changing a forest's kind. New things start unpublished, so only DMs see them until they are published.

A place names the realm it is said to stand in. A seeded place keeps the realm the lore gives it; a place a DM adds or drags takes the realm it lands in.

The seeded chart is Hurly as of c. 307 AC: 24 realms, nine pieces of terrain and eight places ([`1791158401_seed_atlas.js`](pb_migrations/1791158401_seed_atlas.js)). The realm borders are cells fitted to a traced coastline, not the lines of the hand-drawn map, and the places stand only roughly where the lore puts them. Both are meant to be dragged into place.

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

The 24 seeded members are written from the lore documents ([`1790899201_seed_pantheon.js`](pb_migrations/1790899201_seed_pantheon.js)). Each Primal Dragon takes its portrait from the image of its recollection, if that entry has one when the migration runs. The seeded lore is linked to every member it names ([`1790899202_link_lore_to_pantheon.js`](pb_migrations/1790899202_link_lore_to_pantheon.js)).

## Dates

Years follow the lore's own count: **BC** before the Treaty of Heraklion and **AC**, the Age of Concord, after it. There is no year zero. In the database a year is a whole number, negative for BC and positive for AC, with 0 meaning "undated". A date can be marked *circa*.

The seeded lore was dated from what the documents say; [`pb_migrations/1790812801_date_seeded_lore.js`](pb_migrations/1790812801_date_seeded_lore.js) lists every date and the reasoning behind the uncertain ones. The eras and events seeded onto the timeline come from the two history documents ([`1790812802_seed_chronicle.js`](pb_migrations/1790812802_seed_chronicle.js)). All of it can be edited by a Dungeon Master afterwards.
