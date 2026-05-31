<h1 align="center">

Elemento Nexus

   <img src="build/appicon.png" width=250 alt="Elemento Nexus logo"/>

</h1>

<div align="center">

   [![Discord](https://dcbadge.limes.pink/api/server/x7K9BRrQJE)](https://discord.gg/x7K9BRrQJE)

</div>

<h3 align="center">
   Local-first SSH client with optional encrypted sync
</h3>

Elemento Nexus is a cross-platform desktop SSH client built with [Wails v3](https://v3.wails.io/), Go, and React. Your vault (hosts, keys, snippets, and more) stays on your machine and is encrypted before anything is stored locally or synced to a server you control.

## Features

### Security & privacy

- **Encrypted vault** — Sensitive data is protected with Argon2id key derivation and AES-256-GCM.
- **Optional sync** — Push encrypted blobs to a self-hosted sync API; the server never sees plaintext.
- **SSH host key verification** — Local known-hosts store with trust prompts before connecting.
- **Touch ID unlock** (macOS) — Unlock the vault with biometrics after enabling it in Settings.

### Connection management

- **Hosts & groups** — Drag-and-drop organization, custom icons, and colors.
- **Identities** — Reusable username/password or key combinations linked to hosts.
- **SSH keys** — Import existing keys, passphrases, or generate Ed25519 / RSA pairs in-app.
- **Jump hosts** — Multi-hop bastion / relay chains.
- **Reachability checks** — TCP probes on the hosts list (online / offline / latency).
- **Per-host options** — Startup command, environment variables, and terminal font overrides.

### Terminal & sessions

- **Multi-tab terminals** — xterm.js sessions with split panes.
- **Tab groups** — Open a saved set of hosts into tabs in one action.
- **Command broadcast** — Send the same input to every pane in a split layout.
- **Snippets** — Quick-insert commands from the terminal toolbar.
- **Local shell** — Optional built-in localhost session (configurable in Settings).
- **Interactive auth** — Sudo / password picker and keyboard-interactive prompts.

### Files & networking

- **SFTP dual-pane browser** — Browse local and remote paths; upload and download files.
- **Port forwarding** — Local forwards on live sessions, plus a library of saved forwards you can start on demand.

### App experience

- **Custom theme** — Accent color and app background.
- **Terminal appearance** — Global font family and size (with per-host overrides).
- **Localization** — English and Russian UI strings.
- **Auto-updates** — Checks GitHub releases after unlock (Velopack on Windows).
- **Lightweight** — Small native binaries and modest memory use.

### Platforms

Downloads from [GitHub Releases](https://github.com/gabrielefronze/terminator-desktop/releases/latest):

- [Windows](https://github.com/gabrielefronze/terminator-desktop/releases/latest/download/ElementoNexus-windows-stable-Setup.exe)
- [Linux (AppImage)](https://github.com/gabrielefronze/terminator-desktop/releases/latest/download/ElementoNexus-linux-stable.AppImage)
- [macOS](https://github.com/gabrielefronze/terminator-desktop/releases/latest/download/ElementoNexus-macos-stable-Setup.pkg)

You can use Elemento Nexus entirely offline — a sync server is optional.

## Sync server

For multi-device sync, run a compatible self-hosted sync API and point the desktop app at it in **Settings → Server**. The sync service only receives encrypted blobs; your master password never leaves the client in cleartext.

## Roadmap

- [x] Encrypted local vault
- [x] E2E encrypted sync
- [x] SSH keys (import + in-app generation)
- [x] Identities
- [x] Host groups
- [x] Jump / relay hosts
- [x] Known host keys & trust UI
- [x] Snippets & per-host startup commands
- [x] Tab groups
- [x] Split terminal panes & command broadcast
- [x] SFTP dual-pane browser with upload & download
- [x] Local port forwarding & saved forwards
- [x] Interactive passwords (sudo picker, keyboard-interactive)
- [x] Custom accent & background theme
- [x] Host reachability indicators
- [x] Touch ID vault unlock (macOS)
- [ ] Remote / dynamic port forwarding
- [ ] Encrypted command history (searchable)
- [ ] Import / export hosts
- [ ] Multiple profiles / teams
- [ ] Android client
- [ ] CLI client

Missing something? [Open an issue](https://github.com/gabrielefronze/terminator-desktop/issues/new) or join [Discord](https://discord.gg/x7K9BRrQJE).

## Screenshots

<img src="assets/term-en-white.png" width="1600" alt="Elemento Nexus hosts view"/>
<img src="assets/term-t-white.png" width="1600" alt="Elemento Nexus terminal with splits"/>

## Development

### Prerequisites

1. [**Go**](https://go.dev/dl/) 1.25+
2. [**Node.js**](https://nodejs.org/en/download/current) 24+
3. [**pnpm**](https://pnpm.io/installation#using-corepack) (recommended)
4. [**Wails v3 CLI**](https://v3.wails.io/getting-started/installation/)

### First-time setup

```sh
./setup.sh
```

### Run in dev mode

```sh
./dev.sh
```

Equivalent to `wails3 dev` with project config and frontend HMR.

### Debug (Delve)

```sh
dlv debug --headless --listen=:2345 ./backend/cmd/terminator-desktop -- dev
```

See [Delve installation](https://github.com/go-delve/delve/tree/master/Documentation/installation).

### Package

```sh
./build.sh          # recommended: ensures wails3 on PATH
# or: wails3 task package
```

Architecture and service layout are documented in [ARCHITECTURE.md](ARCHITECTURE.md).

## Acknowledgements

Inspired by [Termius](https://termius.com).

Built with [Wails](https://v3.wails.io) and UI components from [shadcn/ui](https://ui.shadcn.com).
