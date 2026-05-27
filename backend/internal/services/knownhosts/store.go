package knownhosts

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

type Entry struct {
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Fingerprint string `json:"fingerprint"`
	KeyType     string `json:"keyType"`
}

type storeData struct {
	Entries []Entry `json:"entries"`
}

type Store struct {
	path string
	mu   sync.RWMutex
	data storeData
}

func NewStore(appDir string) *Store {
	return &Store{
		path: filepath.Join(appDir, "known_hosts.json"),
		data: storeData{Entries: []Entry{}},
	}
}

func (s *Store) Load() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	return json.Unmarshal(data, &s.data)
}

func (s *Store) saveLocked() error {
	raw, err := json.MarshalIndent(s.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(s.path, raw, 0600)
}

func entryKey(host string, port int) string {
	if port <= 0 {
		port = 22
	}
	return fmt.Sprintf("%s:%d", host, port)
}

func (s *Store) Get(host string, port int) (Entry, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	key := entryKey(host, port)
	for _, entry := range s.data.Entries {
		if entryKey(entry.Host, entry.Port) == key {
			return entry, true
		}
	}
	return Entry{}, false
}

func (s *Store) Trust(host string, port int, fingerprint, keyType string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if port <= 0 {
		port = 22
	}
	key := entryKey(host, port)
	filtered := make([]Entry, 0, len(s.data.Entries))
	for _, entry := range s.data.Entries {
		if entryKey(entry.Host, entry.Port) != key {
			filtered = append(filtered, entry)
		}
	}
	filtered = append(filtered, Entry{
		Host:        host,
		Port:        port,
		Fingerprint: fingerprint,
		KeyType:     keyType,
	})
	s.data.Entries = filtered
	return s.saveLocked()
}

func (s *Store) Remove(host string, port int) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	key := entryKey(host, port)
	filtered := make([]Entry, 0, len(s.data.Entries))
	for _, entry := range s.data.Entries {
		if entryKey(entry.Host, entry.Port) != key {
			filtered = append(filtered, entry)
		}
	}
	s.data.Entries = filtered
	return s.saveLocked()
}

func (s *Store) List() []Entry {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Entry, len(s.data.Entries))
	copy(out, s.data.Entries)
	return out
}
