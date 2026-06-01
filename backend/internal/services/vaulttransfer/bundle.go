package vaulttransfer

import (
	"encoding/json"
	"time"

	"terminator-desktop/backend/internal/apperror"
	"terminator-desktop/backend/internal/crypto"
)

func encodeBundle(payload VaultPayload, encrypted bool, password string) ([]byte, error) {
	rawPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	bundle := vaultBundle{
		Version:    bundleVersion,
		ExportedAt: time.Now().UTC().Format(time.RFC3339Nano),
		Encrypted:  encrypted,
	}

	if encrypted {
		if password == "" {
			return nil, apperror.Validation("export password is required for encrypted bundles")
		}
		salt, err := randomSaltBase64()
		if err != nil {
			return nil, err
		}
		key, err := crypto.DeriveKEK(password, salt)
		if err != nil {
			return nil, err
		}
		ciphertext, err := crypto.EncryptAndPack(rawPayload, key)
		if err != nil {
			return nil, err
		}
		bundle.KdfSalt = salt
		bundle.Payload = ciphertext
	} else {
		bundle.Payload = string(rawPayload)
	}

	return json.MarshalIndent(bundle, "", "  ")
}

func decodeBundle(data []byte, password string) (VaultPayload, error) {
	var bundle vaultBundle
	if err := json.Unmarshal(data, &bundle); err != nil {
		return VaultPayload{}, apperror.Validation("invalid vault bundle file")
	}
	if bundle.Version != bundleVersion {
		return VaultPayload{}, apperror.Validation("unsupported vault bundle version")
	}
	if bundle.Payload == "" {
		return VaultPayload{}, apperror.Validation("vault bundle is empty")
	}

	var rawPayload []byte
	if bundle.Encrypted {
		if password == "" {
			return VaultPayload{}, apperror.Validation("password is required for encrypted bundles")
		}
		if bundle.KdfSalt == "" {
			return VaultPayload{}, apperror.Validation("vault bundle is missing encryption salt")
		}
		key, err := crypto.DeriveKEK(password, bundle.KdfSalt)
		if err != nil {
			return VaultPayload{}, err
		}
		rawPayload, err = crypto.UnpackAndDecrypt(bundle.Payload, key)
		if err != nil {
			return VaultPayload{}, err
		}
	} else {
		rawPayload = []byte(bundle.Payload)
	}

	var payload VaultPayload
	if err := json.Unmarshal(rawPayload, &payload); err != nil {
		return VaultPayload{}, apperror.Validation("invalid vault bundle payload")
	}
	return payload, nil
}
