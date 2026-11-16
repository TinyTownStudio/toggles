#!/usr/bin/env bash
# Build must already have produced toggles:ci. Runs app on an internal Docker network and
# executes packages/app/scripts/e2e-docker.mjs from a throwaway Node container on that network.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
IMAGE="${DOCKER_E2E_IMAGE:-toggles:ci}"
NET="${DOCKER_E2E_NETWORK:-toggles-ci-internal}"
APP_NAME="${DOCKER_E2E_CONTAINER:-toggles-ci-e2e}"
DB_VOL="${DOCKER_E2E_DB_VOLUME:-toggles-ci-e2e-db}"
NODE_RUNNER_IMAGE="${DOCKER_E2E_NODE_IMAGE:-node:26-bookworm-slim}"

BETTER_AUTH_SECRET="${CI_TEST_BETTER_AUTH_SECRET:-ci-test-better-auth-secret}"
POLAR_ACCESS_TOKEN="${CI_TEST_POLAR_ACCESS_TOKEN:-ci-test-polar-access-token}"
POLAR_WEBHOOK_SECRET="${CI_TEST_POLAR_WEBHOOK_SECRET:-ci-test-polar-webhook-secret}"
POLAR_PRO_PRODUCT_ID="${CI_TEST_POLAR_PRO_PRODUCT_ID:-ci-test-polar-pro-product-id}"

BASE_HOST="${APP_NAME}"
BASE_URL="http://${BASE_HOST}:3000"
REQUEST_ORIGIN="$BASE_URL"

cleanup() {
  docker logs "$APP_NAME" 2>&1 || true
  docker rm -f "$APP_NAME" 2>/dev/null || true
  docker network rm "$NET" 2>/dev/null || true
  docker volume rm "$DB_VOL" 2>/dev/null || true
}
trap cleanup EXIT

docker network inspect "$NET" >/dev/null 2>&1 || docker network create --internal "$NET"
docker volume create "$DB_VOL" >/dev/null

echo "Applying SQLite migrations via one-off container (image does not migrate on start)..."
docker run --rm \
  -v "${DB_VOL}:/data" \
  -w /app/packages/app \
  -e DATABASE_URL=/data/toggles.db \
  "$IMAGE" \
  pnpm exec drizzle-kit migrate --config ./drizzle.config.node.ts

echo "Starting Toggles on internal network ${NET}..."
docker run -d --name "$APP_NAME" \
  --network "$NET" \
  --network-alias "$APP_NAME" \
  -v "${DB_VOL}:/data" \
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