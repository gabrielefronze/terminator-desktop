<h1 align="center">

Terminator

   <img src="build/appicon.png" width=250 alt="Terminator logo"/>

</h1>

<div align="center">

   [![Discord](https://dcbadge.limes.pink/api/server/x7K9BRrQJE)](https://discord.gg/x7K9BRrQJE)
   
</div>

<h3 align="center">
   Self-hostable SSH client with sync
</h3>

Terminator is a cross-platform SSH client built with [Wails v3](https://v3.wails.io/) and Go. Supports self-hosted servers for sync.

## Features
- **Encryption.** All sensitive data is encrypted locally using Argon2id and AES-256GCM.
- **Sync** encrypted data across multiple devices. Data is encrypted *before* it leaves the client!
- **Lightweight.** ~15MB binaries, ~10MB RAM.
- Cross-platform:
   - [Windows](https://github.com/terminator-ssh/terminator-desktop/releases/latest/download/Terminator-windows-stable-Setup.exe)
   - [Linux](https://github.com/terminator-ssh/terminator-desktop/releases/latest/download/Terminator-linux-stable.AppImage)
   - [MacOS](https://github.com/terminator-ssh/terminator-desktop/releases/latest/download/Terminator-macos-stable-Setup.pkg)
- Local first. You *don't have to* use a server!
- **SSH host key verification** with a local known-hosts store and trust prompts.
- **Hosts & groups** with drag-and-drop organization, icons, and colors.
- **Jump hosts / relay chains** (multi-hop bastion).
- **SSH keys & identities** with passphrase-protected key support.
- **Multi-tab terminals** with split panes, snippets panel, and SFTP browser.
- **Per-host** startup command, environment variables, and terminal font overrides.
- **Port forwarding** (local) on active SSH sessions.
- **Sudo / password picker** for common interactive prompts.

## Server
Terminator is designed as a local-first app, but it supports E2E encrypted sync. Grab the server [here](https://github.com/terminator-ssh/terminator-server)!

## Roadmap
- [x] Encryption
- [x] Sync
- [x] SSH keys
- [x] Host groups
- [x] Jump / relay hosts (multi-hop)
- [x] Interactive passwords (sudo picker + keyboard-interactive auth)
- [x] Custom themes (app accent & background)
- [x] Known host keys & trust UI
- [x] Snippets & startup commands
- [x] SFTP file browser (read-only navigation MVP)
- [x] Local port forwarding
- [x] Split terminal panes
- [ ] Remote / dynamic port forwarding
- [ ] SFTP upload & download
- [ ] Command history (encrypted, searchable)
- [ ] Import / export hosts
- [ ] Multiple profiles (teams?)
- [ ] Android client
- [ ] CLI client

Something missing? Suggest more! [Issues](https://github.com/terminator-ssh/terminator-desktop/issues/new) | [Discord](https://discord.gg/x7K9BRrQJE)

## Screenshots
<img src="assets/term-en-white.png" width="1600" alt="Terminator main screen"/>
<img src="assets/term-t-white.png" width="1600" alt="Terminator terminal"/>

## Development

### Prerequisites

1. [**Go**](https://go.dev/dl/) (1.25+)
2. [**Node.js**](https://nodejs.org/en/download/current) (v24+)
3. *Preferrably* [**pnpm**](https://pnpm.io/installation#using-corepack)
4. [**Wails3 CLI**](https://v3.wails.io/getting-started/installation/)

### Build

For development: just
```
wails3 dev
```

Debug: use remote debug and [delve](https://github.com/go-delve/delve/tree/master/Documentation/installation):
```sh
dlv debug --headless --listen=:2345 ./backend/cmd/terminator-desktop -- dev
```


Package:
```sh
./build.sh          # recommended: sets up PATH for wails3
# or: wails3 task package
```

### Acknowledgements

Inspired by: [Termius](https://termius.com)

Built on: [Wails](https://v3.wails.io)

Beautiful UI: [shadcn](https://ui.shadcn.com)
