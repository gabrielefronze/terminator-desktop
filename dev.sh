#!/usr/bin/env bash
# Start Elemento Nexus in Wails development mode (Go rebuild + Vite HMR).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

readonly CONFIG="./build/config.yml"
readonly VITE_PORT="${WAILS_VITE_PORT:-9245}"

die() {
  echo "error: $*" >&2
  exit 1
}

ensure_go_bin_on_path() {
  if ! command -v go >/dev/null 2>&1; then
    return
  fi
  local go_bin gobin
  go_bin="$(go env GOPATH)/bin"
  if [[ -d "$go_bin" ]] && [[ ":$PATH:" != *":${go_bin}:"* ]]; then
    export PATH="${go_bin}:${PATH}"
  fi
  gobin="$(go env GOBIN)"
  if [[ -n "$gobin" && -d "$gobin" ]] && [[ ":$PATH:" != *":${gobin}:"* ]]; then
    export PATH="${gobin}:${PATH}"
  fi
}

ensure_go_bin_on_path

if ! command -v wails3 >/dev/null 2>&1; then
  die "wails3 not found. Run ./setup.sh first."
fi

if [[ ! -d frontend/node_modules ]]; then
  echo "warning: frontend/node_modules missing; running setup.sh" >&2
  "$ROOT/setup.sh"
fi

exec wails3 dev -config "$CONFIG" -port "$VITE_PORT" "$@"
