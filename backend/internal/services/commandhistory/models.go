package commandhistory

type ItemType string

const (
	TypeCommandHistory ItemType = "commandHistory"
	StoreBlobID        = "command-history-v1"
)

type Entry struct {
	ID        string `json:"id"`
	Command   string `json:"command"`
	HostID    string `json:"hostId"`
	HostLabel string `json:"hostLabel"`
	UsedAt    string `json:"usedAt"`
}

type Store struct {
	Type    ItemType `json:"type"`
	Entries []Entry  `json:"entries"`
}

const (
	maxEntries     = 3000
	minCommandLen  = 2
	maxCommandLen  = 4096
	defaultSearchLimit = 50
)
