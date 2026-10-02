# Phantos Atlas — implementation brief

Build the Atlas section of Phantos (`/atlas`), currently the face-down "coming soon" page, as an interactive chart of Hurly that readers pan and zoom and the Dungeon Master edits in place. This brief is written for an agent working inside the `joeySchentrup/phantos` repository and assumes its `CLAUDE.md` conventions (all data access through `app/backend/api.ts`, hand-written PocketBase migrations, card internals in `cqw`, Tailwind class names written out, lore/Tailwind/PocketBase stack as documented there).

A working prototype of everything described here was built on a Claude Design canvas and is included in `prototype/`. `prototype/Chart.dc.html` is the one that matters: its `<script>` block holds the complete geometry, hit-testing, pan/zoom and name-tiering logic in plain JavaScript, ready to port to TypeScript. Read it alongside this document; where the two disagree, the prototype is the behaviour that was reviewed and approved.

Bundle contents:

| Path | What it is |
|---|---|
| `ATLAS-HANDOFF.md` | This brief. |
| `data/hurly-chart.json` | Seed data for the Hurly chart: land outline, 24 realms, 9 terrain features, 8 places (with lore slugs), sea labels. |
| `prototype/Chart.dc.html` | The interactive chart (viewer + DM editor) as prototyped. Logic in the `<script type="text/x-dc">` block. |
| `prototype/Main.dc.html`, `DungeonMaster.dc.html`, `Phone.dc.html` | The three page shells (visitor desktop, DM desktop, phone) that mount the chart. Thin; mostly layout. |

---

## 1. What the Atlas is

The Atlas page follows the Chronicle page's shape exactly: a page head (eyebrow, title, lead), the interactive thing, and — for a signed-in Dungeon Master — a desk below it for editing. It uses the site's existing card metaphor: a **place** on the chart is a point that draws a lore card (the same `LoreCard` the Chronicle shows on hover), a **realm** is a political region (the chart's "frame colour"), and **terrain** is the land itself (ranges, forests, rivers, lakes).

Everything is drawn in vector on a parchment `.scroll`, in the house style: ink lines (`#2b1c10`, `#4a3520`, `#5b4527`), parchment grounds (`#efe2c0` land, `#e2cf9f` sea), realm tints from the six era tones, and the five type families with their existing jobs. No raster map image is required; an optional hand-drawn underlay is listed as a later addition.

In-world language throughout: a map is a **chart**, the DM **keeps** the Atlas, an unfinished chart is **face down**, the DM **plants** a forest and **draws** a realm. Copy strings are collected in §8.

---

## 2. Reader experience (visitor mode)

### 2.1 Page layout

- `<main>` capped at `chronicle-max` (`max-w-[100rem] px-4 sm:px-6 pb-10`), like the Chronicle.
- Head, centred, `max-w-3xl`: eyebrow **Charts of the Known World**, `h1` **Atlas**, lead: *Every realm, range, river and city the archive knows, drawn on one chart. Select a place to draw its card, or a realm to read its standing. Drag to pan; the buttons zoom.*
- Controls row (flex, wraps): left, chart chips (one per published chart; pill filter chips in the FrameSwatch style — gold hairline at 25%, chosen chip gets a full gold border, gold at 15% behind, `gold-hi` text, `aria-pressed`). Right, a **Show** label and three layer chips: **Realms**, **Terrain**, **Places**, all on by default.
- Chart row: `display:flex; gap:24px; align-items:stretch`. Left: the **key** (§2.6), `flex: 0 0 232px`. Right: the chart frame, `flex: 1 1 auto; min-width: 0`, which **takes the row's height** (it has no fixed aspect ratio on desktop; `min-height: 26rem`). Both columns end on the same line. Below `lg`, the row stacks: chart first (square, `aspect-ratio: 1/1`), key beneath it in two columns.
- Below the chart row, two `.panel`s side by side (one column on phones): **Places on this chart** (`N · each draws a card`), each row a glyph, the name (a button that selects it on the chart), `Kind, Realm`, and a link to the lore entry (`Title →`); and **Realms of Hurly** (`N · as of c. 307 AC`), a two-column list of tint swatch, name and standing. These lists are the accessible path to everything on the chart.

### 2.2 The chart frame

- A `.scroll` with `padding: 0; overflow: hidden; position: relative; user-select: none; touch-action: none`. Inside, an absolutely positioned **inner box** of `width: 100%` and `aspect-ratio: chart.width / chart.height` (1400/700) carrying the view transform `translate(tx%, ty%) scale(z)` with `transform-origin: 0 0`. Everything positioned on the chart — the SVG and every HTML overlay — lives in that box, placed by percentages of it (`left: x / chart.width * 100%`, `top: y / chart.height * 100%`), so one transform moves it all.
- The SVG (`viewBox="0 0 1400 700"`, `width: 100%`) draws, in order: sea rect `#e2cf9f`; two inner frame rules `#8a6d3b` (1.2 solid at 14px inset, 0.6 dashed `2 3` at 20px); coastal hachure (the coast path stroked `#4a3520`, width 10, dash `1 4`, opacity .28); land (coast path, fill `#efe2c0`, stroke `#2b1c10` 2.2, round joins); a realms group (six paths, one per tone, fill-opacity .22–.26; then all realm outlines in one path, stroke `#5b4527` 1.4, dash `7 4`); a terrain group (forests fill `#d9caa0` stroke `#4a3520` 1.1; mountains fill `#e6d8b3` stroke 1.5; lakes fill `#dccfa6` stroke 1.6; rivers stroked `#4a3520` 3.6 then `#efe2c0` 1.4 on top for a two-bank line); the selection/hover outline (`#8a1f0d` 2.6, fill `rgba(138,31,13,.10)`); and the DM's drafting path (dashed `5 4`). Layer toggles set the group's `opacity` 0/1 (and skip hit-testing for hidden layers).
- HTML overlays in the inner box (all `pointer-events: none` except pins and handles): sea names, realm names, terrain names, pins with their names, and in DM mode the handles and drafting dots. A small compass rose (inline SVG, 90px, `#8a1f0d`) sits at chart (1120, 546).
- Overlays **outside** the inner box, positioned in frame space: the zoom cluster (top right: `+`, `−`, `⌂` whole chart, and the zoom percentage, in a `.panel`-like dark box using `btn btn-ghost tl-zoom`), the **caption** (top left `.panel`: kicker *Realm* or *Terrain*, the name in Cinzel 20px, then the standing or kind), and the **card popover** (see 2.5).
- Realm tints: index `tone` 0–5 maps to the era tones already in `app.css` (`[data-tone]`): `#f1cf4a #b07be0 #f0713f #5fb6ea #c9925a #3fc7aa`. Neighbouring realms carry different tones; the seed is already coloured that way.

### 2.3 Pan and zoom

Chart units: the chart's `width × height` (1400 × 700). View state `{z, tx, ty}`: `tx` is a percentage of the frame width, `ty` a percentage of the inner box height (`frameWidth × height/width`).

- **Initial view**: `z0 = 1.2` on desktop, `2` on phone (prop). Centre the land: `tx = 50 − cx·z0`, `ty = (frameH / innerH)·50 − cy·z0`, where `(cx, cy)` is the land's bounding-box centre in percent (Hurly: 49.8, 49.4; compute it from `chart.land`). Because the frame's height comes from the key's height on desktop, **measure the frame with a `ResizeObserver`** and recompute from the measured aspect; never assume 2:1.
- **Zoom about a point** `(fx, fy)` (percentages in the same units as `tx`, `ty`): `tx' = fx − (fx − tx)·z'/z`, `ty' = fy − (fy − ty)·z'/z`. Clamp `z` to `[0.5, 6]`.
  - Wheel: `factor = exp(−deltaY × 0.0015)` (`× 0.05` when `deltaMode === 1`), about the cursor. Attach the wheel listener natively with `{passive: false}` and `preventDefault()` — React 17+ registers `onWheel` passively, so the page would scroll otherwise.
  - Buttons: `× 1.6` / `÷ 1.6` about the frame centre; **Whole chart** resets to the initial view.
  - Pinch: track active pointers; with two, `z = z_at_pinch_start × dist / dist_at_start`, about the midpoint.
- **Pan**: pointer drag on the frame; `Δtx = Δpx / frameW × 100`, `Δty = Δpy / innerH × 100`. A press that moves less than 4px is a click. Use pointer events (mouse + touch in one path); cancel pan/drag on `pointerleave`/`pointercancel`.
- **Pointer → chart units**: `x = ((px / frameW × 100 − tx) / z) × width/100`, `y = ((py / innerH × 100 − ty) / z) × height/100`.
- **Chart units → frame percent** (for the popover): `X% = tx + x/width×100 × z`, `Y% = (ty + y/height×100 × z) × innerH/frameH`.

### 2.4 What zooming does to annotation (counter-scaling)

The land zooms; the annotation holds its screen size. With `inv = 1/z`:

- Realm and terrain names: `transform: translate(-50%,-50%) scale(z^0.25 / z)` — they grow only a little (≈1.3× at 3×).
- Pins and their names, handles, drafting dots, sea names, compass: `scale(inv)` (constant screen size). Wrap each pin + name in a zero-size positioned `<div>` that carries the counter-scale, so the pin's own hover `transform: scale(1.18)` still applies.
- SVG stroke widths and dash arrays: divide by `z` (bind them from state; `vector-effect` is unreliable under an HTML ancestor transform). Terrain glyphs (peaks, trees) and the land itself scale normally.

### 2.5 Names, pins and the card

- **Name tiers** fade in (`opacity`, 180ms) as the reader zooms:
  - Always: realm names and **capital** names.
  - From `z ≥ 1.5`: city, port, fortress and ruin names, and the sea names.
  - From `z ≥ 2.2`: terrain names (ranges, forests, rivers, the lake).
  - A hovered or selected item is always named regardless of tier. Pins are always visible.
  - Expose the two thresholds as constants in `app/lib/atlas.ts` (`NAME_TIER_2_AT = 1.5`, `NAME_TIER_1_AT = 2.2`).
- **Sizes** (screen px before counter-scaling): realm names Cinzel 700 uppercase, `letter-spacing .14em`, colour `#5a1a0a`, size `clamp(6, 10, polygonWidth × 0.8 / nameLength)`; terrain names Source Serif 4 italic 8px `#4a3520`; place names Spectral SC 600 10px `#1d150c`, 14px right of the pin centre, vertically centred; sea names italic 11px (Bay of Bliss 8px), `letter-spacing .3em`, `#4a3520`. All names carry a parchment halo: `text-shadow: 0 0 3px #efe2c0, 0 0 6px #efe2c0`.
- **Pins** are real `<button>`s: a disc, border `2px solid #2b1c10`, fill `#a3301c` (ruins `#5b4527`), glyph in `#fff2d2`. Capital 26px with `★` (13px); city `●`, port `◆`, fortress `■`, ruin `○` at 20px. Hover/focus/selected: `transform: scale(1.18)` plus `box-shadow: 0 0 0 3px rgba(217,84,30,.5), 0 2px 4px rgba(0,0,0,.5)`; focus ring `2px solid #f2c14e`. `aria-label`: `"{name}, {kind} in {realm}. Draws its card."` Unpublished places are hidden from readers.
- **The card**: hovering or focusing a pin shows a popover; clicking pins it (click the frame to dismiss). The popover is a `.panel` (240px, padding 12px) outside the zoom box, anchored at the pin's frame position: to the right when the pin is left of 58% of the frame width, else to the left; opening downward when the pin is in the top half, else upward; offset 18px horizontally / 24px vertically. Inside: a kicker `{Kind} · {Realm}` in the eyebrow style, then `<LoreCard lore={entry} to={`/lore/${slug}`} />` in a 216px-wide box. A place with no lore entry shows a generic face-down card: title = place name, summary *This card has no text yet.*, `published: false` so it stamps Draft. On phones (`cardBelow`), render the card in a `.panel` under the chart instead of a popover; when nothing is selected show *No card drawn.* / *Select a place on the chart to draw its card.*
- **Hit order** on a frame click: pin (its own button) → terrain → realm → nothing. Hovering a realm or terrain in Select mode shows the outline and caption. Terrain hit test (chart units, with `slack = 4 / z`): forest or lake — inside the ellipse with radii `spread + slack` horizontally and `(spread + slack) × 0.8` vertically; mountains — within `14 + slack` of the spine (test at `y + 6`); river — within `8 + slack` of the polyline. Realm — point in polygon (ray cast), last realm in order wins.

### 2.6 The key

A `.scroll` panel beside the chart (not inside it, so it never zooms). Contents, top to bottom: **Hurly** (Cinzel 700, 28px, `letter-spacing .1em`, `#5a1a0a`), the dateline *A political chart · c. 307 AC* (Spectral SC 600 13px), the description in italic 12.5px `#5b4527`, a dotted rule, then the key rows (12.5px `#4a3520`): the five pins drawn as they appear (Capital, City, Port, Fortress, Ruin), a dashed line for *Realm border*, `▲` *Mountain range*, `♣` *Forest*, `≈` *River or lake*. Pushed to the bottom in italic 11.5px: *Capitals and realms are always named. Zoom in for cities and seas, then again for ranges, forests and rivers.* Title, dateline and description come from the chart record.

### 2.7 Several charts

Readers pick a chart with the chips (Hurly first). A chart that is not published is simply absent for readers; the DM sees it with a tag. The prototype shows four more charts as placeholders (The World, Korre, Nova Roma, The Twilight) with the face-down empty state *{Chart} is still face down.* / *The Dungeon Master will turn this chart over when it's ready to be played.* — keep that empty state for a chart with no land drawn yet. Only Hurly is seeded.

---

## 3. Dungeon Master experience

Appears when `useDungeonMaster()` is true, like the Chronicle. Drafts (unpublished places, realms, terrain, charts) show to the DM with a **Draft** tag.

### 3.1 Tool bar (a `.panel` above the chart)

Eyebrow **Dungeon Master**, then tool chips: **Select** · **Add a place** · **Draw a realm** · **Draw a range** · **Plant a forest** · **Draw a river**. While drawing, a gold **Finish the realm / range / river** button (disabled until 3 corners / 2 points) and a ghost **Cancel**. A hint on the right explains the active tool (strings in §8), and counts points placed while drafting.

- **Select**: click selects a place, terrain or realm (hit order above) and opens it in the desk; click empty chart clears the selection. Drag a pin to move the place. A selected realm shows a square handle at every corner; a selected range or river shows a round handle at every point; a selected forest or lake shows a round handle at its heart (move) **and a square handle on its right edge (resize)** — dragging it sets `spread = hypot(dx, dy/0.8)`, clamped 8–80, and the desk's Spread field follows live. Handles are 14px `<button>`s (`#fff2d2` fill, `2px solid #8a1f0d`), counter-scaled, with `aria-label`s like *Corner 3 of Hossari*, *Heart of Ashmire Forest*, *Spread of Ashmire Forest, drag to resize*. The cursor is `grab`/`grabbing` on the frame, `move` on handles, `ew-resize` on the spread handle, `crosshair` with a drawing tool.
- **Add a place**: the next click places a new pin (`New place`, kind city, unpublished) and selects it; the tool returns to Select.
- **Draw a realm / range / river**: each click adds a point (drawn as dots and a dashed path); Finish creates the record (`New realm` with the next tone and the centroid as label position; `New range`; `New river`), selects it, returns to Select.
- **Plant a forest**: one click creates `New forest`, spread 22, selected.
- The caption in the frame's corner names the selected item and, for terrain, says what the handles do.

### 3.2 The desk (below the chart, `id="desk"`, follows `ChronicleDesk`)

Eyebrow **Dungeon Master**, `h2` **Keep the Atlas**, lead *Places carry a lore card. Realms are the political chart; terrain is the land itself. Select anything on the chart to edit it here, and drag its handles to move it.* Then three `.panel`s in a grid (one column below `lg`), each with a form that edits the current selection of its type (or sits disabled, titled "New …", with a hint on how to add one), a gold **Save**, ghost **Done**, `btn-danger` **Delete** at the far end, and a list of rows with an **Edit** button (rows also select on click):

- **Places** (`N on the chart`): Name (`field font-card !text-xl`), Kind (select), On the chart (read-only `x · y · realm`), Lore card (select of lore entries, *— No card yet —* first; load with `listAllLoreForDm`), Published checkbox *(unpublished places show only to Dungeon Masters)*.
- **Realms** (`N on the chart`): Name, Standing *(shown when a reader selects the realm)*, Tint (select: Gold, Violet, Ember, Sky, Umber, Teal → tone 0–5), Corners (read-only `N corners · drag them on the chart`). The list scrolls (`max-height: 300px`).
- **Terrain** (`N on the chart`): Name, Kind (Mountain range, Forest, River, Lake), Spread (number 8–80, enabled for forests and lakes).

A `role="status"` line in `#a8e6c8` confirms saves (*The place was saved.*); errors use `errorMessage()` in the `#ffb3a1` style. Deleting asks `window.confirm` like the Chronicle desk. Add a **Keep the Atlas** link to `/atlas#desk` wherever `dm.tsx` links to the Chronicle desk, and the same scroll-to-`#desk` behaviour the Chronicle route has.

Also change `app/lib/sections.ts`: Atlas `live: true`, remove its `teaser`, so the header's Soon tag disappears; and in `app/routes.ts` route `/atlas` to `routes/atlas.tsx` (the `comingSoon` component can stay for future sections).

---

## 4. Data model (PocketBase migrations, hand-written in `pb_migrations/`)

Mirror the chronicle migration's shape: `IS_DM = '@request.auth.collectionName = "dungeon_masters"'`; public reads published rows, DMs read everything and write — copy the rule strings the `lore` collection uses for `published`. All four collections get `created`/`updated` autodates. Points are JSON arrays of `[x, y]` integer pairs in chart units.

| Collection | Fields |
|---|---|
| `charts` | `name` text required (presentable), `slug` text unique, `dateline` text (e.g. "A political chart · c. 307 AC"), `description` text, `width` number (default 1400), `height` number (default 700), `land` json (array of closed polygons, drawn smoothed), `land_centre` json `[x,y]` (optional; derive from `land` when absent), `compass` json `[x,y]` (optional), `underlay` file image (optional, for later), `published` bool |
| `places` | `chart` relation→charts (cascade delete), `name` text required, `kind` select `capital city port fortress ruin`, `x` number, `y` number, `realm` text (display only; or derive by point-in-polygon at read time), `lore` relation→lore (optional, no cascade: a deleted entry leaves the place cardless), `published` bool |
| `realms` | `chart` relation (cascade), `name` text required, `standing` text max 160, `tone` number 0–5, `label` json `[x,y]` (optional; default centroid), `points` json (≥3 pairs), `lore` relation→lore (optional), `published` bool |
| `features` | `chart` relation (cascade), `name` text required, `kind` select `mountains forest river lake`, `points` json (forest/lake: exactly one pair, the heart; range/river: ≥2), `spread` number 8–80 (forest/lake), `published` bool |

Hooks (`pb_hooks/`, following the existing `onRecordCreate/Update` pattern and the `require(`${__hooks}/phantos/lib.js`)` rule): trim names and standings; unique slug for charts; validate `points` shape per kind and refuse a realm with fewer than 3 corners or a river/range with fewer than 2 points; clamp `spread` to 8–80 and `tone` to 0–5; round coordinates to integers; clamp `x`/`y` to the chart's bounds.

Keep `app/types/atlas.ts` in step: `Chart`, `Place`, `Realm`, `Feature` (+ `…Input` types without `id`), `PlaceKind`, `FeatureKind`.

---

## 5. Seed (`pb_migrations/<ts>_seed_atlas.js`)

`data/hurly-chart.json` holds the Hurly chart as prototyped. Write a run-once migration that creates the chart, then its realms, features and places, embedding the JSON in the migration file (the repository's seeds embed their data; the lore seed is the exception because it reads documents). Resolve each place's `lore_slug` to a `lore` id by slug (as the pantheon-linking migration does); leave the relation empty if the slug is not found. The `seas` array is static chart furniture — render it from the chart record or hard-code it for Hurly; the `lore_referenced` list is only for checking that the slugs exist.

Honesty notes for the DM, worth a comment in the migration: realm borders are Voronoi cells fitted to a traced coastline, not the hand-drawn lines; place positions follow descriptions in the lore (Nova Roma on the River of Fate in the Papal State, Keralu as Lakose's capital, Marshentide in Alachua, Vael-Thamor beneath Hossari, Outpost Z-73 in Monteforte's highlands, Iverness a day from the River of Fate's coast) and are meant to be dragged into place. *Port Yvander's Embrace* is seeded unpublished as the example draft. "Utrecht" follows the lore document, not the map's "Uterect".

---

## 6. Front end

### Files

- `app/routes/atlas.tsx` — the page (head, chart chips, layer chips, key + chart, lists, desk). Pattern: `routes/chronicle.tsx` (data loading with `Promise.all`, reload on DM sign-in, `#desk` scroll).
- `app/components/AtlasChart.tsx` — the frame: SVG, overlays, pointer handling, pan/zoom state, hit-testing, popover. Props: `chart`, `places`, `realms`, `features`, `mode: 'reader' | 'dm'`, `tool`, `selection`, `onSelect`, `onChange(kind, record)` for drags, `onPlaceAt(x, y)` and `onDraftPoint(x, y)` for the drawing tools, `initialZoom`, `cardBelow`, `layers`.
- `app/components/AtlasKey.tsx` — the key panel.
- `app/components/AtlasDesk.tsx` — the three forms + lists; pattern: `ChronicleDesk.tsx` (`RowActions`, `Message`, busy/error state, `errorMessage`).
- `app/lib/atlas.ts` — pure helpers, unit-tested in `testing/atlas.test.ts`: `smoothPath(points, closed)` (Catmull-Rom → cubic Béziers, tension 1/6), `polygonPath`, `pointInPolygon`, `distanceToSegment`, `mountainPath(spine)`, `forestPath(cx, cy, spread)`, `lakePath(cx, cy, spread)`, `ringPath` (selection ring for round features), `hitTerrain(x, y, features, z)`, `hitRealm(x, y, realms)`, `labelSize(realm)`, `nameTier(z)`, the view maths (`zoomAbout`, `pointerToChart`, `chartToFrame`, `initialView`), and `TONES`. All exist in `prototype/Chart.dc.html` as plain functions — port them as they are.
- `app/app.css` — `.atlas-pin`, `.atlas-handle`, `.atlas-chip`, `.atlas-row` hover/focus rules (reduced motion: no transitions). Reuse `.btn`, `.btn-gold`, `.btn-ghost`, `.btn-danger`, `.tl-zoom`, `.field`, `.field-label`, `.panel`, `.scroll`, `.eyebrow`, `.gold-text`, `.frame-swatch`, `.skeleton`.

### Drawing the terrain (from the prototype)

- **Mountains**: walk the spine; one peak every 16 units; peak `k` is offset `+4` in y when `k` is odd, height 15 when `k % 3 === 1` else 11, half-width 8: `M x−8,y L x,y−h L x+8,y Z` plus a shading stroke `M x,y−h L x+3.6,y−0.1h`.
- **Forest**: `n = max(5, round(spread² / 55))` trees on a sunflower spiral (angle `i × 2.39996`, radius `spread × √((i+0.5)/n)`, y squashed × 0.8), sorted by y so nearer trees overdraw farther ones; each tree a circle of radius `4.5 + (i % 3)` with a 3-unit trunk below.
- **Lake**: nine points on an ellipse (vertical × 0.62) with a three-lobed wobble `1 + 0.18·sin(3a + 1)`, smoothed closed; plus two short wave strokes inside.
- **River** and **coast**: `smoothPath` through the points (coast closed; the Isle of Bliss is a second closed sub-path).
- **Terrain name placement**: ranges 14 units above the first spine point; forests `spread + 7` below the heart; lakes `spread × 0.62 + 8` below; rivers 8 above the middle point.

### Loading and errors

Skeleton of the frame's shape while loading (`.skeleton`, `rounded-xl`); on failure a centred `.panel` with *The chart could not be reached. Please try again in a moment.*

---

## 7. API (`app/backend/api.ts`)

```
listCharts(): Chart[]                 // readers: published only; sorted by name (Hurly first by sort field or slug)
getChartBySlug(slug): Chart
listPlaces(chartId): Place[]          // expand lore → LoreSummary for the card
listRealms(chartId): Realm[]
listFeatures(chartId): Feature[]
savePlace(data: PlaceInput, id?): Place     // and deletePlace(id)
saveRealm(data: RealmInput, id?): Realm     // and deleteRealm(id)
saveFeature(data: FeatureInput, id?): Feature // and deleteFeature(id)
saveChart(data: ChartInput, id?): Chart     // optional in this pass; needed for new charts
```

Drafts come back for DMs automatically through the collection rules, as with lore. Dragging in the DM chart should update local state immediately and persist on pointer-up (one `save…` call per drag), not on every move.

---

## 8. Copy

Page: **Charts of the Known World** · **Atlas** · lead as in §2.1 · **Show** · **Realms / Terrain / Places** · zoom buttons' `aria-label`s **Zoom in**, **Zoom out**, **Whole chart**.

Chart: *{Chart} is still face down.* / *The Dungeon Master will turn this chart over when it's ready to be played.* · caption kickers **Realm** / **Terrain** · *No standing recorded* · *This card has no text yet.* · *No card drawn.* / *Select a place on the chart to draw its card. Pinch or use the buttons to zoom.*

Lists: **Places on this chart** `N · each draws a card` · **Realms of Hurly** `N · as of c. 307 AC` · *No card yet*.

Key: see §2.6.

DM tools and hints:
- Select — *Select a place, a realm or terrain on the chart to edit it below. Drag a place, or a selected item's handles, to move it. Scroll or pinch to zoom.*
- Add a place — *Click the chart where the place stands. It opens in the Places form.*
- Draw a realm — *Click the chart corner by corner, then finish the realm.*
- Draw a range — *Click along the spine of the range, peak by peak, then finish.*
- Plant a forest — *Click the chart at the heart of the forest.*
- Draw a river — *Click along the river from source to mouth, then finish.*
- While drafting: *{N} point(s) placed.* prefixed to the hint. Buttons **Finish the realm / Finish the range / Finish the river**, **Cancel**.
- Caption for selected terrain: *Forest · drag the heart to move it, the edge to resize* / *Mountain range · drag the handles to move it*.

Desk: **Dungeon Master** · **Keep the Atlas** · lead as in §3.2 · panel intros: Places — *A point on the chart that draws a lore card. Choose "Add a place" and click the chart to add one.*; Realms — *The political chart. Choose "Draw a realm" and click its corners; drag a corner on the chart to move a border.*; Terrain — *Ranges, forests, rivers and lakes. Select one on the chart, then drag its handles: a forest or lake moves by its heart and resizes by its edge. Draw a new range or river along its line, or plant a forest at its heart.* · field labels **Name / Kind / On the chart / Lore card (the card this place draws) / Published (unpublished places show only to Dungeon Masters) / Standing (shown when a reader selects the realm) / Tint / Corners / Spread (forests and lakes)** · placeholders *e.g. Heraklion, Keralu* · *e.g. Hossari* · *e.g. Queendom of Hossari, Twilight Stewardship Zone* · *e.g. Ashmire Forest, River of Fate* · statuses *The place was saved. / The realm was saved. / The terrain was saved. / Removed from the chart.* · errors *The place could not be saved.* etc. · new-record names **New place / New realm / New range / New river / New forest**.

No emoji, no exclamation marks; one ellipsis character for work in progress; a middle dot between facts.

---

## 9. Verification

Automated: `npm test` (new `testing/atlas.test.ts` covering `pointInPolygon`, `distanceToSegment`, `hitTerrain` on the seeded features, `nameTier`, `zoomAbout` keeping the anchor fixed, `pointerToChart`/`chartToFrame` round-tripping, and that `smoothPath`/`forestPath`/`mountainPath` return non-empty paths), `npm run typecheck`, `npm run build`.

Manual, against local PocketBase, at desktop and phone widths:

1. `/atlas` loads Hurly with realms tinted, terrain drawn, 7 published pins; the key's bottom edge lines up with the chart's.
2. At the opening view only realm names and the three capitals are named; zooming past 1.5× brings in the other place names and sea names; past 2.2× the terrain names; names and pins keep their size while the land grows; borders don't thicken.
3. Wheel zooms about the cursor without scrolling the page; pinch zooms on touch; `+`/`−`/`⌂` work; drag pans.
4. Hover a pin → card popover beside it, inside the frame, on the correct side; click pins it; keyboard focus on a pin shows it too; the card links to the lore entry. Hover/click a realm → outline and caption with its standing; a forest/river/range → outline and caption.
5. The two lists select on the chart; the Places list links to lore.
6. Signed in as DM: the Draft place shows with its tag; every tool works as in §3.1 (add a place, draw and finish a realm, a range, a river, plant a forest, move pins, drag corners/points/hearts, resize a forest by its edge); the desk forms reflect the selection and Save/Delete persist and redraw; reloading keeps the changes.
7. Phone: chart square, key beneath it, card under the chart, lists stacked.
8. Header shows Atlas as live (no Soon tag); the DM desk page links to Keep the Atlas.

---

## 10. Later, not in this pass

- A realm's borders carrying a year range so the political layer can be read "as of c. 300 AC" vs "c. 307 AC" (both surveys exist in the lore).
- Uploading a hand-drawn chart as an `underlay` image under the vector layers, with an opacity control, and a **Draw the land** tool for the coastline.
- More charts (The World, Korre, Nova Roma, The Twilight) — the schema supports them; only Hurly is seeded.
- Lore entries pointing back to places (a "Where" line on an entry page) — the relation lives on `places`, like `lore.pantheon`.

---

## 11. Reading the prototype

`prototype/Chart.dc.html` is a self-contained component in a declarative HTML dialect: the markup uses `{{holes}}` bound to the return value of `renderVals()`, `<sc-for>` loops and `<sc-if>` branches, `onPointerDown="{{handler}}"`-style event bindings, and `<x-import component-from-global-scope="Phantos.LoreCard">` to mount the site's real `LoreCard`. Treat the markup as a wireframe of the DOM and the `<script>` as the reference implementation:

- Data constants (`COAST`, `BLISS`, `REALMS`, `FEATURES`, `PLACES`, `LORE`, `KINDS`, `FEATURE_KINDS`, `TOOLS`) — the same content as `data/hurly-chart.json`.
- Pure helpers: `smoothPath`, `polyPath`, `inside`, `distToSegment`, `mountainPath`, `forestPath`, `lakePath`, `ringPath`.
- `class Component`: `view()`, `toMap()`, `realmAt()`, `featureAt()`, `hitAt()`, `zoomAt()`, `setZoom()`, `onWheel()`, `onFrameDown/Move/Up/Leave()` (pointer, pan, pinch, drag of pins/corners/points/hearts and the `resize` drag), `finishDraft()`, `select()`, the save/delete methods, and `renderVals()`, which computes everything the view needs: tone paths, borders, terrain paths, counter-scale factors (`inv`, `labelScale`, the `sw()` stroke widths), name tiers, pins, handles, popover placement, the caption, list rows and form state.

Prototype-only things not to port literally: the `data-props` tweak block, the `embedded`/`narrow`/`frameAspect` props (the real page knows its own layout), the four placeholder charts, and the Google Fonts `<link>` (the app already loads its fonts).
