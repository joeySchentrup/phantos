/// <reference path="../../.local-pocketbase/pb_data/types.d.ts" />

/**
 * Chat: keeps the table's chat server (Synapse) in step with PocketBase.
 *
 * PocketBase decides who is in each room and Synapse follows. Every call goes
 * through the app service in deploy/matrix/phantos-appservice.yaml, so nobody
 * has a chat password: PocketBase makes the accounts and the rooms, adds and
 * removes members, and signs people in.
 *
 * The sync is idempotent: it compares what PocketBase says with what Synapse
 * has and fixes the difference, so running it again (the cron does, every ten
 * minutes) catches up whatever a failure left behind. It never throws: a
 * failure is logged and written to the chat's `sync_error`.
 *
 * With the MATRIX_* settings unset, chat is off: nothing here calls out, and
 * the session route answers 404.
 *
 * Like lib.js, this module touches PocketBase's globals ($app, $os, $http)
 * only inside its functions, so testing/chat.test.ts can evaluate it.
 */

const CHATS = 'chats';
const PLAYERS = 'players';
const DMS = 'dungeon_masters';

/** The website's own account, which creates the rooms: `sender_localpart` in phantos-appservice.yaml. */
const PHANTOS = 'phantos';
/** A state event in every room the site makes, saying what the room is: `{ kind, player, chat }`. */
const MARKER = 'org.phantos.chat';
/** Seconds to wait for Synapse. A save waits on the sync, so this bounds how long while the NAS is down. */
const TIMEOUT = 5;
/** What a browser sends as its device: PHANTOS and letters or digits, 32 characters at most. */
const DEVICE_ID = /^PHANTOS[A-Za-z0-9]{1,25}$/;
const SYNC_ERROR_MAX = 1000;
/**
 * The rooms' version, pinned so a new Synapse doesn't change how they behave.
 * In version 12 the room's creator (the website) has every power and is never
 * listed in its power levels.
 */
const ROOM_VERSION = '12';

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** The chat server's settings, or null when chat is off. */
function settings() {
  const url = String($os.getenv('MATRIX_URL') || '').trim().replace(/\/+$/, '');
  const publicUrl = String($os.getenv('MATRIX_PUBLIC_URL') || '').trim().replace(/\/+$/, '');
  const serverName = String($os.getenv('MATRIX_SERVER_NAME') || '').trim();
  const token = String($os.getenv('MATRIX_AS_TOKEN') || '').trim();
  if (!url || !publicUrl || !serverName || !token) return null;
  return { url: url, publicUrl: publicUrl, serverName: serverName, token: token };
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/** The origin of an http(s) address, or "" for anything else (so nothing odd reaches a header). */
function urlOrigin(url) {
  const match = /^(https?):\/\/([a-z0-9.-]+(?::\d{1,5})?)(?:[/?#]|$)/i.exec(String(url || '').trim());
  return match ? match[1].toLowerCase() + '://' + match[2].toLowerCase() : '';
}

/**
 * The pages' `connect-src`: PocketBase itself, and the chat server when chat
 * is on. PocketBase sends it as a header on every page, so the chat server's
 * address is set in one place, MATRIX_PUBLIC_URL, when PocketBase starts. The
 * build's own policy (csp.ts) leaves connections to this header.
 */
function connectPolicy(publicUrl) {
  const origin = urlOrigin(publicUrl);
  return "connect-src 'self'" + (origin ? ' ' + origin : '');
}

function oneLine(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

/** A chat account's localpart. Record IDs never change and are already valid localparts. */
function localpart(kind, id) {
  return (kind === 'dm' ? 'dm-' : 'player-') + id;
}

function matrixId(part, serverName) {
  return '@' + part + ':' + serverName;
}

/** The room's address. It makes creating a room idempotent: a second try finds the first. */
function roomAliasName(chatId) {
  return 'chat-' + chatId;
}

function isDeviceId(value) {
  return typeof value === 'string' && DEVICE_ID.test(value);
}

/** "Joey (Daymond)": a player, and the hero they play. */
function playerDisplayName(name, heroName) {
  const hero = oneLine(heroName);
  const player = oneLine(name) || 'A player';
  return hero ? player + ' (' + hero + ')' : player;
}

/** A DM by their name, or the part of their email before the @. */
function dmDisplayName(name, email) {
  return oneLine(name) || oneLine(String(email || '').split('@')[0]) || 'Dungeon Master';
}

/** A room's name: a private channel is named after its player, a group by the DM. */
function roomName(chat, players) {
  if (chat.kind === 'private') {
    const player = players[chat.player];
    return player ? player.display : 'A player';
  }
  return oneLine(chat.name) || 'Group';
}

/** What the room says it is, so the site can tell a channel from a group without asking PocketBase. */
function roomMarker(chat) {
  return { kind: chat.kind, player: chat.kind === 'private' ? chat.player : '', chat: chat.id };
}

function sameMarker(a, b) {
  return !!a && !!b && a.kind === b.kind && (a.player || '') === (b.player || '') && a.chat === b.chat;
}

/**
 * Who should be in a room: the channel's player or the group's players, if
 * approved, and every DM. `players` maps a player's id to `{ approved }`.
 */
function wantedMembers(chat, players, dmIds, serverName) {
  const wanted = [];
  const add = (id) => {
    if (wanted.indexOf(id) < 0) wanted.push(id);
  };
  const ids = chat.kind === 'private' ? [chat.player] : chat.players || [];
  for (let i = 0; i < ids.length; i++) {
    const player = players[ids[i]];
    if (player && player.approved) add(matrixId(localpart('player', ids[i]), serverName));
  }
  for (let i = 0; i < dmIds.length; i++) add(matrixId(localpart('dm', dmIds[i]), serverName));
  return wanted;
}

/**
 * What to change so a room's members are the wanted ones. `memberships` maps
 * a user to their membership in the room (`join`, `invite`, `leave`, `ban`).
 * Nobody accepts an invite themselves: the sync invites, then joins as them.
 * `keep` are never removed (the website's own account).
 */
function membershipChanges(wanted, memberships, keep) {
  const invite = [];
  const join = [];
  const kick = [];
  for (let i = 0; i < wanted.length; i++) {
    const membership = memberships[wanted[i]];
    if (membership === 'join') continue;
    if (membership !== 'invite') invite.push(wanted[i]);
    join.push(wanted[i]);
  }
  for (const user in memberships) {
    const membership = memberships[user];
    if (membership !== 'join' && membership !== 'invite') continue;
    if (wanted.indexOf(user) < 0 && (keep || []).indexOf(user) < 0) kick.push(user);
  }
  return { invite: invite, join: join, kick: kick };
}

/** The power levels a room lists: DMs 50; players have the default, 0. The website made it, so isn't listed. */
function powerUsers(dmUserIds) {
  const users = {};
  for (let i = 0; i < dmUserIds.length; i++) users[dmUserIds[i]] = 50;
  return users;
}

function samePowerUsers(a, b) {
  const keysA = Object.keys(a || {});
  const keysB = Object.keys(b || {});
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) if (a[keysA[i]] !== (b || {})[keysA[i]]) return false;
  return true;
}

/**
 * The room's power levels. Everyone may send messages; only the website may
 * invite, remove, or change the room's state (its name, its settings,
 * encryption). DMs may take down a message.
 */
function powerLevels(dmUserIds) {
  return {
    users: powerUsers(dmUserIds),
    users_default: 0,
    events_default: 0,
    state_default: 100,
    events: {},
    invite: 100,
    kick: 100,
    ban: 100,
    redact: 50,
    notifications: { room: 100 },
  };
}

/** The body of `POST /createRoom` for a chat. */
function createRoomRequest(chat, name, dmUserIds) {
  return {
    room_version: ROOM_VERSION,
    preset: 'private_chat',
    visibility: 'private',
    room_alias_name: roomAliasName(chat.id),
    name: name,
    initial_state: [
      // Someone added later sees the messages from the point they were added, not before.
      { type: 'm.room.history_visibility', state_key: '', content: { history_visibility: 'invited' } },
      { type: 'm.room.guest_access', state_key: '', content: { guest_access: 'forbidden' } },
      { type: MARKER, state_key: '', content: roomMarker(chat) },
    ],
    power_level_content_override: powerLevels(dmUserIds),
  };
}

/** A room's state events, as what the sync compares: members, name, power levels and marker. */
function readRoomState(events) {
  const state = { members: {}, name: '', power: null, marker: null };
  for (let i = 0; i < (events || []).length; i++) {
    const event = events[i];
    const content = event.content || {};
    if (event.type === 'm.room.member') state.members[event.state_key] = content.membership;
    else if (event.type === 'm.room.name' && event.state_key === '') state.name = String(content.name || '');
    else if (event.type === 'm.room.power_levels' && event.state_key === '') state.power = content;
    else if (event.type === MARKER && event.state_key === '') state.marker = content;
  }
  return state;
}

// ---------------------------------------------------------------------------
// Talking to Synapse
// ---------------------------------------------------------------------------

function enc(text) {
  return encodeURIComponent(text);
}

/**
 * One request to Synapse with the app service's token. `asUser` makes it on
 * that user's behalf. Returns the JSON answer; throws an Error with `status`
 * and `errcode` for anything but a 2xx.
 */
function call(cfg, method, path, body, asUser) {
  let url = cfg.url + path;
  if (asUser) url += (url.indexOf('?') < 0 ? '?' : '&') + 'user_id=' + enc(asUser);

  let res;
  try {
    res = $http.send({
      url: url,
      method: method,
      body: method === 'GET' ? '' : JSON.stringify(body || {}),
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + cfg.token },
      timeout: TIMEOUT,
    });
  } catch (err) {
    const error = new Error('The chat server did not answer.');
    error.status = 0;
    error.errcode = '';
    throw error;
  }

  const json = res.json || {};
  if (res.statusCode >= 200 && res.statusCode < 300) return json;
  const error = new Error(
    (json.errcode ? json.errcode + ': ' : '') + (json.error || 'The chat server answered ' + res.statusCode + '.')
  );
  error.status = res.statusCode;
  error.errcode = json.errcode || '';
  throw error;
}

/** Makes the account if it's missing and keeps its display name in step. Once a run per account. */
function ensureAccount(cfg, run, part, displayName) {
  const id = matrixId(part, cfg.serverName);
  if (run.accounts[id]) return id;

  let made = false;
  try {
    call(cfg, 'POST', '/_matrix/client/v3/register', {
      type: 'm.login.application_service',
      username: part,
      inhibit_login: true,
    });
    made = true;
  } catch (err) {
    if (err.errcode !== 'M_USER_IN_USE') throw err;
  }

  // Setting a name changes it in every room the account is in, so only when it differs.
  let current = '';
  if (!made) {
    try {
      current = String(call(cfg, 'GET', '/_matrix/client/v3/profile/' + enc(id) + '/displayname', null, id).displayname || '');
    } catch (err) {
      if (err.status !== 404) throw err;
    }
  }
  if (current !== displayName) {
    call(cfg, 'PUT', '/_matrix/client/v3/profile/' + enc(id) + '/displayname', { displayname: displayName }, id);
  }

  run.accounts[id] = true;
  return id;
}

/** Signs out every chat session of an account. One that was never made has nothing to sign out (403). */
function signOutEverywhere(cfg, part) {
  try {
    call(cfg, 'POST', '/_matrix/client/v3/logout/all', {}, matrixId(part, cfg.serverName));
  } catch (err) {
    if (err.status !== 403) throw err;
  }
}

/** The room's state as the website sees it, or null when it can't see the room (gone, or never joined). */
function fetchRoomState(cfg, roomId) {
  try {
    return readRoomState(call(cfg, 'GET', '/_matrix/client/v3/rooms/' + enc(roomId) + '/state'));
  } catch (err) {
    if (err.status === 403 || err.status === 404) return null;
    throw err;
  }
}

function roomAlias(cfg, chat) {
  return '#' + roomAliasName(chat.id) + ':' + cfg.serverName;
}

/** Makes the chat's room, or finds the one an earlier try made under its address. */
function createRoom(cfg, run, chat, name) {
  try {
    return call(cfg, 'POST', '/_matrix/client/v3/createRoom', createRoomRequest(chat, name, run.dmUserIds)).room_id;
  } catch (err) {
    if (err.errcode !== 'M_ROOM_IN_USE') throw err;
    return call(cfg, 'GET', '/_matrix/client/v3/directory/room/' + enc(roomAlias(cfg, chat))).room_id;
  }
}

/** A room the site can't use: everyone out, and its address freed for a new one. */
function discardRoom(cfg, run, chat, roomId, state) {
  if (state) closeRoom(cfg, roomId, run.phantos);
  const alias = enc(roomAlias(cfg, chat));
  try {
    if (call(cfg, 'GET', '/_matrix/client/v3/directory/room/' + alias).room_id === roomId) {
      call(cfg, 'DELETE', '/_matrix/client/v3/directory/room/' + alias, {});
    }
  } catch (err) {
    if (err.status !== 404) throw err;
  }
}

/**
 * The chat's room and its state, made if it's missing. A room with no power
 * levels is one whose creation stopped partway (Synapse makes the room and
 * claims its address before the rest): it's thrown away and made again, as is
 * a room the website can't see (a local server that was wiped).
 */
function openRoom(cfg, run, chat, name) {
  let roomId = chat.room;
  let state = roomId ? fetchRoomState(cfg, roomId) : null;
  for (let tries = 0; tries < 3 && !(state && state.power); tries++) {
    if (roomId) discardRoom(cfg, run, chat, roomId, state);
    roomId = createRoom(cfg, run, chat, name);
    state = fetchRoomState(cfg, roomId);
  }
  if (!state || !state.power) throw new Error('The chat server would not make this room.');
  return { roomId: roomId, state: state };
}

function putState(cfg, roomId, type, content) {
  call(cfg, 'PUT', '/_matrix/client/v3/rooms/' + enc(roomId) + '/state/' + enc(type) + '/', content);
}

/** Everyone out of a room, then the website leaves it too. The room stays on the server, empty. */
function closeRoom(cfg, roomId, phantos) {
  const state = fetchRoomState(cfg, roomId);
  if (!state) return;
  for (const user in state.members) {
    const membership = state.members[user];
    if (user === phantos || (membership !== 'join' && membership !== 'invite')) continue;
    call(cfg, 'POST', '/_matrix/client/v3/rooms/' + enc(roomId) + '/kick', { user_id: user, reason: 'This chat was closed.' });
  }
  call(cfg, 'POST', '/_matrix/client/v3/rooms/' + enc(roomId) + '/leave', {});
}

// ---------------------------------------------------------------------------
// What PocketBase says
// ---------------------------------------------------------------------------

function heroName(app, heroId) {
  if (!heroId) return '';
  try {
    return app.findRecordById('heroes', heroId).getString('name');
  } catch (err) {
    return '';
  }
}

/**
 * Everything one run of the sync needs from PocketBase: the players (by id,
 * with whether they're approved and their display name) and the DMs.
 */
function startRun(app, cfg) {
  const players = {};
  const playerRecords = app.findAllRecords(PLAYERS);
  for (let i = 0; i < playerRecords.length; i++) {
    const r = playerRecords[i];
    players[r.id] = {
      id: r.id,
      approved: r.getBool('approved'),
      display: playerDisplayName(r.getString('name'), heroName(app, r.getString('hero'))),
    };
  }

  const dms = [];
  const dmRecords = app.findAllRecords(DMS);
  for (let i = 0; i < dmRecords.length; i++) {
    const r = dmRecords[i];
    dms.push({ id: r.id, display: dmDisplayName(r.getString('name'), r.getString('email')) });
  }

  const dmUserIds = [];
  for (let i = 0; i < dms.length; i++) dmUserIds.push(matrixId(localpart('dm', dms[i].id), cfg.serverName));

  return {
    players: players,
    dms: dms,
    dmIds: dms.map((dm) => dm.id),
    dmUserIds: dmUserIds,
    phantos: matrixId(PHANTOS, cfg.serverName),
    accounts: {},
  };
}

function chatInfo(record) {
  return {
    id: record.id,
    kind: record.getString('kind'),
    name: record.getString('name'),
    player: record.getString('player'),
    players: record.getStringSlice('players'),
    room: record.getString('room'),
    syncError: record.getString('sync_error'),
  };
}

/**
 * Writes the fields only the sync keeps, straight to the database: no hooks
 * (they would start another sync), and the DM's edits in between stay.
 */
function writeChat(app, id, field, value) {
  app
    .db()
    .newQuery('UPDATE chats SET ' + (field === 'room' ? 'room' : 'sync_error') + ' = {:value} WHERE id = {:id}')
    .bind({ value: value, id: id })
    .execute();
}

/** A channel for an approved player who has none yet. */
function ensureChannel(app, playerId) {
  if (app.findRecordsByFilter(CHATS, 'player = {:player}', '', 1, 0, { player: playerId }).length) return;
  const record = new Record(app.findCollectionByNameOrId(CHATS));
  record.set('kind', 'private');
  record.set('player', playerId);
  try {
    app.save(record);
  } catch (err) {
    // Another sync made it first (the unique index on `player`).
  }
}

// ---------------------------------------------------------------------------
// The sync
// ---------------------------------------------------------------------------

/**
 * Brings one chat's room in step. Returns the room's ID, or "" when it has
 * none. Never throws; a failure goes to the chat's `sync_error`.
 */
function syncChat(app, cfg, run, record) {
  const chat = chatInfo(record);
  try {
    const wanted = wantedMembers(chat, run.players, run.dmIds, cfg.serverName);
    // Everyone wanted needs an account before they can be let in.
    const ids = chat.kind === 'private' ? [chat.player] : chat.players;
    for (let i = 0; i < ids.length; i++) {
      const player = run.players[ids[i]];
      if (player && player.approved) ensureAccount(cfg, run, localpart('player', player.id), player.display);
    }
    for (let i = 0; i < run.dms.length; i++) {
      ensureAccount(cfg, run, localpart('dm', run.dms[i].id), run.dms[i].display);
    }

    const name = roomName(chat, run.players);
    const opened = openRoom(cfg, run, chat, name);
    const roomId = opened.roomId;
    const state = opened.state;
    if (roomId !== chat.room) writeChat(app, chat.id, 'room', roomId);

    if (state.name !== name) putState(cfg, roomId, 'm.room.name', { name: name });
    if (!sameMarker(state.marker, roomMarker(chat))) putState(cfg, roomId, MARKER, roomMarker(chat));
    const users = powerUsers(run.dmUserIds);
    if (state.power && !samePowerUsers(state.power.users, users)) {
      const power = JSON.parse(JSON.stringify(state.power));
      power.users = users;
      putState(cfg, roomId, 'm.room.power_levels', power);
    }

    const changes = membershipChanges(wanted, state.members, [run.phantos]);
    const room = enc(roomId);
    for (let i = 0; i < changes.invite.length; i++) {
      call(cfg, 'POST', '/_matrix/client/v3/rooms/' + room + '/invite', { user_id: changes.invite[i] });
    }
    for (let i = 0; i < changes.join.length; i++) {
      call(cfg, 'POST', '/_matrix/client/v3/join/' + room, {}, changes.join[i]);
    }
    for (let i = 0; i < changes.kick.length; i++) {
      call(cfg, 'POST', '/_matrix/client/v3/rooms/' + room + '/kick', {
        user_id: changes.kick[i],
        reason: 'No longer in this chat on the site.',
      });
    }

    if (chat.syncError) writeChat(app, chat.id, 'sync_error', '');
    return roomId;
  } catch (err) {
    const message = String((err && err.message) || err).slice(0, SYNC_ERROR_MAX);
    app.logger().warn('Chat sync failed', 'chat', chat.id, 'error', message);
    if (message !== chat.syncError) {
      try {
        writeChat(app, chat.id, 'sync_error', message);
      } catch (writeErr) {
        // The chat was deleted meanwhile.
      }
    }
    return chat.room;
  }
}

/** Runs `work` with the settings and a fresh run, unless chat is off. Never throws. */
function withChat(app, label, work) {
  const cfg = settings();
  if (!cfg) return;
  try {
    work(cfg, startRun(app, cfg));
  } catch (err) {
    app.logger().warn('Chat sync failed', 'step', label, 'error', String((err && err.message) || err));
  }
}

/**
 * One player: their account, their channel, every chat they're in, and if
 * they're no longer approved, out of every room and signed out of chat.
 */
function syncPlayer(app, playerId) {
  withChat(app, 'player', (cfg, run) => {
    const player = run.players[playerId];
    if (player && player.approved) ensureChannel(app, playerId);

    const records = app.findRecordsByFilter(CHATS, 'player = {:id} || players ?= {:id}', '', 0, 0, { id: playerId });
    for (let i = 0; i < records.length; i++) syncChat(app, cfg, run, records[i]);

    if (!player || !player.approved) signOutEverywhere(cfg, localpart('player', playerId));
  });
}

/** One chat, after a DM made or changed a group. */
function syncChatById(app, chatId) {
  withChat(app, 'chat', (cfg, run) => {
    syncChat(app, cfg, run, app.findRecordById(CHATS, chatId));
  });
}

/** A DM's account and display name, after they changed their record. */
function syncDungeonMaster(app, dmId) {
  withChat(app, 'dm', (cfg, run) => {
    for (let i = 0; i < run.dms.length; i++) {
      if (run.dms[i].id === dmId) ensureAccount(cfg, run, localpart('dm', dmId), run.dms[i].display);
    }
  });
}

/**
 * Everything: every DM's account, a channel for every approved player, every
 * chat's room, the revoked players signed out, and rooms whose chat is gone
 * closed. The cron runs it; the first run after deploying is the backfill.
 */
function syncAll(app) {
  withChat(app, 'all', (cfg, run) => {
    for (let i = 0; i < run.dms.length; i++) {
      try {
        ensureAccount(cfg, run, localpart('dm', run.dms[i].id), run.dms[i].display);
      } catch (err) {
        app.logger().warn('Chat account failed', 'dm', run.dms[i].id, 'error', String(err.message || err));
      }
    }
    for (const id in run.players) if (run.players[id].approved) ensureChannel(app, id);

    const records = app.findAllRecords(CHATS);
    const known = {};
    for (let i = 0; i < records.length; i++) {
      const room = syncChat(app, cfg, run, records[i]);
      if (room) known[room] = true;

      // A player who was revoked while the chat server was down is signed out now.
      const player = run.players[records[i].getString('player')];
      if (records[i].getString('kind') === 'private' && player && !player.approved) {
        try {
          signOutEverywhere(cfg, localpart('player', player.id));
        } catch (err) {
          app.logger().warn('Chat sign-out failed', 'player', player.id, 'error', String(err.message || err));
        }
      }
    }

    // Rooms the site made whose chat is gone: a deleted group, or the channel of a deleted player.
    const joined = call(cfg, 'GET', '/_matrix/client/v3/joined_rooms', null).joined_rooms || [];
    for (let i = 0; i < joined.length; i++) {
      if (known[joined[i]]) continue;
      try {
        const state = fetchRoomState(cfg, joined[i]);
        if (state && state.marker) closeRoom(cfg, joined[i], run.phantos);
      } catch (err) {
        app.logger().warn('Closing a chat room failed', 'room', joined[i], 'error', String(err.message || err));
      }
    }
  });
}

/** A deleted group: everyone out of its room. If this fails, syncAll closes it later. */
function chatDeleted(app, record) {
  const room = record.getString('room');
  if (!room) return;
  withChat(app, 'deleted chat', (cfg, run) => closeRoom(cfg, room, run.phantos));
}

/** A deleted player: signed out of chat, and every room brought in step (their channel went with them). */
function playerDeleted(app, playerId) {
  withChat(app, 'deleted player', (cfg) => signOutEverywhere(cfg, localpart('player', playerId)));
  syncAll(app);
}

// ---------------------------------------------------------------------------
// The DMs' requests on `chats`
// ---------------------------------------------------------------------------

/** A DM makes groups only; the sync makes the private channels and fills in the room. */
function prepareGroupRequest(record) {
  record.set('kind', 'group');
  record.set('player', '');
  record.set('room', '');
  record.set('sync_error', '');
  record.set('name', oneLine(record.getString('name')));
  if (!record.getString('name')) throw new BadRequestError('Give the group a name.');
}

/** A DM renames a group and changes who's in it; what the chat is, and its room, stay. */
function keepChatFixed(record) {
  const was = record.original();
  record.set('kind', was.getString('kind'));
  record.set('player', was.getString('player'));
  record.set('room', was.getString('room'));
  record.set('sync_error', was.getString('sync_error'));
  if (was.getString('kind') === 'private') {
    record.set('name', '');
    record.set('players', []);
    return;
  }
  record.set('name', oneLine(record.getString('name')));
  if (!record.getString('name')) throw new BadRequestError('Give the group a name.');
}

function refuseChannelDelete(record) {
  if (record.getString('kind') === 'private') {
    throw new BadRequestError("A player's channel comes and goes with their approval.");
  }
}

// ---------------------------------------------------------------------------
// The site's pages and GET /api/phantos/chat/config
// ---------------------------------------------------------------------------

/** Every page's connect-src header. Not on the API or the admin UI (/_/), which send their own headers. */
function setPagePolicy(e) {
  const path = String(e.request.url.path || '');
  if (path === '/api' || path.indexOf('/api/') === 0 || path === '/_' || path.indexOf('/_/') === 0) return;
  const cfg = settings();
  e.response.header().set('Content-Security-Policy', connectPolicy(cfg ? cfg.publicUrl : ''));
}

/** Whether chat is on, and the chat server's address, for the site: it shows the Chat section by this. */
function config(e) {
  const cfg = settings();
  return e.json(200, { enabled: !!cfg, homeserver: cfg ? cfg.publicUrl : '' });
}

// ---------------------------------------------------------------------------
// POST /api/phantos/chat/session
// ---------------------------------------------------------------------------

/**
 * A chat session for the signed-in approved player or DM, on the device the
 * browser names. Their rooms are brought in step first, so a first visit
 * finds them ready. Logging in again with the same device ID doesn't cancel
 * that device's old token in Synapse, so the device is deleted first: one
 * live token per browser, and a laptop and a phone don't sign each other out.
 */
function session(e) {
  const cfg = settings();
  if (!cfg) throw new NotFoundError('Chat is not switched on.');

  const auth = e.auth;
  const collection = auth ? auth.collection().name : '';
  if (collection !== DMS && collection !== PLAYERS) throw new UnauthorizedError('Sign in to chat.');
  if (collection === PLAYERS && !auth.getBool('approved')) {
    throw new ForbiddenError('Chat opens once the Dungeon Master approves you.');
  }

  const body = e.requestInfo().body || {};
  const deviceId = body.device_id;
  if (!isDeviceId(deviceId)) throw new BadRequestError('That device ID is not one the site makes.');

  const app = e.app;
  if (collection === DMS) syncAll(app);
  else syncPlayer(app, auth.id);

  const part = localpart(collection === DMS ? 'dm' : 'player', auth.id);
  const userId = matrixId(part, cfg.serverName);
  let login;
  try {
    const run = startRun(app, cfg);
    const display =
      collection === DMS ? dmDisplayName(auth.getString('name'), auth.getString('email')) : run.players[auth.id].display;
    ensureAccount(cfg, run, part, display);
    call(cfg, 'DELETE', '/_matrix/client/v3/devices/' + enc(deviceId), {}, userId);
    login = call(cfg, 'POST', '/_matrix/client/v3/login', {
      type: 'm.login.application_service',
      identifier: { type: 'm.id.user', user: part },
      device_id: deviceId,
      initial_device_display_name: 'Phantos website',
    });
  } catch (err) {
    app.logger().warn('Chat sign-in failed', 'user', userId, 'error', String((err && err.message) || err));
    throw new ApiError(503, 'The chat server is not answering. Try again in a little while.', null);
  }

  return e.json(200, {
    homeserver: cfg.publicUrl,
    user_id: login.user_id,
    access_token: login.access_token,
    device_id: login.device_id,
  });
}

module.exports = {
  settings: settings,
  urlOrigin: urlOrigin,
  connectPolicy: connectPolicy,
  setPagePolicy: setPagePolicy,
  config: config,
  localpart: localpart,
  matrixId: matrixId,
  roomAliasName: roomAliasName,
  isDeviceId: isDeviceId,
  playerDisplayName: playerDisplayName,
  dmDisplayName: dmDisplayName,
  roomName: roomName,
  roomMarker: roomMarker,
  sameMarker: sameMarker,
  wantedMembers: wantedMembers,
  membershipChanges: membershipChanges,
  powerUsers: powerUsers,
  samePowerUsers: samePowerUsers,
  powerLevels: powerLevels,
  createRoomRequest: createRoomRequest,
  readRoomState: readRoomState,
  syncPlayer: syncPlayer,
  syncChatById: syncChatById,
  syncDungeonMaster: syncDungeonMaster,
  syncAll: syncAll,
  chatDeleted: chatDeleted,
  playerDeleted: playerDeleted,
  prepareGroupRequest: prepareGroupRequest,
  keepChatFixed: keepChatFixed,
  refuseChannelDelete: refuseChannelDelete,
  session: session,
};
