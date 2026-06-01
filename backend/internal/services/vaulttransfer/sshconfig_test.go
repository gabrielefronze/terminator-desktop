package vaulttransfer

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseSSHConfigFile(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "config")
	content := `Host prod
  HostName prod.example.com
  User deploy
  Port 2222
  IdentityFile ~/.ssh/id_ed25519

Host *
  ForwardAgent yes
`
	if err := os.WriteFile(path, []byte(content), 0600); err != nil {
		t.Fatal(err)
	}

	keyPath := filepath.Join(dir, "id_ed25519")
	if err := os.WriteFile(keyPath, []byte("-----BEGIN OPENSSH PRIVATE KEY-----\n"), 0600); err != nil {
		t.Fatal(err)
	}

	// Point IdentityFile at temp key via absolute path in a second host block.
	content2 := `Host staging
  HostName staging.example.com
  IdentityFile ` + keyPath + `
`
	path2 := filepath.Join(dir, "config2")
	if err := os.WriteFile(path2, []byte(content2), 0600); err != nil {
		t.Fatal(err)
	}

	payload, err := parseSSHConfigFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(payload.Hosts) != 1 {
		t.Fatalf("expected 1 host, got %d", len(payload.Hosts))
	}
	host := payload.Hosts[0]
	if host.Name != "prod" || host.Host != "prod.example.com" || host.Port != 2222 || host.Username != "deploy" {
		t.Fatalf("unexpected host: %+v", host)
	}

	payload2, err := parseSSHConfigFile(path2)
	if err != nil {
		t.Fatal(err)
	}
	if len(payload2.Hosts) != 1 {
		t.Fatalf("expected 1 host, got %d", len(payload2.Hosts))
	}
	if len(payload2.Keys) != 1 {
		t.Fatalf("expected 1 key, got %d", len(payload2.Keys))
	}
	if payload2.Hosts[0].KeyID != payload2.Keys[0].ID {
		t.Fatalf("host key not linked")
	}
}
