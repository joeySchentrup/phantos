/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Players: accounts for the people at the table, so each can keep their own
 * hero. Anyone can ask to join and claim a hero; a Dungeon Master approves
 * them. Once approved, a player can write their hero's backstory and post
 * updates to their hero's page, and nothing else.
 *
 * - players: an auth collection. `hero` is the hero they play and `approved`
 *   whether a DM has let them write. Only DMs and the player can read one;
 *   only DMs change one. A new account always waits for approval (a hook).
 * - heroes: an approved player can read their own hero, draft or not, and
 *   update it. A hook keeps that update to the backstory.
 * - hero_updates: an approved player can read their hero's updates and post
 *   new ones. Editing and deleting them stays with the DMs.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

/** An approved player whose hero is `heroField`. */
function plays(heroField) {
  return (
    '(@request.auth.collectionName = "players" && @request.auth.approved = true && @request.auth.hero != "" && @request.auth.hero = ' +
    heroField +
    ')'
  );
}

migrate(
  (app) => {
    const heroes = app.findCollectionByNameOrId('heroes');

    const players = new Collection({
      type: 'auth',
      name: 'players',
      listRule: 'id = @request.auth.id || ' + IS_DM,
      viewRule: 'id = @request.auth.id || ' + IS_DM,
      // Anyone can ask to join; the hook keeps the new account unapproved.
      createRule: '',
      updateRule: IS_DM,
      deleteRule: IS_DM,
      // Lets a DM see players' email addresses on the desk.
      manageRule: IS_DM,
      fields: [
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        { name: 'hero', type: 'relation', collectionId: heroes.id, maxSelect: 1, cascadeDelete: false },
        { name: 'approved', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_players_hero ON players (hero)'],
    });
    app.save(players);

    heroes.listRule = 'published = true || ' + IS_DM + ' || ' + plays('id');
    heroes.viewRule = heroes.listRule;
    heroes.updateRule = IS_DM + ' || ' + plays('id');
    app.save(heroes);

    const updates = app.findCollectionByNameOrId('hero_updates');
    updates.listRule = 'hero.published = true || ' + IS_DM + ' || ' + plays('hero');
    updates.viewRule = updates.listRule;
    updates.createRule = IS_DM + ' || ' + plays('hero');
    app.save(updates);
  },
  (app) => {
    const heroes = app.findCollectionByNameOrId('heroes');
    heroes.listRule = 'published = true || ' + IS_DM;
    heroes.viewRule = heroes.listRule;
    heroes.updateRule = IS_DM;
    app.save(heroes);

    const updates = app.findCollectionByNameOrId('hero_updates');
    updates.listRule = 'hero.published = true || ' + IS_DM;
    updates.viewRule = updates.listRule;
    updates.createRule = IS_DM;
    app.save(updates);

    try {
      app.delete(app.findCollectionByNameOrId('players'));
    } catch (err) {
      // already gone
    }
  }
);
