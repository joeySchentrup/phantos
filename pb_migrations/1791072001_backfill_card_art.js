/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Makes card art for every image that was uploaded before card art existed,
 * so the lists are fast as soon as this version starts — no one has to do
 * anything.
 *
 * PocketBase's own resizer does the work: a 720×720 centre crop, which is
 * exactly what the card's square picture box shows. It keeps the original's
 * format (and turns WebP into PNG), so a JPEG becomes a small JPEG but a PNG
 * stays a PNG. The DM desk re-encodes anything that isn't WebP the next time
 * a Dungeon Master opens it.
 *
 * An image that can't be read is skipped (its cards fall back to a thumbnail)
 * rather than stopping the upgrade.
 */

const IMAGE_FIELDS = { lore: 'cover', pantheon: 'image', heroes: 'portrait' };
const SIZE = '720x720';

migrate((app) => {
  const files = app.newFilesystem();
  // Copies are only read when their record is saved, so they're removed at the end.
  const temporary = [];

  try {
    for (const name in IMAGE_FIELDS) {
      const field = IMAGE_FIELDS[name];
      const records = app.findRecordsByFilter(name, field + " != '' && card_art = ''", '', 0, 0);

      for (let i = 0; i < records.length; i++) {
        const record = records[i];
        const original = record.getString(field);
        const extension = (original.split('.').pop() || 'png').toLowerCase();
        const base = record.baseFilesPath();
        const copy = base + '/card-art-' + record.id + '.' + (extension === 'webp' ? 'png' : extension);

        try {
          files.createThumb(base + '/' + original, copy, SIZE);
          temporary.push(copy);
          record.set('card_art', files.getReuploadableFile(copy, false));
          app.save(record);
        } catch (err) {
          app.logger().warn('Could not make card art', 'collection', name, 'id', record.id, 'error', String(err));
        }
      }
    }
  } finally {
    for (let i = 0; i < temporary.length; i++) {
      try {
        files.delete(temporary[i]);
      } catch (err) {
        // already gone
      }
    }
    files.close();
  }
});
