#!/usr/bin/env bash
# One-time (or repeat) development environment setup for Elemento Nexus.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

readonly MIN_GO_MAJOR=1
readonly MIN_GO_MINOR=25
readonly MIN_NODE_MAJOR=24
readonly PNPM_VERSION=11.1.2

die() {
  echo "error: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

# Go installs CLIs to $(go env GOPATH)/bin; prepend if missing from PATH.
GO_BIN_ADDED_TO_PATH=0

ensure_go_bin_on_path() {
  local go_bin gobin
  go_bin="$(go env GOPATH)/bin"
  if [[ -d "$go_bin" ]] && [[ ":$PATH:" != *":${go_bin}:"* ]]; then
    export PATH="${go_bin}:${PATH}"
    GO_BIN_ADDED_TO_PATH=1
  fi
  gobin="$(go env GOBIN)"
  if [[ -n "$gobin" && -d "$gobin" ]] && [[ ":$PATH:" != *":${gobin}:"* ]]; then
    export PATH="${gobin}:${PATH}"
    GO_BIN_ADDED_TO_PATH=1
  fi
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    die "$1 is required. $2"
  fi
}

version_ge() {
  # usage: version_ge <major> <minor> <have_major> <have_minor>
  if [[ "$3" -gt "$1" ]] || { [[ "$3" -eq "$1" ]] && [[ "$4" -ge "$2" ]]; }; then
    return 0
  fi
  return 1
}

check_go() {
  require_cmd go "Install Go ${MIN_GO_MAJOR}.${MIN_GO_MINOR}+ from https://go.dev/dl/"
  local ver
  ver="$(go version | sed -nE 's/.*go([0-9]+)\.([0-9]+).*/\1 \2/p')"
  local major="${ver%% *}" minor="${ver##* }"
  if [[ -z "$major" ]] || ! version_ge "$MIN_GO_MAJOR" "$MIN_GO_MINOR" "$major" "$minor"; then
    die "Go ${MIN_GO_MAJOR}.${MIN_GO_MINOR}+ is required (found: $(go version))"
  fi
  info "Go $(go version | awk '{print $3}')"
}

check_node() {
  require_cmd node "Install Node.js ${MIN_NODE_MAJOR}+ from https://nodejs.org/"
  local ver
  ver="$(node -v | sed -nE 's/^v?([0-9]+).*/\1/p')"
  if [[ -z "$ver" ]] || [[ "$ver" -lt "$MIN_NODE_MAJOR" ]]; then
    die "Node.js ${MIN_NODE_MAJOR}+ is required (found: $(node -v))"
  fi
  info "Node $(node -v)"
}

activate_pnpm() {
  require_cmd corepack "Install Node.js with Corepack, or install pnpm: https://pnpm.io/installation"
  corepack enable
  corepack prepare "pnpm@${PNPM_VERSION}" --activate
  require_cmd pnpm "Failed to activate pnpm via Corepack"
}

ensure_pnpm() {
  if ! command -v pnpm >/dev/null 2>&1; then
    info "pnpm not found; enabling via Corepack"
    activate_pnpm
  else
    local pnpm_major
    pnpm_major="$(pnpm --version | sed -nE 's/^([0-9]+).*/\1/p')"
    if [[ -n "$pnpm_major" && "$pnpm_major" -lt 11 ]]; then
      info "Upgrading pnpm to ${PNPM_VERSION} via Corepack (matches CI)"
      activate_pnpm
    fi
  fi
  info "pnpm $(pnpm --version)"
}

ensure_wails3() {
  ensure_go_bin_on_path

  if command -v wails3 >/dev/null 2>&1; then
    info "wails3 $(wails3 version 2>/dev/null || echo '(installed)')"
    return
  fi

  info "Installing Wails v3 CLI"
  go install github.com/wailsapp/wails/v3/cmd/wails3@latest
  ensure_go_bin_on_path

  if ! command -v wails3 >/dev/null 2>&1; then
    die "wails3 install failed (expected at $(go env GOPATH)/bin/wails3)"
  fi
  info "wails3 installed at $(command -v wails3)"
}

path_hint() {
  if [[ "$GO_BIN_ADDED_TO_PATH" -eq 1 ]]; then
    echo ""
    echo "Tip: persist Go tools on PATH by adding to ~/.zshrc (or ~/.bashrc):"
    echo "  export PATH=\"\$(go env GOPATH)/bin:\$PATH\""
    echo ""
  fi
}

linux_hint() {
  if [[ "$(uname -s)" != "Linux" ]]; then
    return
  fi
  echo ""
  echo "Linux note: if the app fails to build or run, install GTK/WebKit dev packages, e.g."
  echo "  sudo apt-get install -y pkg-config libgtk-3-dev libwebkit2gtk-4.1-dev"
  echo ""
}

main() {
  info "Setting up Elemento Nexus (root: $ROOT)"

  check_go
  check_node
  ensure_pnpm
  ensure_wails3

  info "Installing frontend dependencies"
  (cd frontend && pnpm install --frozen-lockfile)

  info "Downloading Go modules"
  go mod download
  go mod tidy

  linux_hint
  path_hint

  info "Setup complete. Run ./dev.sh to start development."
}

main "$@"
