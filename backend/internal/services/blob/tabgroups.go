package blob

import (
	"context"
	"slices"

	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/vault"

	"github.com/google/uuid"
)

type TabGroupService struct {
	q *dbgen.Queries
	v *vault.Vault
}

func NewTabGroupService(q *dbgen.Queries, v *vault.Vault) *TabGroupService {
	return &TabGroupService{q: q, v: v}
}

func (s *TabGroupService) Save(ctx context.Context, group TabGroup) (string, error) {
	if group.ID == "" {
		group.ID = uuid.New().String()
	}
	group.Type = TypeTabGroup
	if group.HostIDs == nil {
		group.HostIDs = []string{}
	}
	return saveItem(ctx, s.q, s.v, group.ID, group)
}

func (s *TabGroupService) GetAll(ctx context.Context) ([]TabGroup, error) {
	return getAllItems[TabGroup](ctx, s.q, s.v, TypeTabGroup)
}

func (s *TabGroupService) Delete(ctx context.Context, id string) error {
	return deleteItem(ctx, s.q, id)
}

// RemoveHostInstance drops one host reference from a specific tab group.
// Groups with no remaining hosts are deleted.
func (s *TabGroupService) RemoveHostInstance(ctx context.Context, groupID, hostID string) error {
	groups, err := getAllItems[TabGroup](ctx, s.q, s.v, TypeTabGroup)
	if err != nil {
		return err
	}

	for _, group := range groups {
		if group.ID != groupID {
			continue
		}
		index := slices.Index(group.HostIDs, hostID)
		if index < 0 {
			return nil
		}
		nextIDs := append(slices.Clone(group.HostIDs[:index]), group.HostIDs[index+1:]...)
		if len(nextIDs) == 0 {
			return deleteItem(ctx, s.q, group.ID)
		}
		group.HostIDs = nextIDs
		_, err := saveItem(ctx, s.q, s.v, group.ID, group)
		return err
	}

	return nil
}

// RemoveHostFromAllGroups drops every reference to a host from all tab groups.
// Used when a host is deleted from the vault.
func (s *TabGroupService) RemoveHostFromAllGroups(ctx context.Context, hostID string) error {
	groups, err := getAllItems[TabGroup](ctx, s.q, s.v, TypeTabGroup)
	if err != nil {
		return err
	}

	for _, group := range groups {
		nextIDs := slices.DeleteFunc(slices.Clone(group.HostIDs), func(id string) bool {
			return id == hostID
		})
		if len(nextIDs) == len(group.HostIDs) {
			continue
		}
		if len(nextIDs) == 0 {
			if err := deleteItem(ctx, s.q, group.ID); err != nil {
				return err
			}
			continue
		}
		group.HostIDs = nextIDs
		if _, err := saveItem(ctx, s.q, s.v, group.ID, group); err != nil {
			return err
		}
	}

	return nil
}
