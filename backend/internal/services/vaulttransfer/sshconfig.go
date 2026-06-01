package vaulttransfer

import (
	"os"
	"path/filepath"
	"strconv"
	"strings"

	ssh_config "github.com/kevinburke/ssh_config"
	"github.com/google/uuid"

	"terminator-desktop/backend/internal/services/blob"
)

func defaultSSHConfigPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ssh", "config"), nil
}

func defaultKnownHostsPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".ssh", "known_hosts"), nil
}

func parseSSHConfigFile(path string) (VaultPayload, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return VaultPayload{}, err
	}

	cfg, err := ssh_config.Decode(strings.NewReader(string(data)))
	if err != nil {
		return VaultPayload{}, err
	}

	payload := VaultPayload{
		Hosts: []blob.Host{},
		Keys:  []blob.SavedKey{},
	}
	keyByPath := make(map[string]string)

	for _, hostEntry := range cfg.Hosts {
		if hostEntry == nil || len(hostEntry.Patterns) == 0 {
			continue
		}

		for _, pattern := range hostEntry.Patterns {
			if pattern == nil {
				continue
			}
			alias := pattern.String()
			if alias == "" || alias == "*" || strings.ContainsAny(alias, "*?") {
				continue
			}

			hostname, _ := cfg.Get(alias, "HostName")
			hostname = strings.TrimSpace(hostname)
			if hostname == "" {
				hostname = alias
			}

			port := 22
			if portStr, _ := cfg.Get(alias, "Port"); portStr != "" {
				if parsed, err := strconv.Atoi(strings.TrimSpace(portStr)); err == nil && parsed > 0 {
					port = parsed
				}
			}

			username, _ := cfg.Get(alias, "User")
			username = strings.TrimSpace(username)

			host := blob.Host{
				ID:       uuid.New().String(),
				Type:     blob.TypeHost,
				Name:     alias,
				Host:     hostname,
				Port:     port,
				Username: username,
			}

			identityFiles, _ := cfg.GetAll(alias, "IdentityFile")
			if len(identityFiles) > 0 {
				keyPath := expandSSHPath(strings.TrimSpace(identityFiles[0]))
				if keyPath != "" {
					keyID, ok := keyByPath[keyPath]
					if !ok {
						privateKey, readErr := os.ReadFile(keyPath)
						if readErr == nil {
							keyID = uuid.New().String()
							keyByPath[keyPath] = keyID
							payload.Keys = append(payload.Keys, blob.SavedKey{
								ID:         keyID,
								Type:       blob.TypeKey,
								Name:       filepath.Base(keyPath),
								PrivateKey: string(privateKey),
							})
						}
					}
					if keyID != "" {
						host.KeyID = keyID
					}
				}
			}

			payload.Hosts = append(payload.Hosts, host)
		}
	}

	return payload, nil
}

func expandSSHPath(path string) string {
	path = strings.TrimSpace(path)
	if path == "" {
		return ""
	}
	if strings.HasPrefix(path, "~/") {
		home, err := os.UserHomeDir()
		if err != nil {
			return path
		}
		return filepath.Join(home, path[2:])
	}
	return path
}
