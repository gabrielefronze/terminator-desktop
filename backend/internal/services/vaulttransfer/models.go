package vaulttransfer

import "terminator-desktop/backend/internal/services/blob"

const bundleVersion = 1

// VaultPayload is the decrypted contents of an export bundle.
type VaultPayload struct {
	Hosts      []blob.Host          `json:"hosts"`
	Keys       []blob.SavedKey      `json:"keys"`
	Identities []blob.SavedIdentity `json:"identities"`
	Snippets   []blob.SavedSnippet  `json:"snippets"`
	Forwards   []blob.SavedForward  `json:"forwards"`
	Groups     []blob.HostGroup     `json:"groups"`
	TabGroups  []blob.TabGroup      `json:"tabGroups"`
}

// vaultBundle is the on-disk JSON format.
type vaultBundle struct {
	Version    int    `json:"version"`
	ExportedAt string `json:"exportedAt"`
	Encrypted  bool   `json:"encrypted"`
	KdfSalt    string `json:"kdfSalt,omitempty"`
	Payload    string `json:"payload,omitempty"`
}

// ImportResult counts items added during an import.
type ImportResult struct {
	HostsImported      int `json:"hostsImported"`
	KeysImported       int `json:"keysImported"`
	IdentitiesImported int `json:"identitiesImported"`
	SnippetsImported   int `json:"snippetsImported"`
	ForwardsImported   int `json:"forwardsImported"`
	GroupsImported     int `json:"groupsImported"`
	TabGroupsImported  int `json:"tabGroupsImported"`
	KnownHostsMerged   int `json:"knownHostsMerged"`
	Cancelled          bool `json:"cancelled"`
}

// ExportResult is returned after a successful export.
type ExportResult struct {
	Path      string `json:"path"`
	Cancelled bool   `json:"cancelled"`
}
