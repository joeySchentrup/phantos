#!/usr/bin/env bash
# Starts a local PocketBase on :8090 with this repo's migrations and hooks.
# The migrations create the collections and seed the lore on first start.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PB_VERSION="0.40.4"
PB_DIR="$ROOT/.local-pocketbase"
PB_DATA="$PB_DIR/pb_data"
PB_BIN="$PB_DIR/pocketbase"
ENV_FILE="$ROOT/.env.development.local"

ADMIN_EMAIL="admin@local.test"
ADMIN_PASSWORD="admin12345678"
PB_URL="http://localhost:8090"

# Local Dungeon Master account; override in .env.
export DM_EMAIL="${DM_EMAIL:-dm@local.test}"
export DM_PASSWORD="${DM_PASSWORD:-dungeonmaster}"
export LORE_DIR="$ROOT/lore"

mkdir -p "$PB_DATA"

# Load server-side secrets (e.g. OPENAI_API_KEY) if present. `set -a` exports
# everything defined in the file so the PocketBase process inherits it.
SECRETS_FILE="$ROOT/.env"
if [ -f "$SECRETS_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
  set +a
  echo "Loaded server-side env from $SECRETS_FILE"
fi

# Download PocketBase binary if not already present
if [ ! -f "$PB_BIN" ]; then
  echo "Downloading PocketBase v${PB_VERSION}..."
  curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_amd64.zip" -o /tmp/pb.zip
  unzip -o /tmp/pb.zip -d "$PB_DIR" pocketbase
  chmod +x "$PB_BIN"
  rm /tmp/pb.zip
  echo "PocketBase downloaded."
fi

# Stop any existing instance on port 8090
pkill -f "pocketbase serve.*8090" 2>/dev/null || true
sleep 1

"$PB_BIN" serve --http=0.0.0.0:8090 --dir="$PB_DATA" \
  --hooksDir="$ROOT/pb_hooks" --migrationsDir="$ROOT/pb_migrations" > "$PB_DIR/pb.log" 2>&1 &
echo "PocketBase started (PID $!), log: $PB_DIR/pb.log"

echo "Waiting for PocketBase to be ready..."
for i in $(seq 1 30); do
  if curl -sf "$PB_URL/api/health" > /dev/null 2>&1; then
    echo "PocketBase is ready."
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "ERROR: PocketBase did not start in time. Check $PB_DIR/pb.log"
    exit 1
  fi
  sleep 1
done

# Create (or update) the superuser — idempotent
"$PB_BIN" superuser upsert "$ADMIN_EMAIL" "$ADMIN_PASSWORD" --dir="$PB_DATA"

# Write the Vite env file so the dev server uses the local PocketBase
echo "VITE_POCKETBASE_URL=$PB_URL" > "$ENV_FILE"
echo "Wrote $ENV_FILE"

echo ""
echo "Local PocketBase ready at $PB_URL"
echo "  Admin panel:     $PB_URL/_/  ($ADMIN_EMAIL / $ADMIN_PASSWORD)"
echo "  Dungeon Master:  http://localhost:5173/dm  ($DM_EMAIL / $DM_PASSWORD)"
