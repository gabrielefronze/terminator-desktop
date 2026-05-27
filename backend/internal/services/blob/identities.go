package blob

import (
	"context"
	"terminator-desktop/backend/internal/apperror"
	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/vault"

	"github.com/google/uuid"
)

type IdentityService struct {
	q *dbgen.Queries
	v *vault.Vault
}

func NewIdentityService(q *dbgen.Queries, v *vault.Vault) *IdentityService {
	return &IdentityService{q: q, v: v}
}

func (s *IdentityService) Save(ctx context.Context, identity SavedIdentity) (string, error) {
	if identity.ID == "" {
		identity.ID = uuid.New().String()
	}
	identity.Type = TypeIdentity
	return saveItem(ctx, s.q, s.v, identity.ID, identity)
}

func (s *IdentityService) GetAll(ctx context.Context) ([]SavedIdentity, error) {
	return getAllItems[SavedIdentity](ctx, s.q, s.v, TypeIdentity)
}

func (s *IdentityService) Delete(ctx context.Context, id string) error {
	hosts, err := getAllItems[Host](ctx, s.q, s.v, TypeHost)
	if err != nil {
		return err
	}
	for _, h := range hosts {
		if h.IdentityID == id || containsString(h.UserpassIdentityIDs, id) {
			return apperror.Validation("cannot delete identity that is used by hosts")
		}
	}

	return deleteItem(ctx, s.q, id)
}

func containsString(values []string, target string) bool {
	for _, value := range values {
		if value == target {
			return true
		}
	}
	return false
}
