#!/usr/bin/env bash
# Starts everything for local development: PocketBase on :8090, the chat server
# (Synapse on :8008, Element Web on :8009) and the site on :5173.
#
# PocketBase and the chat server keep running in the background after you stop the site
# (Ctrl+C). Stop them with `npm run matrix:down`, and by closing PocketBase's process.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

bash "$DIR/start-pocketbase.sh"
bash "$DIR/start-matrix.sh"

cd "$DIR/.."
exec npm run dev
