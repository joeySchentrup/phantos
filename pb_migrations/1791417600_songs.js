/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Songs: the campaign's music, each an MP3 with its lyrics.
 *
 * - songs: `audio` is the MP3 the site plays; `lyrics` are plain text, line
 *   breaks kept. `duration` is in whole seconds, measured by the DM's browser
 *   when the file is chosen (0 when not known), so the list can show running
 *   times without downloading every song. The order songs were posted in is
 *   the order they play in. Readable by anyone once published; DMs see drafts
 *   and are the only ones who write.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

migrate(
  (app) => {
    const songs = new Collection({
      type: 'base',
      name: 'songs',
      listRule: 'published = true || ' + IS_DM,
      viewRule: 'published = true || ' + IS_DM,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'title', type: 'text', required: true, max: 200, presentable: true },
        { name: 'slug', type: 'text', max: 200, pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$' },
        { name: 'credit', type: 'text', max: 200 },
        {
          name: 'audio',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 50 * 1024 * 1024,
          mimeTypes: ['audio/mpeg'],
        },
        { name: 'duration', type: 'number', min: 0, onlyInt: true },
        { name: 'lyrics', type: 'text', max: 100000 },
        { name: 'published', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_songs_slug ON songs (slug) WHERE slug != ""',
        'CREATE INDEX idx_songs_created ON songs (created)',
      ],
    });
    app.save(songs);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('songs'));
    } catch (err) {
      // already gone
    }
  }
);
