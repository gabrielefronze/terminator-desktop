#!/usr/bin/env bash
# Build Terminator Desktop for redistribution (production package).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

readonly BIN_DIR="$ROOT/bin"
readonly APP_NAME="terminator"

die() {
  echo "error: $*" >&2
  exit 1
}

info() {
  echo "==> $*"
}

usage() {
  cat <<'EOF'
Usage: ./build.sh [command] [options]

Commands:
  package     Production package for the current OS (default)
  build       Compile the binary only (no installer / bundle)
  universal   macOS only: universal binary .app (Intel + Apple Silicon)
  zip         macOS only: package, then create a distributable .zip

Options:
  -h, --help  Show this help

Examples:
  ./build.sh
  ./build.sh package
  ./build.sh zip

Outputs (under bin/):
  macOS     terminator.app
  Windows   terminator.exe (+ NSIS installer when packaging on Windows)
  Linux     terminator binary, AppImage, .deb, .rpm (when packaging on Linux)

Requires Go, Node, pnpm, and wails3. Run ./setup.sh if tools are missing.
EOF
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

ensure_wails3() {
  ensure_go_bin_on_path
  if command -v wails3 >/dev/null 2>&1; then
    return
  fi
  if [[ -x "$ROOT/setup.sh" ]]; then
    info "wails3 not on PATH; running setup.sh"
    "$ROOT/setup.sh"
    ensure_go_bin_on_path
  fi
  if ! command -v wails3 >/dev/null 2>&1; then
    die "wails3 not found. Run ./setup.sh, then add to PATH:
  export PATH=\"\$(go env GOPATH)/bin:\$PATH\""
  fi
}

ensure_frontend_deps() {
  if [[ ! -d "$ROOT/frontend/node_modules" ]]; then
    info "frontend/node_modules missing; running setup.sh"
    "$ROOT/setup.sh"
  fi
}

describe_artifacts() {
  local os
  os="$(uname -s)"
  echo ""
  info "Build finished. Artifacts in $BIN_DIR:"
  case "$os" in
    Darwin)
      if [[ -d "$BIN_DIR/${APP_NAME}.app" ]]; then
        echo "  $BIN_DIR/${APP_NAME}.app"
        du -sh "$BIN_DIR/${APP_NAME}.app" 2>/dev/null | awk '{print "  (" $1 ")"}'
      fi
      ;;
    MINGW*|MSYS*|CYGWIN*)
      find "$BIN_DIR" -maxdepth 2 \( -name '*.exe' -o -name '*.msi' \) 2>/dev/null | sed 's/^/  /' || true
      ;;
    Linux)
      find "$BIN_DIR" -maxdepth 2 \( -name "$APP_NAME" -o -name '*.AppImage' -o -name '*.deb' -o -name '*.rpm' \) 2>/dev/null | sed 's/^/  /' || true
      ;;
    *)
      ls -1 "$BIN_DIR" 2>/dev/null | sed 's/^/  /' || true
      ;;
  esac
  echo ""
  echo "macOS note: ad-hoc signed builds may require Right-click → Open the first time."
  echo "Public release: sign/notarize (wails3 task darwin:sign:notarize) and pack with Velopack (see .github/workflows/release.yaml)."
}

cmd_package() {
  ensure_wails3
  ensure_frontend_deps
  info "Packaging for $(uname -s) ($(uname -m))"
  wails3 task package
  describe_artifacts
}

cmd_build() {
  ensure_wails3
  ensure_frontend_deps
  info "Building binary for $(uname -s) ($(uname -m))"
  wails3 task build
  describe_artifacts
}

cmd_universal() {
  [[ "$(uname -s)" == "Darwin" ]] || die "universal builds are only supported on macOS"
  ensure_wails3
  ensure_frontend_deps
  info "Packaging universal macOS .app"
  wails3 task darwin:package:universal
  describe_artifacts
}

cmd_zip() {
  [[ "$(uname -s)" == "Darwin" ]] || die "zip is only supported on macOS"
  cmd_package
  local app="$BIN_DIR/${APP_NAME}.app"
  [[ -d "$app" ]] || die "expected $app after package"
  local version zip_name
  version="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$app/Contents/Info.plist" 2>/dev/null || echo "local")"
  zip_name="$BIN_DIR/Terminator-macos-${version}.zip"
  info "Creating $zip_name"
  rm -f "$zip_name"
  ditto -c -k --keepParent "$app" "$zip_name"
  echo "  $zip_name"
  du -sh "$zip_name" | awk '{print "  (" $1 ")"}'
}

main() {
  local cmd="${1:-package}"
  case "$cmd" in
    -h|--help|help)
      usage
      exit 0
      ;;
    package|build|universal|zip)
      shift || true
      ;;
    *)
      die "unknown command: $cmd (run ./build.sh --help)"
      ;;
  esac

  case "$cmd" in
    package) cmd_package "$@" ;;
    build) cmd_build "$@" ;;
    universal) cmd_universal "$@" ;;
    zip) cmd_zip "$@" ;;
  esac
}

main "$@"
