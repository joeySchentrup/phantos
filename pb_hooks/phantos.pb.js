/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Phantos archive — hook and route registration.
 *
 * PocketBase runs every handler below in its own isolated runtime, so each one
 * must require() the shared module rather than closing over anything here.
 * See ./phantos/lib.js for the implementation.
 */

// ---------------------------------------------------------------------------
// Keep slug, word count and summary in step with the document
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareLore(e.app, e.record);
  e.next();
}, 'lore');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareLore(e.app, e.record);
  e.next();
}, 'lore');

// ---------------------------------------------------------------------------
// Create the Dungeon Master from DM_EMAIL / DM_PASSWORD on first start
// ---------------------------------------------------------------------------

onBootstrap((e) => {
  e.next();

  try {
    require(`${__hooks}/phantos/lib.js`).ensureDungeonMaster(e.app);
  } catch (err) {
    $app.logger().error('Could not create the Dungeon Master account', 'error', String(err));
  }
});

// ---------------------------------------------------------------------------
// GET /api/phantos/search?q=&category= — ranked full-text search with snippets
// ---------------------------------------------------------------------------

routerAdd('GET', '/api/phantos/search', (e) => {
  const lib = require(`${__hooks}/phantos/lib.js`);
  const query = e.request.url.query();

  const result = lib.search(
    query.get('q'),
    query.get('category'),
    lib.isDungeonMaster(e.auth),
    Math.min(Math.max(parseInt(query.get('limit'), 10) || 50, 1), 100)
  );

  return e.json(200, result);
});

