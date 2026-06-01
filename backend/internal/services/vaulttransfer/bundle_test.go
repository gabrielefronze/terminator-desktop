package vaulttransfer

import (
	"testing"

	"terminator-desktop/backend/internal/services/blob"
)

func TestBundleRoundTripPlaintext(t *testing.T) {
	payload := VaultPayload{
		Hosts: []blob.Host{{
			ID:   "h1",
			Type: blob.TypeHost,
			Name: "prod",
			Host: "example.com",
			Port: 22,
		}},
		Keys: []blob.SavedKey{{
			ID:         "k1",
			Type:       blob.TypeKey,
			Name:       "key",
			PrivateKey: "secret",
		}},
	}

	data, err := encodeBundle(payload, false, "")
	if err != nil {
		t.Fatal(err)
	}

	decoded, err := decodeBundle(data, "")
	if err != nil {
		t.Fatal(err)
	}

	if len(decoded.Hosts) != 1 || decoded.Hosts[0].Name != "prod" {
		t.Fatalf("unexpected hosts: %+v", decoded.Hosts)
	}
	if len(decoded.Keys) != 1 || decoded.Keys[0].PrivateKey != "secret" {
		t.Fatalf("unexpected keys: %+v", decoded.Keys)
	}
}

func TestBundleRoundTripEncrypted(t *testing.T) {
	payload := VaultPayload{
		Snippets: []blob.SavedSnippet{{
			ID:      "s1",
			Type:    blob.TypeSnippet,
			Name:    "ls",
			Content: "ls -la",
		}},
	}

	data, err := encodeBundle(payload, true, "export-pass")
	if err != nil {
		t.Fatal(err)
	}

	_, err = decodeBundle(data, "wrong")
	if err == nil {
		t.Fatal("expected decryption failure")
	}

	decoded, err := decodeBundle(data, "export-pass")
	if err != nil {
		t.Fatal(err)
	}
	if len(decoded.Snippets) != 1 || decoded.Snippets[0].Content != "ls -la" {
		t.Fatalf("unexpected snippets: %+v", decoded.Snippets)
	}
}
