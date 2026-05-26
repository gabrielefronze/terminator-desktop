package blob

import (
	"context"
	"terminator-desktop/backend/internal/apperror"
	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/vault"

	"github.com/google/uuid"
)

type GroupService struct {
	q *dbgen.Queries
	v *vault.Vault
}

func NewGroupService(q *dbgen.Queries, v *vault.Vault) *GroupService {
	return &GroupService{q: q, v: v}
}

func (s *GroupService) Save(ctx context.Context, group HostGroup) (string, error) {
	if group.ID == "" {
		group.ID = uuid.New().String()
	}
	group.Type = TypeGroup
	return saveItem(ctx, s.q, s.v, group.ID, group)
}

func (s *GroupService) GetAll(ctx context.Context) ([]HostGroup, error) {
	return getAllItems[HostGroup](ctx, s.q, s.v, TypeGroup)
}

func (s *GroupService) Delete(ctx context.Context, id string) error {
	groups, err := getAllItems[HostGroup](ctx, s.q, s.v, TypeGroup)
	if err != nil {
		return err
	}
	for _, g := range groups {
		if g.ParentID == id {
			return apperror.Validation("cannot delete group with child groups")
		}
	}

	hosts, err := getAllItems[Host](ctx, s.q, s.v, TypeHost)
	if err != nil {
		return err
	}
	for _, h := range hosts {
		if h.GroupID == id {
			return apperror.Validation("cannot delete group that contains hosts")
		}
	}

	return deleteItem(ctx, s.q, id)
}
