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

# Load server-side settings (e.g. DM_EMAIL / DM_PASSWORD) if present. `set -a` exports
# everything defined in the file so the PocketBase process inherits it.
SECRETS_FILE="$ROOT/.env"
if [ -f "$SECRETS_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$SECRETS_FILE"
  set +a
  echo "Loaded server-side env from $SECRETS_FILE"
fi

# Vite serves the pages here, not PocketBase, so the RSS feed's links point at
# it. Set after .env is loaded so that an empty SITE_URL there still gets it.
export SITE_URL="${SITE_URL:-http://localhost:5173}"

# The local chat server (.devcontainer/start-matrix.sh, deploy/matrix/local/), unless .env
# names another. The token is the made-up one in phantos-appservice.local.yaml.
export MATRIX_URL="${MATRIX_URL:-http://localhost:8008}"
export MATRIX_PUBLIC_URL="${MATRIX_PUBLIC_URL:-http://localhost:8008}"
export MATRIX_SERVER_NAME="${MATRIX_SERVER_NAME:-localhost:8008}"
export MATRIX_AS_TOKEN="${MATRIX_AS_TOKEN:-phantos-local-as-token}"

# Download PocketBase for this machine if it isn't here yet. On Windows (Git Bash) the
# binary is pocketbase.exe, which Git Bash also finds by the plain name in $PB_BIN.
if [ ! -f "$PB_BIN" ]; then
  case "$(uname -s)" in
    Linux*) PB_OS=linux ;;
    Darwin*) PB_OS=darwin ;;
    MINGW* | MSYS* | CYGWIN*) PB_OS=windows ;;
    *) echo "ERROR: no PocketBase download for $(uname -s)" >&2; exit 1 ;;
  esac
  case "$(uname -m)" in
    x86_64 | amd64) PB_ARCH=amd64 ;;
    aarch64 | arm64) PB_ARCH=arm64 ;;
    *) echo "ERROR: no PocketBase download for $(uname -m)" >&2; exit 1 ;;
  esac
  PB_FILE="pocketbase"
  if [ "$PB_OS" = windows ]; then PB_FILE="pocketbase.exe"; fi

  echo "Downloading PocketBase v${PB_VERSION} (${PB_OS}_${PB_ARCH})..."
  PB_ZIP="$PB_DIR/pocketbase.zip"
  curl -fsSL "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_${PB_OS}_${PB_ARCH}.zip" -o "$PB_ZIP"
  unzip -o "$PB_ZIP" -d "$PB_DIR" "$PB_FILE"
  chmod +x "$PB_DIR/$PB_FILE"
  rm "$PB_ZIP"
  echo "PocketBase downloaded."
fi

# Stop any existing instance on port 8090. Git Bash on Windows has no pkill, and there
# PocketBase doesn't reload changed hooks either, so running this again is how to.
if command -v pkill > /dev/null 2>&1; then
  pkill -f "pocketbase serve.*8090" 2>/dev/null || true
else
  taskkill //IM pocketbase.exe //F > /dev/null 2>&1 || true
fi
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
