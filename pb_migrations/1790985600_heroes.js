/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Schema for the Heroes: the party's characters, one card each.
 *
 * - heroes: who a character is — species, class, background, faith and the
 *   rest of their identity, plus a markdown backstory and a portrait. Stats
 *   (level included) and inventory are deliberately left to the character
 *   sheet. Readable by anyone once published; DMs see drafts.
 * - hero_updates: the running list beneath a hero's backstory. Short markdown
 *   notes, newest first; they go when their hero does.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

migrate(
  (app) => {
    const heroes = new Collection({
      type: 'base',
      name: 'heroes',
      listRule: 'published = true || ' + IS_DM,
      viewRule: 'published = true || ' + IS_DM,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        { name: 'slug', type: 'text', max: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        { name: 'player', type: 'text', max: 120 },
        { name: 'species', type: 'text', max: 80 },
        { name: 'class', type: 'text', max: 80 },
        { name: 'subclass', type: 'text', max: 80 },
        { name: 'background', type: 'text', max: 80 },
        { name: 'alignment', type: 'text', max: 40 },
        { name: 'faith', type: 'text', max: 80 },
        {
          name: 'attribute',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['light', 'dark', 'fire', 'ice', 'earth', 'arcane', 'divine'],
        },
        { name: 'summary', type: 'text', max: 600 },
        { name: 'backstory', type: 'text', max: 1000000 },
        {
          name: 'portrait',
          type: 'file',
          maxSelect: 1,
          maxSize: 25 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          thumbs: ['100x100', '480x0', '1600x0'],
        },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE UNIQUE INDEX idx_heroes_slug ON heroes (slug) WHERE slug != ""'],
    });
    app.save(heroes);

    const updates = new Collection({
      type: 'base',
      name: 'hero_updates',
      listRule: 'hero.published = true || ' + IS_DM,
      viewRule: 'hero.published = true || ' + IS_DM,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'hero', type: 'relation', required: true, collectionId: heroes.id, maxSelect: 1, cascadeDelete: true },
        { name: 'title', type: 'text', max: 120 },
        { name: 'body', type: 'text', required: true, max: 4000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_hero_updates_hero ON hero_updates (hero, created)'],
    });
    app.save(updates);
  },
  (app) => {
    for (const name of ['hero_updates', 'heroes']) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (err) {
        // already gone
      }
    }
  }
);
