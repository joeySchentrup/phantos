/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Schema for Electrum: the currency the party earns at the table and spends
 * in the electrum shop.
 *
 * - electrum_accounts: the ledger. `name` is whose account it is (the
 *   player), `amount` is what they hold and `spent` what they have spent so
 *   far. `hero` ties the account to a hero, one account a hero at most; an
 *   account with no hero is waiting for one. Deleting a hero frees the account.
 * - electrum_shop: what electrum buys. Every price is a flat, whole number.
 * - electrum_levels: what a level up costs, by the level being reached. It is
 *   the one price that isn't flat, so it is worked out ahead and stored.
 *
 * Anyone can read all three; only DMs write.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

const DM_WRITES = { listRule: '', viewRule: '', createRule: IS_DM, updateRule: IS_DM, deleteRule: IS_DM };

const DATES = [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
];

migrate(
  (app) => {
    const heroes = app.findCollectionByNameOrId('heroes');

    const accounts = new Collection({
      type: 'base',
      name: 'electrum_accounts',
      ...DM_WRITES,
      fields: [
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        { name: 'amount', type: 'number', onlyInt: true, min: 0, max: 1000000000 },
        { name: 'spent', type: 'number', onlyInt: true, min: 0, max: 1000000000 },
        { name: 'hero', type: 'relation', collectionId: heroes.id, maxSelect: 1, cascadeDelete: false },
        ...DATES,
      ],
      indexes: ['CREATE UNIQUE INDEX idx_electrum_accounts_hero ON electrum_accounts (hero) WHERE hero != ""'],
    });
    app.save(accounts);

    const shop = new Collection({
      type: 'base',
      name: 'electrum_shop',
      ...DM_WRITES,
      fields: [
        { name: 'name', type: 'text', required: true, max: 120, presentable: true },
        { name: 'price', type: 'number', required: true, onlyInt: true, min: 1, max: 1000000000 },
        { name: 'description', type: 'text', max: 400 },
        ...DATES,
      ],
    });
    app.save(shop);

    const levels = new Collection({
      type: 'base',
      name: 'electrum_levels',
      ...DM_WRITES,
      fields: [
        { name: 'level', type: 'number', required: true, onlyInt: true, min: 2, max: 20, presentable: true },
        { name: 'cost', type: 'number', required: true, onlyInt: true, min: 1, max: 1000000000 },
        ...DATES,
      ],
      indexes: ['CREATE UNIQUE INDEX idx_electrum_levels_level ON electrum_levels (level)'],
    });
    app.save(levels);
  },
  (app) => {
    for (const name of ['electrum_levels', 'electrum_shop', 'electrum_accounts']) {
      try {
        app.delete(app.findCollectionByNameOrId(name));
      } catch (err) {
        // already gone
      }
    }
  }
);
