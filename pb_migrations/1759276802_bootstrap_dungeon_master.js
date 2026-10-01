/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Creates the first Dungeon Master from DM_EMAIL / DM_PASSWORD, if both are set.
 *
 * On a brand-new database PocketBase bootstraps (and runs pb_hooks' onBootstrap)
 * before applying migrations, so the hook can't create the account on the very
 * first start — this migration does. Later starts are handled by the hook.
 */

migrate((app) => {
  const email = ($os.getenv('DM_EMAIL') || '').trim();
  const password = $os.getenv('DM_PASSWORD') || '';
  if (!email || !password) return;

  try {
    app.findAuthRecordByEmail('dungeon_masters', email);
    return;
  } catch (err) {
    // not there yet
  }

  const record = new Record(app.findCollectionByNameOrId('dungeon_masters'));
  record.set('email', email);
  record.set('name', 'Dungeon Master');
  record.set('verified', true);
  record.setPassword(password);
  app.save(record);
});
