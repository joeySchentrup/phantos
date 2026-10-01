/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Schema for the Phantos lore archive.
 *
 * - dungeon_masters: the only accounts that can write. There is no public
 *   sign-up; DMs are created from the admin UI (/_/) or via DM_EMAIL and
 *   DM_PASSWORD (see pb_hooks/phantos.pb.js).
 * - lore: every lore document. Readable by anyone once published.
 * - featured_images: hero images the DM uploads. The newest one is shown.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

migrate(
  (app) => {
    const dms = new Collection({
      type: 'auth',
      name: 'dungeon_masters',
      listRule: 'id = @request.auth.id',
      viewRule: 'id = @request.auth.id',
      createRule: null,
      updateRule: 'id = @request.auth.id',
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', max: 100 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    });
    app.save(dms);

    const lore = new Collection({
      type: 'base',
      name: 'lore',
      listRule: 'published = true || ' + IS_DM,
      viewRule: 'published = true || ' + IS_DM,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'title', type: 'text', required: true, max: 300, presentable: true },
        { name: 'slug', type: 'text', max: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        {
          name: 'category',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['tale', 'chronicle', 'myth', 'dispatch', 'codex', 'dragon', 'map'],
        },
        {
          name: 'attribute',
          type: 'select',
          required: true,
          maxSelect: 1,
          values: ['light', 'dark', 'fire', 'ice', 'earth', 'arcane', 'divine'],
        },
        { name: 'author', type: 'text', max: 200 },
        { name: 'summary', type: 'text', max: 600 },
        // The longest seeded document is ~300 KB, so leave plenty of room —
        // PocketBase caps text fields at 5000 characters unless told otherwise.
        { name: 'content', type: 'text', max: 5000000 },
        {
          name: 'cover',
          type: 'file',
          maxSelect: 1,
          maxSize: 25 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          thumbs: ['480x0', '1600x0'],
        },
        { name: 'word_count', type: 'number', min: 0, onlyInt: true },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_lore_slug ON lore (slug) WHERE slug != ""',
        'CREATE INDEX idx_lore_created ON lore (created)',
      ],
    });
    app.save(lore);

    const featured = new Collection({
      type: 'base',
      name: 'featured_images',
      listRule: '',
      viewRule: '',
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        {
          name: 'image',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 25 * 1024 * 1024,
          mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
          thumbs: ['960x0', '1600x0'],
        },
        { name: 'caption', type: 'text', max: 600 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_featured_created ON featured_images (created)'],
    });
    app.save(featured);
  },
  (app) => {
    for (const name of ['featured_images', 'lore', 'dungeon_masters']) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (err) {
        // already gone
      }
    }
  }
);
