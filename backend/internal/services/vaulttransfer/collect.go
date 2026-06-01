package vaulttransfer

import (
	"context"

	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/services/blob"
	"terminator-desktop/backend/internal/vault"
)

func collectVaultPayload(ctx context.Context, q *dbgen.Queries, v *vault.Vault) (VaultPayload, error) {
	hosts, err := blob.NewHostService(q, v).GetAll(ctx)
	if err != nil {
		return VaultPayload{}, err
	}
	keys, err := blob.NewKeyService(q, v).GetAll(ctx)
	if err != nil {
		return VaultPayload{}, err
	}
	identities, err := blob.NewIdentityService(q, v).GetAll(ctx)
	if err != nil {
		return VaultPayload{}, err
	}
	snippets, err := blob.NewSnippetService(q, v).GetAll(ctx)
	if err != nil {
		return VaultPayload{}, err
	}
	forwards, err := blob.NewForwardService(q, v).GetAll(ctx)
	if err != nil {
		return VaultPayload{}, err
	}
	groups, err := blob.NewGroupService(q, v).GetAll(ctx)
	if err != nil {
		return VaultPayload{}, err
	}
	tabGroups, err := blob.NewTabGroupService(q, v).GetAll(ctx)
	if err != nil {
		return VaultPayload{}, err
	}

	return VaultPayload{
		Hosts:      hosts,
		Keys:       keys,
		Identities: identities,
		Snippets:   snippets,
		Forwards:   forwards,
		Groups:     groups,
		TabGroups:  tabGroups,
	}, nil
}
