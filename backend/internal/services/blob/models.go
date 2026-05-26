package blob

type ItemType string

const (
	TypeHost  ItemType = "host"
	TypeKey   ItemType = "key"
	TypeGroup ItemType = "group"
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
	KeyID    string   `json:"keyId,omitempty"`
	GroupID  string   `json:"groupId,omitempty"`
}

type HostGroup struct {
	ID        string   `json:"id"`
	Type      ItemType `json:"type"`
	Name      string   `json:"name"`
	ParentID  string   `json:"parentId,omitempty"`
	SortOrder int      `json:"sortOrder,omitempty"`
}

type SavedKey struct {
	ID         string   `json:"id"`
	Type       ItemType `json:"type"`
	Name       string   `json:"name"`
	PrivateKey string   `json:"privateKey"`
}
