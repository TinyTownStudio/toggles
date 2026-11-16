#!/usr/bin/env bash
# Build must already have produced toggles:ci. Runs app on an internal Docker network and
# executes packages/app/scripts/e2e-docker.mjs from a throwaway Node container on that network.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IMAGE="${DOCKER_E2E_IMAGE:-toggles:ci}"
NET="${DOCKER_E2E_NETWORK:-toggles-ci-internal}"
APP_NAME="${DOCKER_E2E_CONTAINER:-toggles-ci-e2e}"
NODE_RUNNER_IMAGE="${DOCKER_E2E_NODE_IMAGE:-node:26-bookworm-slim}"

BETTER_AUTH_SECRET="${CI_TEST_BETTER_AUTH_SECRET:-ci-test-better-auth-secret}"
POLAR_ACCESS_TOKEN="${CI_TEST_POLAR_ACCESS_TOKEN:-ci-test-polar-access-token}"
POLAR_WEBHOOK_SECRET="${CI_TEST_POLAR_WEBHOOK_SECRET:-ci-test-polar-webhook-secret}"
POLAR_PRO_PRODUCT_ID="${CI_TEST_POLAR_PRO_PRODUCT_ID:-ci-test-polar-pro-product-id}"

BASE_HOST="${APP_NAME}"
BASE_URL="http://${BASE_HOST}:3000"
REQUEST_ORIGIN="$BASE_URL"

resolve_better_sqlite3_mount() {
  local link="${ROOT}/packages/app/node_modules/better-sqlite3"
  if [ ! -e "$link" ]; then
    return 1
  fi
  readlink -f "$link"
}

BSQLITE_MOUNT="$(resolve_better_sqlite3_mount || true)"
if [ -z "$BSQLITE_MOUNT" ]; then
  echo "Docker e2e failed: better-sqlite3 not found for bind-mount (run pnpm install)"
  exit 1
fi
# The built image may omit optional better-sqlite3; mount from the runner so DATABASE_URL mode works in CI.
BSQLITE_DOCKER_FLAGS=(
  -v "${BSQLITE_MOUNT}:/app/packages/app/node_modules/better-sqlite3:ro"
  -v "${BSQLITE_MOUNT}:/app/node_modules/better-sqlite3:ro"
)

DB_DIR="${DOCKER_E2E_DB_DIR:-}"
CREATED_DB_DIR=0
if [ -z "$DB_DIR" ]; then
  DB_DIR="$(mktemp -d)"
  CREATED_DB_DIR=1
fi
DB_FILE="${DB_DIR}/toggles.db"

cleanup() {
  docker logs "$APP_NAME" 2>&1 || true
  docker rm -f "$APP_NAME" 2>/dev/null || true
  docker network rm "$NET" 2>/dev/null || true
  if [ "$CREATED_DB_DIR" = 1 ]; then
    rm -rf "$DB_DIR"
  fi
}
trap cleanup EXIT

if ! command -v node >/dev/null 2>&1; then
  echo "Docker e2e failed: node is required on the host to apply migrations"
  exit 1
fi
if [ ! -e "${ROOT}/packages/app/node_modules/better-sqlite3" ]; then
  echo "Docker e2e failed: install repo dependencies (pnpm install) before running migrations"
  exit 1
fi

docker network inspect "$NET" >/dev/null 2>&1 || docker network create --internal "$NET"

echo "Applying SQLite migrations on runner (image does not migrate on start)..."
(
  cd "${ROOT}/packages/app"
  DATABASE_URL="$DB_FILE" pnpm exec node scripts/migrate-sqlite-node.mjs
)

echo "Starting Toggles on internal network ${NET}..."
docker run -d --name "$APP_NAME" \
  --network "$NET" \
  --network-alias "$APP_NAME" \
  "${BSQLITE_DOCKER_FLAGS[@]}" \
  -v "${DB_DIR}:/data" \
  -e BETTER_AUTH_SECRET="$BETTER_AUTH_SECRET" \
  -e BETTER_AUTH_URL="${BASE_URL}/api/auth" \
  -e APP_ORIGIN="$REQUEST_ORIGIN" \
  -e DATABASE_URL=/data/toggles.db \
  -e POLAR_ACCESS_TOKEN="$POLAR_ACCESS_TOKEN" \
  -e POLAR_WEBHOOK_SECRET="$POLAR_WEBHOOK_SECRET" \
  -e POLAR_PRO_PRODUCT_ID="$POLAR_PRO_PRODUCT_ID" \
  -e LOCAL=true \
  -e PRODUCT_BETA=false \
  "$IMAGE"

echo "Waiting for /ping..."
for attempt in $(seq 1 45); do
  if docker run --rm --network "$NET" "$NODE_RUNNER_IMAGE" \
    node -e "fetch('${BASE_URL}/ping').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
  break
  fi
  if [ "$attempt" -eq 45 ]; then
    echo "Docker e2e failed: /ping did not respond in time"
    exit 1
  fi
  sleep 2
done

echo "Running e2e assertions from Node on ${NET}..."
docker run --rm --network "$NET" \
  -v "${ROOT}/packages/app/scripts:/scripts:ro" \
  -e BASE_URL="$BASE_URL" \
  -e REQUEST_ORIGIN="$REQUEST_ORIGIN" \
  "$NODE_RUNNER_IMAGE" \
  node /scripts/e2e-docker.mjs