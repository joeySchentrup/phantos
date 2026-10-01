/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Schema for the Chronicle: the timeline of Phanatos.
 *
 * Years are whole numbers on the Hurlen count: negative for BC, positive for
 * AC (the Age of Concord, counted from the Treaty of Heraklion). There is no
 * year zero, so 0 always means "not set".
 *
 * - lore gains `year` and `circa`: the in-universe date that places an entry
 *   on the timeline. Undated lore (year 0) stays off it.
 * - eras: named spans drawn as bands across the timeline. A start of 0 means
 *   "since the beginning"; an end of 0 means "still going".
 * - timeline_points: short notes pinned to a year. Anything longer than 255
 *   characters belongs in lore.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';
const YEAR = { type: 'number', onlyInt: true, min: -100000, max: 100000 };

migrate(
  (app) => {
    const lore = app.findCollectionByNameOrId('lore');
    lore.fields.add(new NumberField({ name: 'year', ...YEAR }));
    lore.fields.add(new BoolField({ name: 'circa' }));
    app.save(lore);

    const eras = new Collection({
      type: 'base',
      name: 'eras',
      listRule: '',
      viewRule: '',
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'name', type: 'text', required: true, max: 80, presentable: true },
        { name: 'start_year', ...YEAR },
        { name: 'end_year', ...YEAR },
        { name: 'circa', type: 'bool' },
        { name: 'description', type: 'text', max: 255 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(eras);

    const points = new Collection({
      type: 'base',
      name: 'timeline_points',
      listRule: '',
      viewRule: '',
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'text', type: 'text', required: true, max: 255, presentable: true },
        // Required on a number field means non-zero: every point has a year.
        { name: 'year', required: true, ...YEAR },
        { name: 'circa', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_timeline_points_year ON timeline_points (year)'],
    });
    app.save(points);
  },
  (app) => {
    for (const name of ['timeline_points', 'eras']) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (err) {
        // already gone
      }
    }

    const lore = app.findCollectionByNameOrId('lore');
    lore.fields.removeByName('year');
    lore.fields.removeByName('circa');
    app.save(lore);
  }
);
