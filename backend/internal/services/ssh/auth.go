package ssh

import (
	"terminator-desktop/backend/internal/apperror"

	"golang.org/x/crypto/ssh"
)

func authMethods(password, privateKey string) ([]ssh.AuthMethod, error) {
	if privateKey != "" {
		signer, err := ssh.ParsePrivateKey([]byte(privateKey))
		if err != nil {
			return nil, apperror.DecryptionFailed(err)
		}
		return []ssh.AuthMethod{ssh.PublicKeys(signer)}, nil
	}
	if password != "" {
		return []ssh.AuthMethod{ssh.Password(password)}, nil
	}
	return nil, apperror.SSHConnectionFailed("no authentication method configured", nil)
}

func clientConfig(username string, password, privateKey string) (*ssh.ClientConfig, error) {
	methods, err := authMethods(password, privateKey)
	if err != nil {
		return nil, err
	}
	return &ssh.ClientConfig{
		User:            username,
		Auth:            methods,
		HostKeyCallback: ssh.InsecureIgnoreHostKey(),
		Timeout:         timeout,
	}, nil
}
