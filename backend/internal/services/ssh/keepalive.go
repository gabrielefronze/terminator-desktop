package ssh

import (
	"net"
	"time"

	"golang.org/x/crypto/ssh"
)

const (
	defaultKeepAliveInterval = 30 * time.Second
	tcpKeepAlivePeriod       = 30 * time.Second
	minKeepAliveInterval     = 5 * time.Second
	maxKeepAliveInterval     = 5 * time.Minute
)

func keepAliveInterval(seconds int) time.Duration {
	if seconds <= 0 {
		return defaultKeepAliveInterval
	}
	d := time.Duration(seconds) * time.Second
	if d < minKeepAliveInterval {
		return minKeepAliveInterval
	}
	if d > maxKeepAliveInterval {
		return maxKeepAliveInterval
	}
	return d
}

func dialSSH(network, addr string, config *ssh.ClientConfig) (*ssh.Client, error) {
	conn, err := net.DialTimeout(network, addr, config.Timeout)
	if err != nil {
		return nil, err
	}
	if tcpConn, ok := conn.(*net.TCPConn); ok {
		_ = tcpConn.SetKeepAlive(true)
		_ = tcpConn.SetKeepAlivePeriod(tcpKeepAlivePeriod)
	}
	clientConn, chans, reqs, err := ssh.NewClientConn(conn, addr, config)
	if err != nil {
		_ = conn.Close()
		return nil, err
	}
	return ssh.NewClient(clientConn, chans, reqs), nil
}

func runSSHKeepAlive(stop <-chan struct{}, interval time.Duration, clients ...*ssh.Client) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-stop:
			return
		case <-ticker.C:
			for _, client := range clients {
				if client == nil {
					continue
				}
				_, _, err := client.SendRequest("keepalive@openssh.com", true, nil)
				if err != nil {
					return
				}
			}
		}
	}
}

func startSessionKeepAlive(active *activeSession, enabled bool, intervalSeconds int) {
	if !enabled || active.local {
		return
	}

	clients := make([]*ssh.Client, 0, 1+len(active.jumpClients))
	clients = append(clients, active.jumpClients...)
	if active.client != nil {
		clients = append(clients, active.client)
	}
	if len(clients) == 0 {
		return
	}

	stop := make(chan struct{})
	active.keepAliveStop = stop
	go runSSHKeepAlive(stop, keepAliveInterval(intervalSeconds), clients...)
}

func stopSessionKeepAlive(active *activeSession) {
	if active.keepAliveStop == nil {
		return
	}
	close(active.keepAliveStop)
	active.keepAliveStop = nil
}

func keepAliveEnabled(config *SSHConnectionConfig) bool {
	if config == nil || config.KeepAliveEnabled == nil {
		return true
	}
	return *config.KeepAliveEnabled
}
