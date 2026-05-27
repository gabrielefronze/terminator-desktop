package ssh

import (
	"fmt"
	"net"
	"terminator-desktop/backend/internal/apperror"

	"golang.org/x/crypto/ssh"
)

type HostKeyVerifier interface {
	IsTrusted(host string, port int, fingerprint string) bool
}

func hostKeyCallback(host string, port int, verifier HostKeyVerifier) ssh.HostKeyCallback {
	if port <= 0 {
		port = 22
	}
	return func(_ string, _ net.Addr, key ssh.PublicKey) error {
		if verifier == nil {
			return fmt.Errorf("host key verification is not configured")
		}
		fingerprint := ssh.FingerprintSHA256(key)
		if verifier.IsTrusted(host, port, fingerprint) {
			return nil
		}
		return apperror.New(
			apperror.CodeSSHHostKeyNotTrusted,
			fmt.Sprintf("host key for %s:%d is not trusted", host, port),
			nil,
		)
	}
}
