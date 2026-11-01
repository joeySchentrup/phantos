/// <reference path="../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Chat: the rooms of the table's private chat server (Synapse), as PocketBase
 * sees them. PocketBase decides who is in each room, and the hooks in
 * pb_hooks/phantos/chat.js make Synapse follow.
 *
 * - chats: a private channel (one approved player and every DM) or a group
 *   (the players a DM chose, and every DM). The hooks make the private
 *   channels and fill in `room` and `sync_error`; DMs make the groups.
 *   Players never read this collection: they see their rooms through chat.
 */

const IS_DM = '@request.auth.collectionName = "dungeon_masters"';

migrate(
  (app) => {
    const players = app.findCollectionByNameOrId('players');

    const chats = new Collection({
      type: 'base',
      name: 'chats',
      listRule: IS_DM,
      viewRule: IS_DM,
      createRule: IS_DM,
      updateRule: IS_DM,
      deleteRule: IS_DM,
      fields: [
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['private', 'group'] },
        // A group's name. Empty for a private channel, which is named after its player.
        { name: 'name', type: 'text', max: 80, presentable: true },
        // Whose private channel. Deleting the player deletes it, and the hooks empty its room.
        { name: 'player', type: 'relation', collectionId: players.id, maxSelect: 1, cascadeDelete: true },
        // Who is in a group, besides the DMs. Only the approved ones are let in.
        { name: 'players', type: 'relation', collectionId: players.id, maxSelect: 999, cascadeDelete: false },
        // The Matrix room ID, and the last time Synapse couldn't be brought in step. The hooks write both.
        { name: 'room', type: 'text', max: 255 },
        { name: 'sync_error', type: 'text', max: 1000 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ["CREATE UNIQUE INDEX idx_chats_player ON chats (player) WHERE player != ''"],
    });
    app.save(chats);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('chats'));
    } catch (err) {
      // already gone
    }
  }
);
