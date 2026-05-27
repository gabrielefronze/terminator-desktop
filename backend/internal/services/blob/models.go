package blob

type ItemType string

const (
	TypeHost     ItemType = "host"
	TypeKey      ItemType = "key"
	TypeGroup    ItemType = "group"
	TypeIdentity ItemType = "identity"
	TypeSnippet  ItemType = "snippet"
)

type VaultItemHeader struct {
	Type ItemType `json:"type"`
}

type Host struct {
	ID       string   `json:"id"`
	Type     ItemType `json:"type"`
	Name     string   `json:"name"`
	Host     string   `json:"host"`
	Port     int      `json:"port"`
	Username string   `json:"username"`
	Password string   `json:"password,omitempty"`
	KeyID      string   `json:"keyId,omitempty"`
	IdentityID string   `json:"identityId,omitempty"`
	UserpassIdentityIDs []string `json:"userpassIdentityIds,omitempty"`
	GroupID     string   `json:"groupId,omitempty"`
	RelayHostID string   `json:"relayHostId,omitempty"`
	Icon        string   `json:"icon,omitempty"`
	Color       string   `json:"color,omitempty"`
	StartupCommand      string            `json:"startupCommand,omitempty"`
	Environment         map[string]string `json:"environment,omitempty"`
	TerminalFontFamily  string            `json:"terminalFontFamily,omitempty"`
	TerminalFontSize    int               `json:"terminalFontSize,omitempty"`
}

type SavedSnippet struct {
	ID      string   `json:"id"`
	Type    ItemType `json:"type"`
	Name    string   `json:"name"`
	Content string   `json:"content"`
}

type SavedIdentity struct {
	ID       string   `json:"id"`
	Type     ItemType `json:"type"`
	Name     string   `json:"name"`
	Username string   `json:"username"`
	Password string   `json:"password"`
}

type HostGroup struct {
	ID        string   `json:"id"`
	Type      ItemType `json:"type"`
	Name      string   `json:"name"`
	ParentID  string   `json:"parentId,omitempty"`
	SortOrder int      `json:"sortOrder,omitempty"`
	Icon      string   `json:"icon,omitempty"`
	Color     string   `json:"color,omitempty"`
}

type SavedKey struct {
	ID         string   `json:"id"`
	Type       ItemType `json:"type"`
	Name       string   `json:"name"`
	PrivateKey string   `json:"privateKey"`
	PublicKey  string   `json:"publicKey,omitempty"`
}
