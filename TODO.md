# Elemento Nexus — TODO

Tracking planned work beyond what is already shipped. See [README.md](README.md#roadmap) for the public feature list and screenshots.

Items are grouped by suggested priority. Check boxes off as work lands.

---

## High priority

Quick wins and features that unblock adoption or daily use.

- [x] **Import / export vault data**
  - Export hosts, keys, identities, snippets, forwards, tab groups as encrypted or plaintext bundle (user choice).
  - Import from bundle and from `~/.ssh/config` (+ optional `known_hosts` merge).
  - *Touches:* `backend/internal/services/blob/`, new import/export service, Settings UI.

- [ ] **Global command palette (`⌘K` / `Ctrl+K`)**
  - Connect to host, open tab group, insert snippet, navigate views, open settings.
  - *Touches:* new palette component, `useConnectHost`, `sessionStore`, `uiStore`.

- [ ] **Encrypted command history**
  - Capture commands per session (or globally), store encrypted in vault, searchable from palette or terminal toolbar.
  - *Touches:* new blob type or SQLite table, terminal input hook in `TerminalInstance.tsx`, crypto via vault.

- [x] **Vault auto-lock**
  - Lock after configurable idle timeout; optional lock on system sleep.
  - *Touches:* `AuthService`, `LockScreen`, settings JSON in `SettingsService`.

- [ ] **Session restore**
  - Persist open tabs (host IDs, split layout, active tab) across app restarts; offer reconnect on launch.
  - *Touches:* `sessionStore`, disk persistence (settings or encrypted blob), `TerminalStack` / `TitleBar`.

---

## Medium priority

Completes the SSH/networking story and improves power-user workflows.

- [ ] **Remote port forwarding**
  - `-R` style forwards on live sessions; saved remote forwards in the forwards library.
  - *Touches:* `backend/internal/services/ssh/`, `SavedForward` model, `ForwardsPage`, `PortForwardPanel`.

- [ ] **Dynamic port forwarding (SOCKS proxy)**
  - Local SOCKS listener on a session; optional saved proxy profiles.
  - *Touches:* SSH layer, forwards UI, tunnel indicator in title bar.

- [ ] **SSH agent forwarding**
  - Per-host toggle; forward local agent through jump chains.
  - *Touches:* `Host` model, `SSHConnectionConfig`, connect path in `ssh.go`.

- [ ] **SSH keep-alive & reconnect**
  - TCP/SSH keep-alive to prevent silent drops; optional auto-reconnect with user prompt.
  - *Touches:* `backend/internal/services/ssh/ssh.go`, terminal disconnect UI.

- [ ] **Terminal find (`⌘F` / `Ctrl+F`)**
  - xterm.js SearchAddon in active pane.
  - *Touches:* `TerminalInstance.tsx`, `@xterm/addon-search`.

- [ ] **Keyboard shortcuts expansion**
  - Close tab, next/prev tab, disconnect, quick-connect from host search.
  - Document in a shortcuts cheatsheet (Settings or `?` overlay).
  - *Touches:* `frontend/src/lib/keyboardShortcuts.ts`, hooks in `App.tsx`.

- [ ] **SFTP file management**
  - Remote rename, delete, mkdir; optional chmod and “edit remote file” (download → edit → upload).
  - *Touches:* `SshService` SFTP methods, `SftpDualPane.tsx`.

- [ ] **Host notes & tags**
  - Free-text notes and/or tag list on hosts; filter hosts by tag.
  - *Touches:* `Host` in `models.go`, `HostModal`, `HostsPage` search/filter.

---

## Lower priority / larger bets

From the public roadmap and longer-horizon platform work.

- [ ] **Multiple profiles / teams**
  - Separate vaults or team-shared sync spaces; profile switcher on lock screen.
  - *Touches:* SQLite schema (multi-user), auth, sync, UI shell. See [ARCHITECTURE.md](ARCHITECTURE.md) design note on single-user SQLite today.

- [ ] **CLI client**
  - Headless connect/list hosts using the same encrypted vault (e.g. `nexus connect prod-web`).
  - *Touches:* new `backend/cmd/` entry point; reuse blob + ssh services.

- [ ] **Android client**
  - Separate codebase; sync via existing E2E encrypted API.

- [ ] **Biometrics on Windows & Linux**
  - Windows Hello; platform-appropriate Linux APIs. macOS Touch ID already shipped (`backend/internal/biometric/`).

- [ ] **Terminal color schemes**
  - Presets (Dracula, Solarized, etc.) and/or custom ANSI palette; global default with per-host override.
  - *Touches:* `frontend/src/lib/terminalTheme.ts`, Settings, `Host` model.

- [ ] **Additional locales**
  - UI is en + ru today (`frontend/public/locales/`). Add languages as needed.

- [ ] **Auto-updates on macOS & Linux**
  - Windows uses Velopack; align update UX on other platforms (`UpdaterService`, release CI).

---

## Docs & housekeeping

- [ ] **Update ARCHITECTURE.md** — Host key verification is implemented (`knownhosts` + `hostkey.go`); remove stale `InsecureIgnoreHostKey()` note.
- [ ] **Keep README roadmap in sync** — When items above ship, check them off in [README.md](README.md#roadmap).

---

## Ideas backlog (unprioritized)

- Connection / audit log (who connected when — local only).
- Per-host advanced SSH: `ProxyCommand`, cipher/KEX overrides, compression.
- Drag-and-drop file upload in SFTP panes.
- URL / path click detection in terminal output.
- Snippet variables (e.g. `{{hostname}}`, `{{user}}`).
- Export public keys to clipboard / `authorized_keys` format helper.
- Plugin or scripting hook (out of scope until core stabilizes).

---

## Suggested sprint order

1. Import / export + `~/.ssh/config` import  
2. Command palette + terminal find  
3. Auto-lock + session restore  
4. Encrypted command history  
5. Remote / dynamic forwarding + agent forwarding  

Adjust based on user feedback — migration pain → prioritize import; ops-heavy users → history and forwards first.
