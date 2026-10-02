/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Schema for the Atlas: the charts of the known world.
 *
 * Everything on a chart is placed in chart units: whole numbers from 0 to the
 * chart's `width` and `height`. A point is a pair, `[x, y]`.
 *
 * - charts: one sheet each. `land` is its coastlines (a list of closed
 *   polygons, drawn smoothed); a chart with no land yet is face down. `seas`
 *   are the names written across the water: `{ name, x, y, size }`, where size
 *   is "large" or "small". `underlay` is kept for a hand-drawn chart to trace.
 * - places: points that draw a lore card. A place whose entry is deleted
 *   keeps its pin and loses its card. `realm` is the realm it is said to
 *   stand in, for display; the site fills it in when a DM sets a place down.
 * - realms: the political chart. `points` are the corners (three at least),
 *   `tone` picks one of six tints, and `label` is where the name is written
 *   (the middle of the corners when empty).
 * - features: the terrain. A forest or lake is one point, its heart, and a
 *   `spread`; a mountain range or river is a line of two points or more.
 *
 * Anyone can read what is published on a published chart; DMs see drafts and
 * are the only ones who write. pb_hooks tidies and checks the geometry.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';
const ON_A_PUBLISHED_CHART = '(published = true && chart.published = true) || ' + IS_DM;

const POINT = { type: 'json', maxSize: 200 };
const POINTS = { type: 'json', maxSize: 200000 };

migrate(
  (app) => {
    const lore = app.findCollectionByNameOrId('lore');

    const charts = new Collection({
      type: 'base',
      name: 'charts',
      listRule: 'published = true || ' + IS_DM,
      viewRule: 'published = true || ' + IS_DM,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'name', type: 'text', required: true, max: 80, presentable: true },
        { name: 'slug', type: 'text', max: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        { name: 'dateline', type: 'text', max: 120 },
        { name: 'description', type: 'text', max: 400 },
        { name: 'width', type: 'number', onlyInt: true, min: 100, max: 10000 },
        { name: 'height', type: 'number', onlyInt: true, min: 100, max: 10000 },
        { name: 'land', ...POINTS },
        { name: 'land_centre', ...POINT },
        { name: 'compass', ...POINT },
        { name: 'seas', type: 'json', maxSize: 20000 },
        {
          name: 'underlay',
          type: 'file',
          maxSelect: 1,
          maxSize: 25 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
          thumbs: ['1600x0'],
        },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_charts_slug ON charts (slug) WHERE slug != ""'],
    });
    app.save(charts);

    const onChart = { name: 'chart', type: 'relation', required: true, collectionId: charts.id, maxSelect: 1, cascadeDelete: true };
    const rules = {
      listRule: ON_A_PUBLISHED_CHART,
      viewRule: ON_A_PUBLISHED_CHART,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
    };

    const places = new Collection({
      type: 'base',
      name: 'places',
      ...rules,
      fields: [
        onChart,
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        {
          name: 'kind',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['capital', 'city', 'port', 'fortress', 'ruin'],
        },
        { name: 'x', type: 'number', onlyInt: true, min: 0 },
        { name: 'y', type: 'number', onlyInt: true, min: 0 },
        // The realm the place is said to stand in. Words for the card, not geometry.
        { name: 'realm', type: 'text', max: 120 },
        { name: 'lore', type: 'relation', collectionId: lore.id, maxSelect: 1, cascadeDelete: false },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_places_chart ON places (chart)'],
    });
    app.save(places);

    const realms = new Collection({
      type: 'base',
      name: 'realms',
      ...rules,
      fields: [
        onChart,
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        { name: 'standing', type: 'text', max: 160 },
        { name: 'tone', type: 'number', onlyInt: true, min: 0, max: 5 },
        { name: 'label', ...POINT },
        { name: 'points', ...POINTS },
        { name: 'lore', type: 'relation', collectionId: lore.id, maxSelect: 1, cascadeDelete: false },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_realms_chart ON realms (chart)'],
    });
    app.save(realms);

    const features = new Collection({
      type: 'base',
      name: 'features',
      ...rules,
      fields: [
        onChart,
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        {
          name: 'kind',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['mountains', 'forest', 'river', 'lake'],
        },
        { name: 'points', ...POINTS },
        // 8–80 for a forest or lake; a range or river has none, so 0.
        { name: 'spread', type: 'number', onlyInt: true, min: 0, max: 80 },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_features_chart ON features (chart)'],
    });
    app.save(features);
  },
  (app) => {
    for (const name of ['features', 'realms', 'places', 'charts']) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (err) {
        // already gone
      }
    }
  }
);
