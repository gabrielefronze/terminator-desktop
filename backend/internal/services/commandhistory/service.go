package commandhistory

import (
	"context"
	"strings"
	"sync"
	"terminator-desktop/backend/internal/apperror"
	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/vault"
	"time"

	"github.com/google/uuid"
)

// ScopeLocal filters entries to the given host ID; ScopeGlobal searches all hosts.
const (
	ScopeLocal  = "local"
	ScopeGlobal = "global"
)

type Service struct {
	q    *dbgen.Queries
	v    *vault.Vault
	mu   sync.Mutex
}

func NewService(q *dbgen.Queries, v *vault.Vault) *Service {
	return &Service{q: q, v: v}
}

func (s *Service) Append(ctx context.Context, hostID, hostLabel, command string) error {
	command = normalizeCommand(command)
	if len(command) < minCommandLen {
		return nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	store, err := loadStore(ctx, s.q, s.v)
	if err != nil {
		return err
	}

	if isDuplicate(store.Entries, hostID, command) {
		return nil
	}

	store.Entries = append(store.Entries, Entry{
		ID:        uuid.New().String(),
		Command:   command,
		HostID:    hostID,
		HostLabel: hostLabel,
		UsedAt:    time.Now().UTC().Format(time.RFC3339Nano),
	})
	store.Entries = trimEntries(store.Entries)

	return saveStore(ctx, s.q, s.v, store)
}

func (s *Service) Search(
	ctx context.Context,
	query string,
	scope string,
	hostID string,
	limit int,
) ([]Entry, error) {
	query = strings.TrimSpace(strings.ToLower(query))
	if limit <= 0 {
		limit = defaultSearchLimit
	}
	if limit > 200 {
		limit = 200
	}

	store, err := loadStore(ctx, s.q, s.v)
	if err != nil {
		return nil, err
	}

	results := make([]Entry, 0, limit)
	for i := len(store.Entries) - 1; i >= 0; i-- {
		entry := store.Entries[i]
		if scope == ScopeLocal && hostID != "" && entry.HostID != hostID {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(entry.Command), query) {
			continue
		}
		results = append(results, entry)
		if len(results) >= limit {
			break
		}
	}
	return results, nil
}

func (s *Service) Clear(ctx context.Context) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return saveStore(ctx, s.q, s.v, Store{
		Type:    TypeCommandHistory,
		Entries: []Entry{},
	})
}

func (s *Service) ClearHost(ctx context.Context, hostID string) error {
	if hostID == "" {
		return apperror.Validation("host id is required")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	store, err := loadStore(ctx, s.q, s.v)
	if err != nil {
		return err
	}

	filtered := store.Entries[:0]
	for _, entry := range store.Entries {
		if entry.HostID != hostID {
			filtered = append(filtered, entry)
		}
	}
	store.Entries = filtered
	return saveStore(ctx, s.q, s.v, store)
}
