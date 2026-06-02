package blob

import (
	"context"
	"terminator-desktop/backend/internal/apperror"
	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/vault"

	"github.com/google/uuid"
)

// wrappers for wails

type HostService struct {
	q *dbgen.Queries
	v *vault.Vault
}

func NewHostService(q *dbgen.Queries, v *vault.Vault) *HostService {
	return &HostService{q: q, v: v}
}

func (s *HostService) Save(ctx context.Context, host Host) (string, error) {
	if host.ID == "" {
		host.ID = uuid.New().String()
	}
	host.Type = TypeHost // just in case
	return saveItem(ctx, s.q, s.v, host.ID, host)
}

func (s *HostService) GetAll(ctx context.Context) ([]Host, error) {
	return getAllItems[Host](ctx, s.q, s.v, TypeHost)
}

func (s *HostService) BuiltinLocalhost() Host {
	return defaultLocalhostHost()
}

func (s *HostService) Delete(ctx context.Context, id string) error {
	return deleteItem(ctx, s.q, id)
}

type KeyService struct {
	q *dbgen.Queries
	v *vault.Vault
}

func NewKeyService(q *dbgen.Queries, v *vault.Vault) *KeyService {
	return &KeyService{q: q, v: v}
}

func (s *KeyService) Save(ctx context.Context, key SavedKey) (string, error) {
	if key.ID == "" {
		key.ID = uuid.New().String()
	}
	key.Type = TypeKey // just in case
	fillSavedKeyPublicKey(&key)
	return saveItem(ctx, s.q, s.v, key.ID, key)
}

func (s *KeyService) GetAll(ctx context.Context) ([]SavedKey, error) {
	keys, err := getAllItems[SavedKey](ctx, s.q, s.v, TypeKey)
	if err != nil {
		return nil, err
	}
	for i := range keys {
		fillSavedKeyPublicKey(&keys[i])
	}
	return keys, nil
}

func (s *KeyService) DerivePublicKey(_ context.Context, privateKey string) (string, error) {
	return publicKeyFromPrivate(privateKey)
}

func fillSavedKeyPublicKey(key *SavedKey) {
	if key.PublicKey != "" || key.PrivateKey == "" {
		return
	}
	publicKey, err := publicKeyFromPrivate(key.PrivateKey)
	if err != nil {
		return
	}
	key.PublicKey = publicKey
}

func (s *KeyService) Delete(ctx context.Context, id string) error {
	return deleteItem(ctx, s.q, id)
}

type SnippetService struct {
	q *dbgen.Queries
	v *vault.Vault
}

func NewSnippetService(q *dbgen.Queries, v *vault.Vault) *SnippetService {
	return &SnippetService{q: q, v: v}
}

func (s *SnippetService) Save(ctx context.Context, snippet SavedSnippet) (string, error) {
	if snippet.ID == "" {
		snippet.ID = uuid.New().String()
	}
	snippet.Type = TypeSnippet
	return saveItem(ctx, s.q, s.v, snippet.ID, snippet)
}

func (s *SnippetService) GetAll(ctx context.Context) ([]SavedSnippet, error) {
	return getAllItems[SavedSnippet](ctx, s.q, s.v, TypeSnippet)
}

func (s *SnippetService) Delete(ctx context.Context, id string) error {
	return deleteItem(ctx, s.q, id)
}

type ForwardService struct {
	q *dbgen.Queries
	v *vault.Vault
}

func NewForwardService(q *dbgen.Queries, v *vault.Vault) *ForwardService {
	return &ForwardService{q: q, v: v}
}

func (s *ForwardService) Save(ctx context.Context, forward SavedForward) (string, error) {
	if forward.ID == "" {
		forward.ID = uuid.New().String()
	}
	if forward.Mode == "" {
		forward.Mode = "local"
	}
	if forward.Mode != "local" && forward.Mode != "remote" {
		return "", apperror.Validation("forward mode must be local or remote")
	}
	forward.Type = TypeForward
	return saveItem(ctx, s.q, s.v, forward.ID, forward)
}

func (s *ForwardService) GetAll(ctx context.Context) ([]SavedForward, error) {
	return getAllItems[SavedForward](ctx, s.q, s.v, TypeForward)
}

func (s *ForwardService) Delete(ctx context.Context, id string) error {
	return deleteItem(ctx, s.q, id)
}
