/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Seeds Electrum from the DM's spreadsheet (Electrum.ods): the six accounts on
 * its Inventory sheet, the Electrum Shop, and the level up cost table.
 *
 * The accounts are listed by player. One whose player already has a hero on the
 * site is tied to that hero; the rest wait for the DM to attach them as the
 * heroes are added.
 *
 * Two prices on the sheet are formulas. A level up is 40 + 10 × l!/(l − 2)!,
 * where l is the level being reached; it is worked out here for the levels the
 * sheet lists, 4 to 20. Enhancing a weapon is 100 × l, where l is the bonus
 * being reached, so it is seeded as three flat items, +1 to +3.
 *
 * Runs once; an account, item or level that is already there is left alone.
 */

const ACCOUNTS = [
  { name: 'Alexandra', amount: 820, spent: 0 },
  { name: 'Brie', amount: 775, spent: 1245 },
  { name: 'Joey', amount: 120, spent: 0 },
  { name: 'Kiersten', amount: 55, spent: 0 },
  { name: 'Lisette', amount: 580, spent: 400 },
  { name: 'Michelle', amount: 20, spent: 0 },
];

const SHOP = [
  { name: 'One Gold', price: 5, description: 'A piece of gold.' },
  { name: 'Enhance a weapon to +1', price: 100, description: 'Take a weapon from +0 to +1.' },
  { name: 'Enhance a weapon to +2', price: 200, description: 'Take a weapon from +1 to +2.' },
  { name: 'Enhance a weapon to +3', price: 300, description: 'Take a weapon from +2 to +3.' },
  { name: 'Learn a language', price: 250, description: 'Learn any language.' },
  { name: 'Power Stone', price: 1000, description: "Gain a power stone (pierre d'amour)." },
  {
    name: 'Know the location of anything',
    price: 2500,
    description: 'Your character learns the location of anything in the game world.',
  },
  {
    name: 'Gain a Legendary Dragon Spell Scroll',
    price: 5000,
    description: 'Gain a random Legendary Dragon Spell Scroll.',
  },
  { name: 'Wish', price: 10000, description: "Cast the spell 'Wish'." },
];

const LEVELS = [
  { level: 4, cost: 160 },
  { level: 5, cost: 240 },
  { level: 6, cost: 340 },
  { level: 7, cost: 460 },
  { level: 8, cost: 600 },
  { level: 9, cost: 760 },
  { level: 10, cost: 940 },
  { level: 11, cost: 1140 },
  { level: 12, cost: 1360 },
  { level: 13, cost: 1600 },
  { level: 14, cost: 1860 },
  { level: 15, cost: 2140 },
  { level: 16, cost: 2440 },
  { level: 17, cost: 2760 },
  { level: 18, cost: 3100 },
  { level: 19, cost: 3460 },
  { level: 20, cost: 3840 },
];

migrate(
  (app) => {
    const exists = (collection, field, value) => {
      try {
        app.findFirstRecordByData(collection, field, value);
        return true;
      } catch (err) {
        return false;
      }
    };

    /** The one hero this player plays, if they have no account yet; otherwise ''. */
    const heroOf = (player) => {
      const heroes = app.findRecordsByFilter('heroes', 'player = {:player}', '', 2, 0, { player: player });
      if (heroes.length !== 1 || exists('electrum_accounts', 'hero', heroes[0].id)) return '';
      return heroes[0].id;
    };

    const accounts = app.findCollectionByNameOrId('electrum_accounts');
    for (let i = 0; i < ACCOUNTS.length; i++) {
      if (exists('electrum_accounts', 'name', ACCOUNTS[i].name)) continue;
      const record = new Record(accounts);
      record.set('name', ACCOUNTS[i].name);
      record.set('amount', ACCOUNTS[i].amount);
      record.set('spent', ACCOUNTS[i].spent);
      record.set('hero', heroOf(ACCOUNTS[i].name));
      app.save(record);
    }

    const shop = app.findCollectionByNameOrId('electrum_shop');
    for (let i = 0; i < SHOP.length; i++) {
      if (exists('electrum_shop', 'name', SHOP[i].name)) continue;
      const record = new Record(shop);
      record.set('name', SHOP[i].name);
      record.set('price', SHOP[i].price);
      record.set('description', SHOP[i].description);
      app.save(record);
    }

    const levels = app.findCollectionByNameOrId('electrum_levels');
    for (let i = 0; i < LEVELS.length; i++) {
      if (exists('electrum_levels', 'level', LEVELS[i].level)) continue;
      const record = new Record(levels);
      record.set('level', LEVELS[i].level);
      record.set('cost', LEVELS[i].cost);
      app.save(record);
    }
  },
  (app) => {
    const seeded = [
      ['electrum_accounts', 'name', ACCOUNTS.map((a) => a.name)],
      ['electrum_shop', 'name', SHOP.map((s) => s.name)],
      ['electrum_levels', 'level', LEVELS.map((l) => l.level)],
    ];
    for (let i = 0; i < seeded.length; i++) {
      for (let j = 0; j < seeded[i][2].length; j++) {
        try {
          app.delete(app.findFirstRecordByData(seeded[i][0], seeded[i][1], seeded[i][2][j]));
        } catch (err) {
          // already gone
        }
      }
    }
  }
);
