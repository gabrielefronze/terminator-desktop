package blob

type ItemType string

const (
	TypeHost     ItemType = "host"
	TypeKey      ItemType = "key"
	TypeGroup    ItemType = "group"
	TypeIdentity ItemType = "identity"
	TypeSnippet  ItemType = "snippet"
	TypeForward  ItemType = "forward"
	TypeTabGroup ItemType = "tabGroup"
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
	Notes               string            `json:"notes,omitempty"`
	Tags                []string          `json:"tags,omitempty"`
}

type SavedSnippet struct {
	ID      string   `json:"id"`
	Type    ItemType `json:"type"`
	Name    string   `json:"name"`
	Content string   `json:"content"`
}

type SavedForward struct {
	ID         string   `json:"id"`
	Type       ItemType `json:"type"`
	Name       string   `json:"name"`
	HostID     string   `json:"hostId"`
	LocalHost  string   `json:"localHost"`
	LocalPort  int      `json:"localPort"`
	RemoteHost string   `json:"remoteHost"`
	RemotePort int      `json:"remotePort"`
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

// TabGroup is a saved multi-host workspace shown in the sidebar.
// HostIDs holds ordered host references; the same host ID may appear more than once.
// TileLayout stores the split-tree positions of hosts by index into HostIDs.
type TabTileLayoutNode struct {
	Kind      string              `json:"kind"`
	HostIndex int                 `json:"hostIndex,omitempty"`
	Direction string              `json:"direction,omitempty"`
	First     *TabTileLayoutNode  `json:"first,omitempty"`
	Second    *TabTileLayoutNode  `json:"second,omitempty"`
}

type TabGroup struct {
	ID         string              `json:"id"`
	Type       ItemType            `json:"type"`
	Name       string              `json:"name"`
	HostIDs    []string            `json:"hostIds"`
	Icon       string              `json:"icon,omitempty"`
	Color      string              `json:"color,omitempty"`
	SortOrder  int                 `json:"sortOrder,omitempty"`
	TileLayout *TabTileLayoutNode  `json:"tileLayout,omitempty"`
}

type SavedKey struct {
	ID         string   `json:"id"`
	Type       ItemType `json:"type"`
	Name       string   `json:"name"`
	PrivateKey string   `json:"privateKey"`
	PublicKey  string   `json:"publicKey,omitempty"`
}
