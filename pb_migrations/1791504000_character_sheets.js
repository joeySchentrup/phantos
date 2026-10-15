/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Character sheets: each hero's 5e sheet, one a hero. Unlike the hero, a
 * sheet is never public: only the Dungeon Masters and the hero's approved
 * player can read it or change it.
 *
 * - The build (level, abilities, hit points, skills, features, spells, the
 *   level log) changes only by taking a level. The DM calls a hero to a
 *   level with `target_level`; the player takes each level in the wizard. A
 *   hook keeps a player's own edits to the day-to-day fields otherwise.
 * - The day-to-day fields (current hit points, slots and uses spent, gear,
 *   money, notes) change freely at the table.
 * - Only DMs draw up a sheet, delete one, or say whose it is.
 *
 * Positions inside json fields are whole numbers throughout, so the hook can
 * compare them as text.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

/** An approved player whose hero is `heroField`. */
function plays(heroField) {
  return (
    '(@request.auth.collectionName = "players" && @request.auth.approved = true && @request.auth.hero != "" && @request.auth.hero = ' +
    heroField +
    ')'
  );
}

const json = (name, maxSize) => ({ name: name, type: 'json', maxSize: maxSize });
const whole = (name, min, max) => ({ name: name, type: 'number', onlyInt: true, min: min, max: max });

migrate(
  (app) => {
    const heroes = app.findCollectionByNameOrId('heroes');

    const sheets = new Collection({
      type: 'base',
      name: 'character_sheets',
      listRule: IS_DM + ' || ' + plays('hero'),
      viewRule: IS_DM + ' || ' + plays('hero'),
      createRule: IS_DM,
      updateRule: IS_DM + ' || ' + plays('hero'),
      deleteRule: IS_DM,
      fields: [
        { name: 'hero', type: 'relation', required: true, collectionId: heroes.id, maxSelect: 1, cascadeDelete: true },

        // The build
        { name: 'level', type: 'number', required: true, onlyInt: true, min: 1, max: 20 },
        whole('target_level', 0, 20),
        { name: 'class', type: 'text', max: 40 },
        { name: 'subclass', type: 'text', max: 40 },
        { name: 'species', type: 'text', max: 80 },
        whole('max_hp', 1, 999),
        json('abilities', 200),
        json('saves', 100),
        json('skills', 1000),
        json('proficiencies', 4000),
        json('defenses', 1000),
        json('features', 60000),
        json('feats', 10000),
        json('spellcasting', 20000),
        json('level_log', 60000),

        // Day to day
        whole('current_hp', 0, 999),
        whole('temp_hp', 0, 999),
        whole('hit_dice_used', 0, 20),
        whole('ac', 0, 40),
        { name: 'inspiration', type: 'bool' },
        json('uses_spent', 2000),
        json('slots_used', 200),
        json('spells_prepared', 4000),
        json('attacks', 10000),
        json('money', 200),
        json('death_saves', 100),
        { name: 'equipment', type: 'text', max: 20000 },
        { name: 'conditions', type: 'text', max: 400 },
        { name: 'notes', type: 'text', max: 20000 },

        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_character_sheets_hero ON character_sheets (hero)'],
    });
    app.save(sheets);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('character_sheets'));
    } catch (err) {
      // already gone
    }
  }
);
