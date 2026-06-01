package sessionrestore

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

const snapshotVersion = 1

// SavedTileNode mirrors the frontend tab-group tile JSON shape.
type SavedTileNode struct {
	Kind      string         `json:"kind"`
	HostIndex int            `json:"hostIndex,omitempty"`
	Direction string         `json:"direction,omitempty"`
	First     *SavedTileNode `json:"first,omitempty"`
	Second    *SavedTileNode `json:"second,omitempty"`
}

type Tab struct {
	HostIds    []string       `json:"hostIds"`
	TileLayout *SavedTileNode `json:"tileLayout,omitempty"`
	TabGroupId string         `json:"tabGroupId,omitempty"`
}

type Snapshot struct {
	Version        int    `json:"version"`
	Tabs           []Tab  `json:"tabs"`
	ActiveTabIndex int    `json:"activeTabIndex"`
	ActiveHostId   string `json:"activeHostId"`
}

type Service struct {
	path string
	mu   sync.RWMutex
}

func NewService(appDir string) *Service {
	return &Service{
		path: filepath.Join(appDir, "session-restore.json"),
	}
}

func (s *Service) HasSnapshot() (bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	_, err := os.Stat(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (s *Service) GetSnapshot() (Snapshot, bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return Snapshot{}, false, nil
		}
		return Snapshot{}, false, err
	}

	var snapshot Snapshot
	if err := json.Unmarshal(data, &snapshot); err != nil {
		return Snapshot{}, false, err
	}
	if snapshot.Version != snapshotVersion || len(snapshot.Tabs) == 0 {
		return Snapshot{}, false, nil
	}
	return snapshot, true, nil
}

func (s *Service) SaveSnapshot(snapshot Snapshot) error {
	if len(snapshot.Tabs) == 0 {
		return s.ClearSnapshot()
	}

	snapshot.Version = snapshotVersion

	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := json.MarshalIndent(snapshot, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.path, data, 0600)
}

func (s *Service) ClearSnapshot() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	err := os.Remove(s.path)
	if err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}
