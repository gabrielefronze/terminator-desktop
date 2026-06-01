package vaulttransfer

import (
	"context"

	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/services/blob"
	"terminator-desktop/backend/internal/vault"

	"github.com/google/uuid"
)

func importPayload(ctx context.Context, q *dbgen.Queries, v *vault.Vault, payload VaultPayload) (ImportResult, error) {
	idMap := make(map[string]string)

	remap := func(id string) string {
		if id == "" {
			return ""
		}
		if mapped, ok := idMap[id]; ok {
			return mapped
		}
		mapped := uuid.New().String()
		idMap[id] = mapped
		return mapped
	}

	result := ImportResult{}

	groupSvc := blob.NewGroupService(q, v)
	for _, group := range payload.Groups {
		oldID := group.ID
		group.ID = remap(group.ID)
		group.ParentID = remap(group.ParentID)
		if _, err := groupSvc.Save(ctx, group); err != nil {
			return result, err
		}
		idMap[oldID] = group.ID
		result.GroupsImported++
	}

	keySvc := blob.NewKeyService(q, v)
	for _, key := range payload.Keys {
		oldID := key.ID
		key.ID = remap(key.ID)
		if _, err := keySvc.Save(ctx, key); err != nil {
			return result, err
		}
		idMap[oldID] = key.ID
		result.KeysImported++
	}

	identitySvc := blob.NewIdentityService(q, v)
	for _, identity := range payload.Identities {
		oldID := identity.ID
		identity.ID = remap(identity.ID)
		if _, err := identitySvc.Save(ctx, identity); err != nil {
			return result, err
		}
		idMap[oldID] = identity.ID
		result.IdentitiesImported++
	}

	hostSvc := blob.NewHostService(q, v)
	for _, host := range payload.Hosts {
		host.ID = remap(host.ID)
		host.KeyID = remap(host.KeyID)
		host.IdentityID = remap(host.IdentityID)
		host.GroupID = remap(host.GroupID)
		host.RelayHostID = remap(host.RelayHostID)
		if len(host.UserpassIdentityIDs) > 0 {
			remapped := make([]string, 0, len(host.UserpassIdentityIDs))
			for _, identityID := range host.UserpassIdentityIDs {
				remapped = append(remapped, remap(identityID))
			}
			host.UserpassIdentityIDs = remapped
		}
		if _, err := hostSvc.Save(ctx, host); err != nil {
			return result, err
		}
		result.HostsImported++
	}

	snippetSvc := blob.NewSnippetService(q, v)
	for _, snippet := range payload.Snippets {
		snippet.ID = remap(snippet.ID)
		if _, err := snippetSvc.Save(ctx, snippet); err != nil {
			return result, err
		}
		result.SnippetsImported++
	}

	forwardSvc := blob.NewForwardService(q, v)
	for _, forward := range payload.Forwards {
		forward.ID = remap(forward.ID)
		forward.HostID = remap(forward.HostID)
		if _, err := forwardSvc.Save(ctx, forward); err != nil {
			return result, err
		}
		result.ForwardsImported++
	}

	tabGroupSvc := blob.NewTabGroupService(q, v)
	for _, tabGroup := range payload.TabGroups {
		tabGroup.ID = remap(tabGroup.ID)
		if len(tabGroup.HostIDs) > 0 {
			remapped := make([]string, 0, len(tabGroup.HostIDs))
			for _, hostID := range tabGroup.HostIDs {
				remapped = append(remapped, remap(hostID))
			}
			tabGroup.HostIDs = remapped
		}
		if _, err := tabGroupSvc.Save(ctx, tabGroup); err != nil {
			return result, err
		}
		result.TabGroupsImported++
	}

	return result, nil
}
