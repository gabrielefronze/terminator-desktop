package blob

import (
	"context"
	"strings"
	"testing"

	"golang.org/x/crypto/ssh"
)

func TestGenerateKeyPairEd25519(t *testing.T) {
	svc := &KeyService{}
	got, err := svc.GenerateKeyPair(context.Background(), GenerateSSHKeyRequest{
		Algorithm: KeyAlgorithmEd25519,
		Comment:   "test-key",
	})
	if err != nil {
		t.Fatalf("GenerateKeyPair: %v", err)
	}
	if got.Algorithm != KeyAlgorithmEd25519 {
		t.Fatalf("algorithm = %q", got.Algorithm)
	}
	if !strings.Contains(got.PrivateKey, "BEGIN OPENSSH PRIVATE KEY") {
		t.Fatalf("private key PEM missing header")
	}
	if !strings.HasPrefix(got.PublicKey, "ssh-ed25519 ") {
		t.Fatalf("public key = %q", got.PublicKey)
	}
	if got.Fingerprint == "" {
		t.Fatal("fingerprint empty")
	}

	_, err = ssh.ParsePrivateKey([]byte(got.PrivateKey))
	if err != nil {
		t.Fatalf("ParsePrivateKey: %v", err)
	}
}

func TestGenerateKeyPairRSA4096(t *testing.T) {
	svc := &KeyService{}
	got, err := svc.GenerateKeyPair(context.Background(), GenerateSSHKeyRequest{
		Algorithm: KeyAlgorithmRSA4096,
	})
	if err != nil {
		t.Fatalf("GenerateKeyPair: %v", err)
	}
	if got.Algorithm != KeyAlgorithmRSA4096 {
		t.Fatalf("algorithm = %q", got.Algorithm)
	}
	if !strings.HasPrefix(got.PublicKey, "ssh-rsa ") {
		t.Fatalf("public key = %q", got.PublicKey)
	}
}

func TestPublicKeyFromPrivateEd25519(t *testing.T) {
	svc := &KeyService{}
	generated, err := svc.GenerateKeyPair(context.Background(), GenerateSSHKeyRequest{
		Algorithm: KeyAlgorithmEd25519,
	})
	if err != nil {
		t.Fatalf("GenerateKeyPair: %v", err)
	}

	publicKey, err := publicKeyFromPrivate(generated.PrivateKey)
	if err != nil {
		t.Fatalf("publicKeyFromPrivate: %v", err)
	}
	if publicKey != generated.PublicKey {
		t.Fatalf("derived = %q want %q", publicKey, generated.PublicKey)
	}
}

func TestNormalizeKeyAlgorithm(t *testing.T) {
	if got := normalizeKeyAlgorithm(""); got != KeyAlgorithmEd25519 {
		t.Fatalf("empty = %q", got)
	}
	if got := normalizeKeyAlgorithm("RSA4096"); got != KeyAlgorithmRSA4096 {
		t.Fatalf("rsa4096 = %q", got)
	}
}
