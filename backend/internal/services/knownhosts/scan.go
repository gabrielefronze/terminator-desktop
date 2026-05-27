package knownhosts

import (
	"fmt"
	"net"
	"time"

	"golang.org/x/crypto/ssh"
)

type RemoteHostKey struct {
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Fingerprint string `json:"fingerprint"`
	KeyType     string `json:"keyType"`
}

func ScanHostKey(host string, port int) (RemoteHostKey, error) {
	if port <= 0 {
		port = 22
	}
	addr := fmt.Sprintf("%s:%d", host, port)

	var remoteKey ssh.PublicKey
	config := &ssh.ClientConfig{
		User: "terminator-scan",
		Auth: []ssh.AuthMethod{
			ssh.Password(""),
		},
		HostKeyCallback: func(_ string, _ net.Addr, key ssh.PublicKey) error {
			remoteKey = key
			return nil
		},
		Timeout: 10 * time.Second,
	}

	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		return RemoteHostKey{}, err
	}
	defer conn.Close()

	_, _, _, err = ssh.NewClientConn(conn, addr, config)
	if err != nil && remoteKey == nil {
		return RemoteHostKey{}, err
	}
	if remoteKey == nil {
		return RemoteHostKey{}, fmt.Errorf("no host key received")
	}

	return RemoteHostKey{
		Host:        host,
		Port:        port,
		Fingerprint: ssh.FingerprintSHA256(remoteKey),
		KeyType:     remoteKey.Type(),
	}, nil
}
