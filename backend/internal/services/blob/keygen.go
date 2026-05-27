package blob

import (
	"context"
	"crypto/ed25519"
	"crypto/rand"
	"crypto/rsa"
	"encoding/pem"
	"errors"
	"fmt"
	"strings"

	"golang.org/x/crypto/ssh"
)

const (
	KeyAlgorithmEd25519 = "ed25519"
	KeyAlgorithmRSA4096 = "rsa4096"
	KeyAlgorithmRSA2048 = "rsa2048"

	defaultKeyComment = "terminator-desktop"
)

var (
	ErrUnsupportedKeyAlgorithm = errors.New("unsupported key algorithm")
)

type GenerateSSHKeyRequest struct {
	Algorithm string `json:"algorithm"`
	Comment   string `json:"comment"`
}

type GeneratedSSHKey struct {
	Algorithm   string `json:"algorithm"`
	PrivateKey  string `json:"privateKey"`
	PublicKey   string `json:"publicKey"`
	Fingerprint string `json:"fingerprint"`
}

func normalizeKeyAlgorithm(algorithm string) string {
	switch strings.ToLower(strings.TrimSpace(algorithm)) {
	case KeyAlgorithmRSA4096:
		return KeyAlgorithmRSA4096
	case KeyAlgorithmRSA2048:
		return KeyAlgorithmRSA2048
	default:
		return KeyAlgorithmEd25519
	}
}

func normalizeKeyComment(comment string) string {
	comment = strings.TrimSpace(comment)
	if comment == "" {
		return defaultKeyComment
	}
	return comment
}

func (s *KeyService) GenerateKeyPair(
	_ context.Context,
	req GenerateSSHKeyRequest,
) (GeneratedSSHKey, error) {
	algorithm := normalizeKeyAlgorithm(req.Algorithm)
	comment := normalizeKeyComment(req.Comment)

	var privateKey any
	var sshPublicKey ssh.PublicKey
	var err error

	switch algorithm {
	case KeyAlgorithmEd25519:
		_, priv, genErr := ed25519.GenerateKey(rand.Reader)
		if genErr != nil {
			return GeneratedSSHKey{}, fmt.Errorf("generate ed25519 key: %w", genErr)
		}
		privateKey = priv
		sshPublicKey, err = ssh.NewPublicKey(priv.Public())
	case KeyAlgorithmRSA4096:
		privateKey, sshPublicKey, err = generateRSAKeyPair(4096)
	case KeyAlgorithmRSA2048:
		privateKey, sshPublicKey, err = generateRSAKeyPair(2048)
	default:
		return GeneratedSSHKey{}, ErrUnsupportedKeyAlgorithm
	}
	if err != nil {
		return GeneratedSSHKey{}, err
	}

	privateKeyPEM, err := marshalOpenSSHPrivateKey(privateKey, comment)
	if err != nil {
		return GeneratedSSHKey{}, err
	}

	publicKey := strings.TrimSpace(string(ssh.MarshalAuthorizedKey(sshPublicKey)))
	fingerprint := ssh.FingerprintSHA256(sshPublicKey)

	return GeneratedSSHKey{
		Algorithm:   algorithm,
		PrivateKey:  privateKeyPEM,
		PublicKey:   publicKey,
		Fingerprint: fingerprint,
	}, nil
}

func generateRSAKeyPair(bits int) (*rsa.PrivateKey, ssh.PublicKey, error) {
	key, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		return nil, nil, fmt.Errorf("generate rsa-%d key: %w", bits, err)
	}
	pub, err := ssh.NewPublicKey(&key.PublicKey)
	if err != nil {
		return nil, nil, fmt.Errorf("ssh public key: %w", err)
	}
	return key, pub, nil
}

func publicKeyFromPrivate(privateKeyPEM string) (string, error) {
	privateKeyPEM = strings.TrimSpace(privateKeyPEM)
	if privateKeyPEM == "" {
		return "", errors.New("private key is empty")
	}

	signer, err := ssh.ParsePrivateKey([]byte(privateKeyPEM))
	if err != nil {
		return "", fmt.Errorf("parse private key: %w", err)
	}

	return strings.TrimSpace(string(ssh.MarshalAuthorizedKey(signer.PublicKey()))), nil
}

func marshalOpenSSHPrivateKey(privateKey any, comment string) (string, error) {
	block, err := ssh.MarshalPrivateKey(privateKey, comment)
	if err != nil {
		return "", fmt.Errorf("marshal private key: %w", err)
	}
	return string(pem.EncodeToMemory(block)), nil
}
