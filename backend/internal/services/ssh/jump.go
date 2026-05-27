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

func dialViaRelayChain(
	hops []RelayHopConfig,
	verifier HostKeyVerifier,
	targetConfig *ssh.ClientConfig,
	targetAddr string,
) (*ssh.Client, []*ssh.Client, error) {
	if len(hops) == 0 {
		client, err := ssh.Dial("tcp", targetAddr, targetConfig)
		if err != nil {
			return nil, nil, apperror.SSHConnectionFailed(
				fmt.Sprintf("failed to connect to %s", targetAddr),
				err,
			)
		}
		return client, nil, nil
	}

	jumpClients := make([]*ssh.Client, 0, len(hops))
	var client *ssh.Client

	for _, hop := range hops {
		port := hop.Port
		if port <= 0 {
			port = 22
		}
		hopAddr := fmt.Sprintf("%s:%d", hop.Host, port)
		hopConfig, err := clientConfig(
			hop.Username,
			relayAuthOptionsFromHop(hop),
			hop.Host,
			port,
			verifier,
		)
		if err != nil {
			closeClients(jumpClients)
			if client != nil {
				_ = client.Close()
			}
			return nil, nil, err
		}

		if client == nil {
			next, err := ssh.Dial("tcp", hopAddr, hopConfig)
			if err != nil {
				closeClients(jumpClients)
				return nil, nil, apperror.SSHConnectionFailed(
					fmt.Sprintf("failed to connect to relay %s", hopAddr),
					err,
				)
			}
			jumpClients = append(jumpClients, next)
			client = next
			continue
		}

		conn, err := client.Dial("tcp", hopAddr)
		if err != nil {
			closeClients(jumpClients)
			_ = client.Close()
			return nil, nil, apperror.SSHConnectionFailed(
				fmt.Sprintf("relay could not reach %s", hopAddr),
				err,
			)
		}

		ncc, chans, reqs, err := ssh.NewClientConn(conn, hopAddr, hopConfig)
		if err != nil {
			_ = conn.Close()
			closeClients(jumpClients)
			_ = client.Close()
			return nil, nil, apperror.SSHConnectionFailed(
				fmt.Sprintf("failed to open SSH session to relay %s", hopAddr),
				err,
			)
		}

		next := ssh.NewClient(ncc, chans, reqs)
		jumpClients = append(jumpClients, next)
		client = next
	}

	conn, err := client.Dial("tcp", targetAddr)
	if err != nil {
		closeClients(jumpClients)
		return nil, nil, apperror.SSHConnectionFailed(
			fmt.Sprintf("relay chain could not reach %s", targetAddr),
			err,
		)
	}

	ncc, chans, reqs, err := ssh.NewClientConn(conn, targetAddr, targetConfig)
	if err != nil {
		_ = conn.Close()
		closeClients(jumpClients)
		return nil, nil, apperror.SSHConnectionFailed(
			fmt.Sprintf("failed to open SSH session to %s via relay chain", targetAddr),
			err,
		)
	}

	return ssh.NewClient(ncc, chans, reqs), jumpClients, nil
}

func closeClients(clients []*ssh.Client) {
	for _, client := range clients {
		if client != nil {
			_ = client.Close()
		}
	}
}

func legacyRelayHops(config *SSHConnectionConfig) []RelayHopConfig {
	if len(config.RelayHops) > 0 {
		return config.RelayHops
	}
	if config.RelayHost == "" {
		return nil
	}
	port := config.RelayPort
	if port <= 0 {
		port = 22
	}
	return []RelayHopConfig{{
		Host:                        config.RelayHost,
		Port:                        port,
		Username:                    config.RelayUsername,
		Password:                    config.RelayPassword,
		PrivateKey:                  config.RelayPrivateKey,
		KeyPassphrase:               config.RelayKeyPassphrase,
		KeyboardInteractivePassword: config.RelayKeyboardInteractivePassword,
	}}
}
