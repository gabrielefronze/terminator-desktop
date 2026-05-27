package ssh

import (
	"fmt"
	"strings"
	"terminator-desktop/backend/internal/apperror"

	"golang.org/x/crypto/ssh"
)

type authOptions struct {
	password                    string
	privateKey                  string
	keyPassphrase               string
	keyboardInteractivePassword string
}

func authMethods(opts authOptions) ([]ssh.AuthMethod, error) {
	var methods []ssh.AuthMethod

	if opts.privateKey != "" {
		signer, err := parsePrivateKey(opts.privateKey, opts.keyPassphrase)
		if err != nil {
			return nil, err
		}
		methods = append(methods, ssh.PublicKeys(signer))
	}

	if opts.password != "" {
		methods = append(methods, ssh.Password(opts.password))
	}

	if opts.keyboardInteractivePassword != "" {
		password := opts.keyboardInteractivePassword
		methods = append(methods, ssh.KeyboardInteractive(func(
			_ string,
			_ string,
			questions []string,
			_ []bool,
		) ([]string, error) {
			answers := make([]string, len(questions))
			for i := range questions {
				answers[i] = password
			}
			return answers, nil
		}))
	}

	if len(methods) == 0 {
		return nil, apperror.SSHConnectionFailed("no authentication method configured", nil)
	}
	return methods, nil
}

func parsePrivateKey(privateKey, passphrase string) (ssh.Signer, error) {
	var signer ssh.Signer
	var err error

	if passphrase != "" {
		signer, err = ssh.ParsePrivateKeyWithPassphrase([]byte(privateKey), []byte(passphrase))
	} else {
		signer, err = ssh.ParsePrivateKey([]byte(privateKey))
	}
	if err != nil {
		if passphrase == "" && needsPassphrase(err) {
			return nil, apperror.New(
				apperror.CodeSSHKeyPassphraseRequired,
				"private key is encrypted; provide a passphrase",
				err,
			)
		}
		return nil, apperror.DecryptionFailed(err)
	}
	return signer, nil
}

func needsPassphrase(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "passphrase") || strings.Contains(msg, "encrypted")
}

func clientConfig(
	username string,
	opts authOptions,
	host string,
	port int,
	verifier HostKeyVerifier,
) (*ssh.ClientConfig, error) {
	methods, err := authMethods(opts)
	if err != nil {
		return nil, err
	}
	return &ssh.ClientConfig{
		User:            username,
		Auth:            methods,
		HostKeyCallback: hostKeyCallback(host, port, verifier),
		Timeout:         timeout,
	}, nil
}

func relayAuthOptions(password, privateKey, keyPassphrase, keyboardInteractivePassword string) authOptions {
	return authOptions{
		password:                    password,
		privateKey:                  privateKey,
		keyPassphrase:               keyPassphrase,
		keyboardInteractivePassword: keyboardInteractivePassword,
	}
}

func targetAuthOptions(config *SSHConnectionConfig) authOptions {
	return authOptions{
		password:                    config.Password,
		privateKey:                  config.PrivateKey,
		keyPassphrase:               config.KeyPassphrase,
		keyboardInteractivePassword: config.KeyboardInteractivePassword,
	}
}

func relayAuthOptionsFromHop(hop RelayHopConfig) authOptions {
	return authOptions{
		password:                    hop.Password,
		privateKey:                  hop.PrivateKey,
		keyPassphrase:               hop.KeyPassphrase,
		keyboardInteractivePassword: hop.KeyboardInteractivePassword,
	}
}

// CheckPrivateKeyPassphrase reports whether a private key needs a passphrase.
func CheckPrivateKeyPassphrase(privateKey string) (bool, error) {
	_, err := ssh.ParsePrivateKey([]byte(privateKey))
	if err == nil {
		return false, nil
	}
	if needsPassphrase(err) {
		return true, nil
	}
	return false, fmt.Errorf("invalid private key: %w", err)
}
