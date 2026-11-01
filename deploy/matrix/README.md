# The chat server

Players chat and call from the website through [Synapse](https://github.com/element-hq/synapse), a Matrix server that runs on the NAS. Nobody signs up on it directly. The website creates an account for each approved player and DM, then signs them in itself, so no one has a chat password.

Synapse was chosen over continuwuity and Tuwunel for one reason: Element Call, the call screen the site embeds, [requires delayed events](https://github.com/element-hq/element-call/blob/main/docs/self_hosting.md) ([MSC4140](https://github.com/matrix-org/matrix-spec-proposals/pull/4140)). Without them, someone whose tab closes stays "in the call" as a ghost. As of October 2026, only Synapse has them.

## What runs where

| Where | What | Reached by |
|---|---|---|
| NAS | Synapse and Postgres (`compose.yaml` here) | the browser and PocketBase, through proxy 1 → proxy 2 |
| VM | LiveKit and lk-jwt-service, for calls (step 2, not written yet) | the browser, directly: video doesn't go through the proxies |
| VM | PocketBase, the website | the browser |

The NAS never connects to the VM. Synapse serves its own `/.well-known/matrix/*`, because its server name is the chat subdomain.

## Set up

1. **Datasets.** Make `phantos-matrix/synapse` and `phantos-matrix/postgres` under your apps dataset. Give both to the `apps` user and group (568), applied recursively.
2. **Secrets.** In the TrueNAS shell, run `openssl rand -hex 32` four times, once each for:
   - the Postgres password
   - `macaroon_secret_key`
   - `as_token`
   - `hs_token`
3. **Settings.** Fill in the REPLACE_MEs:
   - `homeserver.yaml` and `phantos-appservice.yaml`: copy both into the `synapse` dataset first, then edit the copies. Check that `apps` can read them.
   - `compose.yaml`: the two dataset paths and the Postgres password, which must match `homeserver.yaml`.
4. **Install.** Apps → Discover Apps → ⋮ → Install via YAML, and paste `compose.yaml`. On first start Synapse creates `signing.key` and its media folder in the `synapse` dataset.
5. **Proxies.** Point the chat subdomain (e.g. `matrix.phantos.example.com`) through proxy 1 and proxy 2 to the NAS, on the host port `compose.yaml` binds:
   - Forward every path. Synapse refuses other servers itself.
   - Allow uploads up to 50 MB.
   - Allow requests to stay open at least 60 seconds, because chat waits up to 30 seconds for new messages.
   - Pass `X-Forwarded-For` and `X-Forwarded-Proto` through.
   - Leave Synapse's CORS headers alone, because the website calls it from another domain.
   - Let PocketBase's container reach the chat subdomain through proxy 2.
6. **Check.** `https://<chat subdomain>/_matrix/client/versions` should return JSON listing Matrix versions. `https://<chat subdomain>/_matrix/federation/v1/version` should return 404, which confirms federation is off.

`homeserver.yaml` limits each person to 500 MB of uploads a day (`media_upload_limits`), on top of the 50 MB a file. The site sends photos shrunk, and GIFs of 15 MB at most, so a table's day of pictures is far below it. Redeploy Synapse after changing it.

Keep the four secrets: the website's side needs `as_token`, and the signing key can't be replaced without wiping the server.

## Switching chat on for the website

PocketBase reads four settings, from its environment (the container's env file). With any of them empty, chat is off and the site works without it.

| Setting | What |
|---|---|
| `MATRIX_URL` | How PocketBase reaches Synapse: the chat subdomain, through proxy 2 |
| `MATRIX_PUBLIC_URL` | The address browsers use, e.g. `https://matrix.phantos.schentrupsoftware.com` |
| `MATRIX_SERVER_NAME` | `server_name` in `homeserver.yaml` |
| `MATRIX_AS_TOKEN` | `as_token` in `phantos-appservice.yaml` |

Two more turn on GIF search, which needs chat on too. Without them, the GIF button is hidden; GIF files can still be sent.

| Setting | What |
|---|---|
| `GIPHY_API_KEY` | A key from [developers.giphy.com](https://developers.giphy.com/). A new key is a beta key: 100 searches an hour for the whole table. The site gives it only to approved players and DMs, because GIPHY requires its search to be called from the browser. |
| `GIPHY_RATING` | How far GIFs go: `g`, `pg`, `pg-13` (when empty) or `r` |

GIPHY's terms ask for its official "Powered by GIPHY" mark wherever its search shows, and it doesn't accept plain text for a production key. Download the mark from your GIPHY developer dashboard and put it in the site's `public/` folder as `powered-by-giphy.png`; until it's there, the picker says "Powered by GIPHY" in text.

Set them on the site's container and restart it. Nothing is built in: PocketBase gives `MATRIX_PUBLIC_URL` to the site (which then shows the Chat section) and adds it to every page's Content-Security-Policy, which is what lets browsers reach the chat server. Check with `curl -I https://<site>/`: the `Content-Security-Policy` header should read `connect-src 'self' <chat address>`.

The first sync runs within ten minutes of PocketBase starting, or as soon as a DM opens the chat page. It makes an account for every DM and approved player, and a channel for each player. A DM sees anything the chat server hasn't caught up with at the bottom of the room list, under "Waiting for the chat server".

## Running it locally

[`local/`](local/) runs the same server on your machine in Docker, with made-up secrets: Synapse on http://localhost:8008 and Element Web, a regular Matrix app, on http://localhost:8009.

```bash
bash .devcontainer/start-matrix.sh   # from Git Bash on Windows
npm run matrix:down                  # stop it (the data stays)
docker compose -f deploy/matrix/local/compose.yaml down -v   # wipe it
```

Synapse reads this folder's `homeserver.yaml` first, then [`local/homeserver.local.yaml`](local/homeserver.local.yaml), which replaces only the server name (`localhost:8008`), the secrets and the database. A change to the production settings reaches the local server on its next restart.

The script creates three accounts with the password `phantos-local`:

- **`admin`:** a server admin, for [Synapse's admin API](https://element-hq.github.io/synapse/latest/usage/administration/admin_api/).
- **`alice`** and **`bob`:** ordinary accounts, for chatting between two Element windows. Use a private window for the second account.

Locally, the website's app service owns only `@player-…`, `@dm-…` and `#chat-…` ([`local/phantos-appservice.local.yaml`](local/phantos-appservice.local.yaml)), so these accounts can exist beside the website's. In production it owns every account.

## Upgrading

Change the Synapse image tag in the app's YAML and redeploy. Read [Synapse's upgrade notes](https://element-hq.github.io/synapse/latest/upgrade.html) first. Postgres major versions (17 → 18) need a dump and restore, not just a new tag.
