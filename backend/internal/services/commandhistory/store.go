package commandhistory

import (
	"context"
	"encoding/json"
	"strings"
	"terminator-desktop/backend/internal/crypto"
	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/vault"
	"time"
)

func loadStore(ctx context.Context, q *dbgen.Queries, v *vault.Vault) (Store, error) {
	mk, err := v.GetMasterKey()
	if err != nil {
		return Store{}, err
	}

	blobs, err := q.GetActiveBlobs(ctx)
	if err != nil {
		return Store{}, err
	}

	var packed string
	for _, blob := range blobs {
		if blob.ID == StoreBlobID {
			packed = blob.Blob
			break
		}
	}
	if packed == "" {
		return Store{Type: TypeCommandHistory, Entries: []Entry{}}, nil
	}

	decrypted, err := crypto.UnpackAndDecrypt(packed, mk)
	if err != nil {
		return Store{}, err
	}

	var store Store
	if err := json.Unmarshal(decrypted, &store); err != nil {
		return Store{}, err
	}
	if store.Type != TypeCommandHistory {
		store.Type = TypeCommandHistory
	}
	if store.Entries == nil {
		store.Entries = []Entry{}
	}
	return store, nil
}

func saveStore(ctx context.Context, q *dbgen.Queries, v *vault.Vault, store Store) error {
	mk, err := v.GetMasterKey()
	if err != nil {
		return err
	}

	store.Type = TypeCommandHistory
	raw, err := json.Marshal(store)
	if err != nil {
		return err
	}

	packed, err := crypto.EncryptAndPack(raw, mk)
	if err != nil {
		return err
	}

	return q.UpsertBlob(ctx, dbgen.UpsertBlobParams{
		ID:        StoreBlobID,
		Blob:      packed,
		UpdatedAt: time.Now().UTC().Format(time.RFC3339Nano),
		IsDeleted: false,
	})
}

func normalizeCommand(command string) string {
	command = strings.TrimSpace(command)
	if len(command) > maxCommandLen {
		command = command[:maxCommandLen]
	}
	return command
}

func isDuplicate(entries []Entry, hostID, command string) bool {
	if len(entries) == 0 {
		return false
	}
	last := entries[len(entries)-1]
	return last.HostID == hostID && last.Command == command
}

func trimEntries(entries []Entry) []Entry {
	if len(entries) <= maxEntries {
		return entries
	}
	return entries[len(entries)-maxEntries:]
}
