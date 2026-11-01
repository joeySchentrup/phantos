import { useState } from "react";
import { deleteGroupChat, errorMessage, saveGroupChat } from "~/backend/api";
import type { ChatRecord } from "~/types/chat";
import type { Player } from "~/types/player";

interface Props {
  /** The group to change; undefined for a new one. */
  group?: ChatRecord;
  /** The approved players, to choose from. */
  players: Player[];
  /** The name of each hero, by ID, to show beside their player. */
  heroNames: Record<string, string>;
  onSaved: (group: ChatRecord) => void;
  onDeleted: () => void;
  onCancel: () => void;
}

const NAME_MAX = 80;

/**
 * A DM's form for a group chat: its name and its players. Every DM is in
 * every group, so only players are listed. Saving makes the change on the
 * site; the chat server follows (and catches up later if it's down).
 */
export default function ChatGroupEditor({ group, players, heroNames, onSaved, onDeleted, onCancel }: Props) {
  const [name, setName] = useState(group?.name ?? "");
  const [chosen, setChosen] = useState<string[]>(group?.players ?? []);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => setChosen((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSaved(await saveGroupChat({ name, players: chosen }, group?.id));
    } catch (err) {
      setError(errorMessage(err, "The group could not be saved."));
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!group || !window.confirm(`Delete “${group.name}”? Everyone is taken out of it, and its messages go with it.`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteGroupChat(group.id);
      onDeleted();
    } catch (err) {
      setError(errorMessage(err, "The group could not be deleted."));
      setBusy(false);
    }
  };

  // A player the group still lists after they were revoked stays listed, so a save keeps them.
  const listed = players.map((p) => p.id);
  const revoked = chosen.filter((id) => !listed.includes(id));

  return (
    <section className="chat-pane" aria-label={group ? `Edit ${group.name}` : "New group"}>
      <header className="chat-header">
        <button type="button" onClick={onCancel} className="chat-back md:hidden" aria-label="Back">
          ‹
        </button>
        <h2 className="chat-header__title">{group ? "Edit group" : "New group"}</h2>
      </header>

      <form onSubmit={onSubmit} className="chat-editor">
        {group?.sync_error && (
          <p role="status" className="chat-notice !mx-0">
            Waiting for the chat server: {group.sync_error}
          </p>
        )}

        <div>
          <label htmlFor="group-name" className="field-label">
            Name
          </label>
          <input
            id="group-name"
            required
            maxLength={NAME_MAX}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="field"
            placeholder="The Party"
          />
        </div>

        <fieldset>
          <legend className="field-label">Players</legend>
          <p className="mb-3 text-sm text-[#c9b78f]">Every Dungeon Master is in every group.</p>
          {players.length ? (
            <ul className="space-y-1">
              {players.map((player) => {
                const hero = heroNames[player.hero];
                return (
                  <li key={player.id}>
                    <label className="chat-check">
                      <input type="checkbox" checked={chosen.includes(player.id)} onChange={() => toggle(player.id)} />
                      <span>
                        {player.name}
                        {hero && <span className="text-[#c9b78f]"> ({hero})</span>}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[#c9b78f]">No players are approved yet.</p>
          )}
          {revoked.length > 0 && (
            <p className="mt-3 text-sm text-[#c9b78f]">
              {revoked.length === 1 ? "One player" : `${revoked.length} players`} in this group no longer approved stay listed,
              and come back in if approved again.
            </p>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="rounded border border-[#d9541e]/50 bg-[#7d150c]/30 px-3 py-2 text-sm text-[#ffcfb8]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy || !name.trim()} className="btn btn-gold flex-1">
            {busy && <span className="spinner" aria-hidden="true" />}
            {group ? "Save" : "Make the group"}
          </button>
          <button type="button" onClick={onCancel} disabled={busy} className="btn btn-ghost">
            Cancel
          </button>
          {group && (
            <button type="button" onClick={onDelete} disabled={busy} className="btn btn-danger">
              Delete
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
