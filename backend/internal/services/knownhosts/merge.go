package knownhosts

import (
	"bufio"
	"encoding/base64"
	"net"
	"os"
	"strings"

	"golang.org/x/crypto/ssh"
)

// MergeFromFile imports entries from an OpenSSH known_hosts file.
// Hashed host lines are skipped.
func (s *Service) MergeFromFile(path string) (int, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return 0, nil
		}
		return 0, err
	}

	merged := 0
	scanner := bufio.NewScanner(strings.NewReader(string(data)))
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if strings.HasPrefix(line, "@") {
			continue
		}
		fields := strings.Fields(line)
		if len(fields) < 3 {
			continue
		}
		if strings.HasPrefix(fields[0], "|") {
			continue
		}

		keyType := fields[1]
		keyBytes, err := base64.StdEncoding.DecodeString(fields[2])
		if err != nil {
			continue
		}
		pubKey, err := ssh.ParsePublicKey(keyBytes)
		if err != nil {
			continue
		}

		fingerprint := ssh.FingerprintSHA256(pubKey)
		hosts := strings.Split(fields[0], ",")
		for _, hostField := range hosts {
			host, port := parseKnownHostField(hostField)
			if host == "" {
				continue
			}
			existing, ok := s.store.Get(host, port)
			if ok && existing.Fingerprint == fingerprint {
				continue
			}
			if err := s.store.Trust(host, port, fingerprint, keyType); err != nil {
				return merged, err
			}
			merged++
		}
	}

	return merged, scanner.Err()
}

func parseKnownHostField(field string) (string, int) {
	field = strings.TrimSpace(field)
	if field == "" {
		return "", 22
	}

	if strings.HasPrefix(field, "[") && strings.Contains(field, "]:") {
		host, portStr, found := strings.Cut(strings.TrimPrefix(field, "["), "]:")
		if !found {
			return "", 22
		}
		port, err := net.LookupPort("tcp", portStr)
		if err != nil || port <= 0 {
			return host, 22
		}
		return host, port
	}

	if strings.Contains(field, ":") && !strings.Contains(field, ".") {
		host, portStr, found := strings.Cut(field, ":")
		if found {
			port, err := net.LookupPort("tcp", portStr)
			if err == nil && port > 0 {
				return host, port
			}
		}
	}

	return field, 22
}
