# Phantos

A website supporting the Phantos universe: a searchable archive of the campaign's lore, styled like a duel-monster card game.

- **Lore archive.** Every document from [`lore/`](lore/) lives in PocketBase and is seeded on first start. Each entry is shown as a card: the frame colour is the category, the orb is the element, and the stars show its length.
- **Search.** Full-text search across titles, voices, card text and whole documents, with highlighted snippets.
- **Featured vision.** An AI-rendered hero image painted from a prompt distilled from the lore. The DM can re-render it at any time.
- **Dungeon Master tools.** Sign in at `/dm` to add, edit, draft and delete lore. You can import `.md` files directly, and upload illustrations and maps.
- **Coming soon.** Atlas, Pantheon, Chronicle, Heroes and Session Log are linked from the top navigation as face-down cards.

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

Put server secrets such as `OPENAI_API_KEY` in a `.env` file (see [`.env.example`](.env.example)).

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
  -e OPENAI_API_KEY=sk-... \
  ghcr.io/joeyschentrup/phantos:latest
```

- **Mount a volume at `/pb/pb_data`.** The database and every uploaded image live there.
- **First start.** The migrations create the collections and seed the archive from the lore files baked into the image (`/pb/lore`). This runs once. Later DM edits are never overwritten.
- **`DM_EMAIL` / `DM_PASSWORD`** create the first Dungeon Master if that account doesn't exist yet. You can also add DMs from the admin UI at `/_/` under **dungeon_masters**. There is no public sign-up.
- **`OPENAI_API_KEY`** turns on featured-image generation.
  - `OPENAI_IMAGE_MODEL` defaults to `gpt-image-2.5-sunburst`.
  - `OPENAI_IMAGE_QUALITY` defaults to `high`.
  - Until a vision is rendered, the home page shows the six dragons instead.

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
