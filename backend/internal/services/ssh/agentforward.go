package ssh

import (
	"io"
	"terminator-desktop/backend/internal/apperror"

	"github.com/xanzy/ssh-agent"
	"golang.org/x/crypto/ssh"
	"golang.org/x/crypto/ssh/agent"
)

// setupAgentForwarding registers the local SSH agent on each client in the chain
// and requests agent forwarding on the interactive session.
func setupAgentForwarding(
	session *ssh.Session,
	target *ssh.Client,
	jumpClients []*ssh.Client,
) (io.Closer, error) {
	if !sshagent.Available() {
		return nil, apperror.SSHConnectionFailed(
			"SSH agent forwarding is enabled but no local SSH agent is available (set SSH_AUTH_SOCK or start an agent)",
			nil,
		)
	}

	keyring, conn, err := sshagent.New()
	if err != nil {
		return nil, apperror.SSHConnectionFailed("failed to connect to local SSH agent", err)
	}

	clients := append(append([]*ssh.Client{}, jumpClients...), target)
	for _, client := range clients {
		if client == nil {
			continue
		}
		if err := agent.ForwardToAgent(client, keyring); err != nil {
			_ = conn.Close()
			return nil, apperror.SSHConnectionFailed("failed to set up SSH agent forwarding", err)
		}
	}

	if err := agent.RequestAgentForwarding(session); err != nil {
		_ = conn.Close()
		return nil, apperror.SSHConnectionFailed("SSH server denied agent forwarding", err)
	}

	return conn, nil
}

func closeAgentConn(active *activeSession) {
	if active == nil || active.agentConn == nil {
		return
	}
	_ = active.agentConn.Close()
	active.agentConn = nil
}
