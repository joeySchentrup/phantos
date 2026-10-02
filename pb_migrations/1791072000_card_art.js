/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Card art: a small, square copy of a record's image, made for the cards.
 *
 * The originals stay as they are for the full pages. Cards are drawn about
 * 300px wide, so loading even PocketBase's thumbnails of a large photo (and a
 * PNG's thumbnails are PNGs, often bigger than the original) made the lists
 * slow. `card_art` holds a 720×720 copy instead — WebP when it is made in the
 * DM's browser — and the cards load that.
 *
 * Kept in step by pb_hooks (a new image without a new copy drops the old
 * copy), filled for existing images by the next migration, and topped up from
 * the DM desk.
 */

const IMAGE_FIELDS = { lore: 'cover', pantheon: 'image', heroes: 'portrait' };

migrate(
  (app) => {
    for (const name in IMAGE_FIELDS) {
      const collection = app.findCollectionByNameOrId(name);
      collection.fields.add(
        new FileField({
          name: 'card_art',
          maxSelect: 1,
          maxSize: 5 * 1024 * 1024,
          mimeTypes: ['image/webp', 'image/jpeg', 'image/png'],
        })
      );
      app.save(collection);
    }
  },
  (app) => {
    for (const name in IMAGE_FIELDS) {
      const collection = app.findCollectionByNameOrId(name);
      collection.fields.removeByName('card_art');
      app.save(collection);
    }
  }
);
