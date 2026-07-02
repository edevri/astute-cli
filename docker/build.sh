#!/usr/bin/env bash
# Build all local service images for offline astute-cli development.
# Run from repos/astute-cli/:  ./docker/build.sh
#
# Each Python service needs astute-common-python installed from local source
# (no GitLab token required). We create a temporary build context per service
# that contains both the service source and common-python, matching what
# Dockerfile.service expects.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS="$(cd "$SCRIPT_DIR/../.." && pwd)"
DOCKERFILE="$SCRIPT_DIR/Dockerfile.service"
PLATFORM="${DOCKER_PLATFORM:-linux/arm64}"

build_python_service() {
  local name="$1"           # image name suffix, e.g. service-authenticate
  local repo="$2"           # path to service repo relative to $REPOS
  local app_module="${3:-app:main_app}"  # gunicorn app module

  echo ""
  echo "▶ Building astute-local/$name ..."

  docker build \
    --platform "$PLATFORM" \
    --build-arg "APP_MODULE=$app_module" \
    --build-context "common-python=$REPOS/common-python" \
    --build-context "service=$REPOS/$repo" \
    -f "$DOCKERFILE" \
    -t "astute-local/$name" \
    "$SCRIPT_DIR"

  echo "✓ astute-local/$name"
}

build_node_service() {
  local name="$1"
  local repo="$2"

  echo ""
  echo "▶ Building astute-local/$name ..."
  docker build --platform "$PLATFORM" -t "astute-local/$name" "$REPOS/$repo"
  echo "✓ astute-local/$name"
}

# ── postgres with demo data ───────────────────────────────────────────────
echo "▶ Building preview-sql ..."
docker build --platform "$PLATFORM" -t preview-sql "$REPOS/db"
echo "✓ preview-sql"

# ── Python services ───────────────────────────────────────────────────────
build_python_service service-authenticate  service-authenticate
build_python_service service-user          service-user
build_python_service service-organization  service-organization
build_python_service service-patient       service-patient
build_python_service service-study         service-study
build_python_service service-order         service-order
build_python_service service-protocol      service-protocol
build_python_service service-storage-azure service-storage-azure app:app
build_python_service service-calc-generate service-calc-generate
build_python_service service-calc          service-calc
build_python_service service-mark          service-mark

# ── Node services ─────────────────────────────────────────────────────────
build_node_service bff-cli bff-cli

# mcp-cli depends on astute-core via file: dep, so build context must be repos/ root
echo ""
echo "▶ Building astute-local/mcp-cli ..."
docker build \
  --platform "$PLATFORM" \
  -f "$REPOS/mcp-cli/Dockerfile" \
  -t "astute-local/mcp-cli" \
  "$REPOS"
echo "✓ astute-local/mcp-cli"

build_node_service web-cli web-cli

echo ""
echo "All images built. Run: docker compose up"
