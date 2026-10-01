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

// ---------------------------------------------------------------------------
// GET /api/phantos/featured-image — is generation configured, default prompt
// ---------------------------------------------------------------------------

routerAdd(
  'GET',
  '/api/phantos/featured-image',
  (e) => {
    const lib = require(`${__hooks}/phantos/lib.js`);
    const cfg = lib.config();

    return e.json(200, {
      configured: !!cfg.apiKey,
      model: cfg.model,
      defaultPrompt: lib.DEFAULT_PROMPT,
    });
  },
  $apis.requireAuth('dungeon_masters')
);

// ---------------------------------------------------------------------------
// POST /api/phantos/featured-image — render a new featured image
// ---------------------------------------------------------------------------

routerAdd(
  'POST',
  '/api/phantos/featured-image',
  (e) => {
    const lib = require(`${__hooks}/phantos/lib.js`);

    let prompt = '';
    try {
      const body = e.requestInfo().body;
      if (body && body.prompt) prompt = String(body.prompt).trim();
    } catch (err) {
      // fall through to the default
    }
    if (!prompt) prompt = lib.DEFAULT_PROMPT;
    if (prompt.length > 8000) {
      return e.json(400, { message: 'The prompt must be 8000 characters or fewer.' });
    }

    if (!lib.config().apiKey) {
      return e.json(503, {
        message: 'Image generation is not configured on this server. Set OPENAI_API_KEY.',
      });
    }

    try {
      const record = lib.generateFeaturedImage(prompt);
      return e.json(200, {
        id: record.id,
        collectionId: record.collection().id,
        collectionName: 'featured_images',
        image: record.getString('image'),
        prompt: record.getString('prompt'),
        model: record.getString('model'),
        created: record.getString('created'),
      });
    } catch (err) {
      $app.logger().error('Featured image generation failed', 'error', String(err));
      return e.json(502, { message: String(err).replace(/^Error:\s*/, '') });
    }
  },
  $apis.requireAuth('dungeon_masters')
);
