/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Schema for the Pantheon: the powers of Phanatos, one card each.
 *
 * - pantheon: a member of the pantheon. `rank` is the card frame (as category
 *   is for lore) and `attributes` holds one element, or the two a Greater
 *   Dragon is born of. Readable by anyone once published; DMs see drafts.
 * - lore gains `pantheon`: the members an entry refers to. The member's page
 *   lists the lore that points at it, so the link is only stored here.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

migrate(
  (app) => {
    const pantheon = new Collection({
      type: 'base',
      name: 'pantheon',
      listRule: 'published = true || ' + IS_DM,
      viewRule: 'published = true || ' + IS_DM,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        { name: 'slug', type: 'text', max: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        {
          name: 'rank',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['creator', 'primal', 'twin', 'greater', 'other'],
        },
        {
          name: 'attributes',
          type: 'select',
          required: true,
          maxSelect: 2,
          values: ['light', 'dark', 'fire', 'ice', 'earth', 'arcane', 'divine'],
        },
        { name: 'domain', type: 'text', max: 80 },
        { name: 'summary', type: 'text', max: 600 },
        { name: 'content', type: 'text', max: 5000000 },
        {
          name: 'image',
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
      indexes: ['CREATE UNIQUE INDEX idx_pantheon_slug ON pantheon (slug) WHERE slug != ""'],
    });
    app.save(pantheon);

    const lore = app.findCollectionByNameOrId('lore');
    lore.fields.add(
      new RelationField({ name: 'pantheon', collectionId: pantheon.id, maxSelect: 999, cascadeDelete: false })
    );
    app.save(lore);
  },
  (app) => {
    const lore = app.findCollectionByNameOrId('lore');
    lore.fields.removeByName('pantheon');
    app.save(lore);

    try {
      app.delete(app.findCollectionByNameOrId('pantheon'));
    } catch (err) {
      // already gone
    }
  }
);
