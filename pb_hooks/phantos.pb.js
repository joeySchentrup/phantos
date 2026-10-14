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
// Pantheon: the same slug and card-text upkeep as lore
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePantheon(e.app, e.record);
  e.next();
}, 'pantheon');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePantheon(e.app, e.record);
  e.next();
}, 'pantheon');

// ---------------------------------------------------------------------------
// Heroes: slug and card text like the pantheon; updates are tidied markdown
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareHero(e.app, e.record);
  e.next();
}, 'heroes');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareHero(e.app, e.record);
  e.next();
}, 'heroes');

// The rules let an approved player update their own hero; this keeps them to the backstory.
onRecordUpdateRequest((e) => {
  const lib = require(`${__hooks}/phantos/lib.js`);
  if (lib.isPlayer(e.auth)) lib.keepPlayerToBackstory(e.record);
  e.next();
}, 'heroes');

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareHeroUpdate(e.record);
  e.next();
}, 'hero_updates');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareHeroUpdate(e.record);
  e.next();
}, 'hero_updates');

// ---------------------------------------------------------------------------
// Players: anyone can ask to join; a DM approves them, one player a hero
// ---------------------------------------------------------------------------

onRecordCreateRequest((e) => {
  const lib = require(`${__hooks}/phantos/lib.js`);
  if (!e.hasSuperuserAuth() && !lib.isDungeonMaster(e.auth)) lib.prepareSignUp(e.app, e.record);
  e.next();
}, 'players');

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePlayer(e.app, e.record);
  e.next();
}, 'players');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePlayer(e.app, e.record);
  e.next();
}, 'players');

// ---------------------------------------------------------------------------
// Electrum: accounts and shop items keep tidy names
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareElectrumAccount(e.record);
  e.next();
}, 'electrum_accounts');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareElectrumAccount(e.record);
  e.next();
}, 'electrum_accounts');

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareShopItem(e.record);
  e.next();
}, 'electrum_shop');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareShopItem(e.record);
  e.next();
}, 'electrum_shop');

// ---------------------------------------------------------------------------
// Chronicle: eras run forwards, points are a single line
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareEra(e.record);
  e.next();
}, 'eras');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareEra(e.record);
  e.next();
}, 'eras');

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePoint(e.record);
  e.next();
}, 'timeline_points');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePoint(e.record);
  e.next();
}, 'timeline_points');

// ---------------------------------------------------------------------------
// Atlas: charts get a slug; what stands on them stays on whole chart units
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareChart(e.app, e.record);
  e.next();
}, 'charts');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareChart(e.app, e.record);
  e.next();
}, 'charts');

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePlace(e.app, e.record);
  e.next();
}, 'places');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).preparePlace(e.app, e.record);
  e.next();
}, 'places');

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareRealm(e.app, e.record);
  e.next();
}, 'realms');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareRealm(e.app, e.record);
  e.next();
}, 'realms');

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareFeature(e.app, e.record);
  e.next();
}, 'features');

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).prepareFeature(e.app, e.record);
  e.next();
}, 'features');

// ---------------------------------------------------------------------------
// Uploads: every file is an image, and its name says so (every collection)
// ---------------------------------------------------------------------------

onRecordCreate((e) => {
  require(`${__hooks}/phantos/lib.js`).checkUploadNames(e.record);
  e.next();
});

onRecordUpdate((e) => {
  require(`${__hooks}/phantos/lib.js`).checkUploadNames(e.record);
  e.next();
});

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
// GET /api/phantos/feed.xml — the newest published lore as an RSS feed
// ---------------------------------------------------------------------------

routerAdd('GET', '/api/phantos/feed.xml', (e) => {
  const lib = require(`${__hooks}/phantos/lib.js`);
  const origin = lib.requestOrigin(e);

  const xml = lib.loreFeed(lib.siteUrl(origin), origin + '/api/phantos/feed.xml');

  e.response.header().set('Content-Type', 'application/rss+xml; charset=utf-8');
  return e.string(200, xml);
});

