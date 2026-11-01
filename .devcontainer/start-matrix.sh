#!/usr/bin/env bash
# Starts the local chat server in Docker: Synapse on :8008 (with Postgres) and Element Web
# on :8009, then creates the test accounts. Safe to run again: it only starts what isn't
# running and skips accounts that exist.
#
# The stack is deploy/matrix/local/compose.yaml. Its secrets are made up, for this machine only.
set -euo pipefail

# Git Bash on Windows rewrites arguments that look like paths (/data, /config) into
# Windows paths before Docker sees them. This turns that off; it does nothing elsewhere.
export MSYS_NO_PATHCONV=1

# Work from the repo root and give Docker a relative path: an absolute one from Git Bash
# (/c/Users/…) means nothing to Docker on Windows.
cd "$(dirname "${BASH_SOURCE[0]}")/.."
COMPOSE=(docker compose -f deploy/matrix/local/compose.yaml)
SYNAPSE_URL="http://localhost:8008"
ELEMENT_URL="http://localhost:8009"

# The same as registration_shared_secret in deploy/matrix/local/homeserver.local.yaml.
SHARED_SECRET="phantos-local-registration-secret"
PASSWORD="phantos-local"

if ! docker info > /dev/null 2>&1; then
  echo "ERROR: Docker isn't running. Start Docker Desktop (or the Docker service) and try again." >&2
  exit 1
fi

"${COMPOSE[@]}" up -d

echo "Waiting for Synapse (the first start sets up its database, which takes a little while)..."
for i in $(seq 1 90); do
  if curl -sf "$SYNAPSE_URL/health" > /dev/null 2>&1; then
    echo "Synapse is ready."
    break
  fi
  if [ "$i" -eq 90 ]; then
    echo "ERROR: Synapse did not start in time. Its log: docker compose -f deploy/matrix/local/compose.yaml logs synapse" >&2
    exit 1
  fi
  sleep 2
done

# Test accounts with passwords, for Element or any other Matrix app.
register() {
  "${COMPOSE[@]}" exec -T synapse register_new_matrix_user \
    --exists-ok -k "$SHARED_SECRET" -u "$1" -p "$PASSWORD" "$2" "http://localhost:8008" > /dev/null
}
register admin --admin
register alice --no-admin
register bob --no-admin

echo ""
echo "Local chat server ready."
echo "  Synapse:      $SYNAPSE_URL  (server name localhost:8008)"
echo "  Element Web:  $ELEMENT_URL  sign in as admin, alice or bob, password: $PASSWORD"
echo "                admin is a server admin, for Synapse's admin API."
echo "  App service:  as_token phantos-local-as-token (the website's key: MATRIX_AS_TOKEN, which start-pocketbase.sh sets)"
echo ""
echo "  Stop:  npm run matrix:down    Wipe everything:  docker compose -f deploy/matrix/local/compose.yaml down -v"
