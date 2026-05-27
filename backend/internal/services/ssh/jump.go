package ssh

import (
	"fmt"
	"terminator-desktop/backend/internal/apperror"

	"golang.org/x/crypto/ssh"
)

func dialViaJump(
	jumpConfig *ssh.ClientConfig,
	jumpAddr string,
	targetConfig *ssh.ClientConfig,
	targetAddr string,
) (*ssh.Client, *ssh.Client, error) {
	jumpClient, err := ssh.Dial("tcp", jumpAddr, jumpConfig)
	if err != nil {
		return nil, nil, apperror.SSHConnectionFailed(
			fmt.Sprintf("failed to connect to relay %s", jumpAddr),
			err,
		)
	}

	conn, err := jumpClient.Dial("tcp", targetAddr)
	if err != nil {
		_ = jumpClient.Close()
		return nil, nil, apperror.SSHConnectionFailed(
			fmt.Sprintf("relay could not reach %s", targetAddr),
			err,
		)
	}

	ncc, chans, reqs, err := ssh.NewClientConn(conn, targetAddr, targetConfig)
	if err != nil {
		_ = conn.Close()
		_ = jumpClient.Close()
		return nil, nil, apperror.SSHConnectionFailed(
			fmt.Sprintf("failed to open SSH session to %s via relay", targetAddr),
			err,
		)
	}

	return ssh.NewClient(ncc, chans, reqs), jumpClient, nil
}
