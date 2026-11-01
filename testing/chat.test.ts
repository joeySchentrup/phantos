import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dayLabel,
  groupMessages,
  GROUP_GAP_MS,
  linkify,
  newDeviceId,
  PLAYER_CHANNEL_TITLE,
  previewText,
  roomTitle,
  sortRooms,
  typingLine,
} from "~/lib/chat";
import type { ChatMessage } from "~/types/chat";

/**
 * The chat hooks module is CommonJS for PocketBase's VM, so it is evaluated
 * here, like lib.js in feed.test.ts. It only reaches for PocketBase's globals
 * ($app, $os, $http) inside its functions.
 */
function loadChatHooks(): Record<string, (...args: any[]) => any> {
  const module = { exports: {} };
  new Function("module", readFileSync("pb_hooks/phantos/chat.js", "utf8"))(module);
  return module.exports;
}

const hooks = loadChatHooks();
const SERVER = "matrix.example.com";
const dm = (id: string) => `@dm-${id}:${SERVER}`;
const player = (id: string) => `@player-${id}:${SERVER}`;

describe("chat IDs", () => {
  it("come from record IDs, which never change", () => {
    expect(hooks.localpart("player", "abc123def456ghi")).toBe("player-abc123def456ghi");
    expect(hooks.localpart("dm", "abc123def456ghi")).toBe("dm-abc123def456ghi");
    expect(hooks.matrixId("dm-abc", SERVER)).toBe("@dm-abc:matrix.example.com");
    expect(hooks.roomAliasName("abc123def456ghi")).toBe("chat-abc123def456ghi");
  });

  it("name a player with their hero, and a DM by their name or their email", () => {
    expect(hooks.playerDisplayName("  Joey ", "Daymond\nGreystone")).toBe("Joey (Daymond Greystone)");
    expect(hooks.playerDisplayName("Joey", "")).toBe("Joey");
    expect(hooks.dmDisplayName("Dungeon Master", "dm@example.com")).toBe("Dungeon Master");
    expect(hooks.dmDisplayName("", "keeper@example.com")).toBe("keeper");
  });
});

describe("connectPolicy", () => {
  it("lets pages connect to PocketBase and the chat server", () => {
    expect(hooks.connectPolicy("https://matrix.example.com/")).toBe("connect-src 'self' https://matrix.example.com");
    expect(hooks.connectPolicy("http://localhost:8008")).toBe("connect-src 'self' http://localhost:8008");
    expect(hooks.connectPolicy("HTTPS://Matrix.Example.com/path?x")).toBe("connect-src 'self' https://matrix.example.com");
  });

  it("lets pages connect only to PocketBase when chat is off", () => {
    expect(hooks.connectPolicy("")).toBe("connect-src 'self'");
  });

  it("lets pages reach GIPHY only when GIF search is on, and only with chat", () => {
    expect(hooks.connectPolicy("https://matrix.example.com", true)).toBe(
      "connect-src 'self' https://matrix.example.com https://*.giphy.com"
    );
    expect(hooks.connectPolicy("https://matrix.example.com", false)).toBe("connect-src 'self' https://matrix.example.com");
    expect(hooks.connectPolicy("", true)).toBe("connect-src 'self'");
  });

  it("rates GIFs pg-13 unless told one of GIPHY's ratings", () => {
    expect(hooks.gifRating("")).toBe("pg-13");
    expect(hooks.gifRating(" G ")).toBe("g");
    expect(hooks.gifRating("r")).toBe("r");
    expect(hooks.gifRating("nc-17")).toBe("pg-13");
  });

  it("never lets a strange address into the header", () => {
    expect(hooks.connectPolicy("https://a.example; script-src *")).toBe("connect-src 'self'");
    expect(hooks.connectPolicy("javascript:alert(1)")).toBe("connect-src 'self'");
    expect(hooks.connectPolicy("matrix.example.com")).toBe("connect-src 'self'");
    expect(hooks.connectPolicy("https://user@matrix.example.com")).toBe("connect-src 'self'");
  });
});

describe("device IDs", () => {
  it("are what the browser makes, and nothing else", () => {
    const made = newDeviceId((n) => new Uint8Array(n).map((_, i) => i * 37));
    expect(made).toMatch(/^PHANTOS[A-Z0-9]{24}$/);
    expect(hooks.isDeviceId(made)).toBe(true);
    expect(hooks.isDeviceId("PHANTOS")).toBe(false);
    expect(hooks.isDeviceId("ABCDEF123")).toBe(false);
    expect(hooks.isDeviceId("PHANTOS-1")).toBe(false);
    expect(hooks.isDeviceId(`PHANTOS${"A".repeat(26)}`)).toBe(false);
    expect(hooks.isDeviceId(42)).toBe(false);
  });
});

describe("wantedMembers", () => {
  const players = { joey: { approved: true }, sam: { approved: true }, pat: { approved: false } };

  it("puts a channel's approved player and every DM in it", () => {
    const chat = { kind: "private", player: "joey", players: [] };
    expect(hooks.wantedMembers(chat, players, ["one", "two"], SERVER)).toEqual([player("joey"), dm("one"), dm("two")]);
  });

  it("leaves a revoked player out of their own channel", () => {
    const chat = { kind: "private", player: "pat", players: [] };
    expect(hooks.wantedMembers(chat, players, ["one"], SERVER)).toEqual([dm("one")]);
  });

  it("lets in a group's approved players only, and every DM", () => {
    const chat = { kind: "group", player: "", players: ["sam", "pat", "gone", "sam"] };
    expect(hooks.wantedMembers(chat, players, ["one"], SERVER)).toEqual([player("sam"), dm("one")]);
  });
});

describe("membershipChanges", () => {
  const phantos = `@phantos:${SERVER}`;

  it("invites and joins the missing, joins the invited, and removes the rest", () => {
    const changes = hooks.membershipChanges(
      [player("a"), player("b"), dm("one")],
      {
        [phantos]: "join",
        [player("b")]: "invite",
        [dm("one")]: "join",
        [player("c")]: "join",
        [player("d")]: "invite",
        [player("e")]: "leave",
      },
      [phantos]
    );
    expect(changes).toEqual({
      invite: [player("a")],
      join: [player("a"), player("b")],
      kick: [player("c"), player("d")],
    });
  });

  it("has nothing to do when the room is in step", () => {
    const changes = hooks.membershipChanges([dm("one")], { [phantos]: "join", [dm("one")]: "join" }, [phantos]);
    expect(changes).toEqual({ invite: [], join: [], kick: [] });
  });

  it("brings back someone who left", () => {
    const changes = hooks.membershipChanges([player("a")], { [player("a")]: "leave" }, []);
    expect(changes).toEqual({ invite: [player("a")], join: [player("a")], kick: [] });
  });
});

describe("rooms", () => {
  it("leave the room to the website: DMs moderate, players write", () => {
    const power = hooks.powerLevels([dm("one")]);
    expect(power.users).toEqual({ [dm("one")]: 50 });
    expect(power.users_default).toBe(0);
    expect(power.events_default).toBe(0);
    expect(power.state_default).toBe(100);
    expect(power.events).toEqual({});
    expect([power.invite, power.kick, power.ban]).toEqual([100, 100, 100]);
    expect(power.redact).toBe(50);
  });

  it("compare power levels by who has what", () => {
    expect(hooks.samePowerUsers({ a: 50, b: 50 }, { b: 50, a: 50 })).toBe(true);
    expect(hooks.samePowerUsers({ a: 50 }, { a: 50, b: 50 })).toBe(false);
    expect(hooks.samePowerUsers({ a: 50 }, { a: 100 })).toBe(false);
  });

  it("are made private, at a pinned version, under the chat's address, saying what they are", () => {
    const chat = { id: "abc123def456ghi", kind: "private", player: "joey", players: [] };
    const request = hooks.createRoomRequest(chat, "Joey (Daymond)", [dm("one")]);
    expect(request.room_version).toBe("12");
    expect(request.preset).toBe("private_chat");
    expect(request.room_alias_name).toBe("chat-abc123def456ghi");
    expect(request.name).toBe("Joey (Daymond)");
    const state = Object.fromEntries(request.initial_state.map((e: any) => [e.type, e.content]));
    expect(state["m.room.history_visibility"]).toEqual({ history_visibility: "invited" });
    expect(state["m.room.guest_access"]).toEqual({ guest_access: "forbidden" });
    expect(state["org.phantos.chat"]).toEqual({ kind: "private", player: "joey", chat: "abc123def456ghi" });
    // The website made the room, so it has every power and is never listed (room version 12).
    expect(Object.keys(request.power_level_content_override.users)).toEqual([dm("one")]);
  });

  it("name a channel after its player and a group by its name", () => {
    const players = { joey: { display: "Joey (Daymond)" } };
    expect(hooks.roomName({ kind: "private", player: "joey" }, players)).toBe("Joey (Daymond)");
    expect(hooks.roomName({ kind: "private", player: "gone" }, players)).toBe("A player");
    expect(hooks.roomName({ kind: "group", name: "  The   Party " }, players)).toBe("The Party");
  });

  it("are read from their state events", () => {
    const state = hooks.readRoomState([
      { type: "m.room.member", state_key: dm("one"), content: { membership: "join" } },
      { type: "m.room.member", state_key: player("a"), content: { membership: "leave" } },
      { type: "m.room.name", state_key: "", content: { name: "The Party" } },
      { type: "m.room.power_levels", state_key: "", content: { users: {} } },
      { type: "org.phantos.chat", state_key: "", content: { kind: "group", player: "", chat: "x" } },
    ]);
    expect(state.members).toEqual({ [dm("one")]: "join", [player("a")]: "leave" });
    expect(state.name).toBe("The Party");
    expect(state.power).toEqual({ users: {} });
    expect(hooks.sameMarker(state.marker, { kind: "group", player: "", chat: "x" })).toBe(true);
    expect(hooks.sameMarker(state.marker, { kind: "group", player: "", chat: "y" })).toBe(false);
    expect(hooks.readRoomState([]).power).toBeNull();
  });
});

describe("roomTitle", () => {
  it("shows a player their channel as the DMs, and a DM the player", () => {
    const channel = { kind: "private" as const, name: "Joey (Daymond)" };
    expect(roomTitle(channel, false)).toBe(PLAYER_CHANNEL_TITLE);
    expect(roomTitle(channel, true)).toBe("Joey (Daymond)");
    expect(roomTitle({ kind: "group", name: "The Party" }, false)).toBe("The Party");
  });
});

describe("sortRooms", () => {
  it("puts channels first, then groups, each by their latest message", () => {
    const rooms = [
      { kind: "group" as const, lastActive: 50, name: "Old group" },
      { kind: "private" as const, lastActive: 10, name: "Quiet player" },
      { kind: "group" as const, lastActive: 90, name: "New group" },
      { kind: "private" as const, lastActive: 80, name: "Busy player" },
      { kind: "private" as const, lastActive: 0, name: "A new player" },
    ];
    expect(sortRooms(rooms).map((r) => r.name)).toEqual([
      "Busy player",
      "Quiet player",
      "A new player",
      "New group",
      "Old group",
    ]);
  });
});

function message(id: string, sender: string, ts: number, body: string | null = id): ChatMessage {
  return { id, sender, senderName: sender.toUpperCase(), body, picture: null, ts, mine: sender === "me", status: "sent" };
}

describe("groupMessages", () => {
  const morning = new Date(2026, 9, 31, 9, 0).getTime();
  const now = new Date(2026, 10, 1, 12, 0).getTime();

  it("divides days and gathers one sender's run of messages", () => {
    const blocks = groupMessages(
      [
        message("1", "alice", morning),
        message("2", "alice", morning + 60_000),
        message("3", "me", morning + 120_000),
        message("4", "me", morning + 120_000 + GROUP_GAP_MS + 1),
        message("5", "me", now - 60_000),
      ],
      now
    );
    expect(blocks.map((b) => (b.type === "day" ? `day:${b.label}` : `${b.sender}:${b.messages.map((m) => m.id).join("")}`))).toEqual([
      "day:Yesterday",
      "alice:12",
      "me:3",
      "me:4",
      "day:Today",
      "me:5",
    ]);
  });

  it("draws nothing for an empty room", () => {
    expect(groupMessages([], now)).toEqual([]);
  });
});

describe("dayLabel", () => {
  const now = new Date(2026, 10, 1, 12, 0).getTime();
  it("names today, yesterday, a day this year, and one in another", () => {
    expect(dayLabel(new Date(2026, 10, 1, 0, 5).getTime(), now)).toBe("Today");
    expect(dayLabel(new Date(2026, 9, 31, 23, 0).getTime(), now)).toBe("Yesterday");
    expect(dayLabel(new Date(2026, 9, 28).getTime(), now)).toBe("Wednesday, Oct 28");
    expect(dayLabel(new Date(2025, 11, 24).getTime(), now)).toBe("Dec 24, 2025");
  });
});

describe("linkify", () => {
  const links = (text: string) => linkify(text).filter((p) => p.href);

  it("links web addresses and leaves the text around them", () => {
    expect(linkify("See https://example.com/a?b=1 now")).toEqual([
      { text: "See " },
      { text: "https://example.com/a?b=1", href: "https://example.com/a?b=1" },
      { text: " now" },
    ]);
  });

  it("leaves the end of a sentence out of the link", () => {
    expect(links("Read https://example.com/page.")[0].text).toBe("https://example.com/page");
    expect(links("(see https://example.com/x)")[0].text).toBe("https://example.com/x");
    expect(links("https://en.wikipedia.org/wiki/Dragon_(disambiguation)")[0].text).toBe(
      "https://en.wikipedia.org/wiki/Dragon_(disambiguation)"
    );
  });

  it("gives a bare www address https", () => {
    expect(links("go to www.example.com")[0]).toEqual({ text: "www.example.com", href: "https://www.example.com/" });
  });

  it("never links anything but http and https", () => {
    expect(links("javascript:alert(1) data:text/html,hi ftp://example.com")).toEqual([]);
    expect(linkify("<b>not html</b>")).toEqual([{ text: "<b>not html</b>" }]);
  });
});

describe("typingLine", () => {
  it("names one or two, and counts more", () => {
    expect(typingLine([])).toBe("");
    expect(typingLine(["Alice"])).toBe("Alice is typing…");
    expect(typingLine(["Alice", "Bob"])).toBe("Alice and Bob are typing…");
    expect(typingLine(["Alice", "Bob", "Cy"])).toBe("Several people are typing…");
  });
});

describe("previewText", () => {
  it("shows who wrote the newest message, on one line", () => {
    expect(previewText({ body: "Hello\nthere", senderName: "Alice", mine: false })).toBe("Alice: Hello there");
    expect(previewText({ body: "Hi", senderName: "Me", mine: true })).toBe("You: Hi");
    expect(previewText({ body: null, senderName: "Alice", mine: false })).toBe("Alice: Attachment");
    const picture = { mxc: "mxc://s/x", mimetype: "image/gif" as const, width: 1, height: 1, size: 1, filename: "a.gif" };
    expect(previewText({ body: "", picture, senderName: "Alice", mine: false })).toBe("Alice: Picture");
    expect(previewText({ body: "The   map", picture, senderName: "Alice", mine: false })).toBe("Alice: The map");
    expect(previewText(null)).toBe("");
  });
});
