package knownhosts

import (
	"context"
)

const (
	StatusTrusted  = "trusted"
	StatusUnknown  = "unknown"
	StatusChanged  = "changed"
)

type HostKeyCheck struct {
	Host        string `json:"host"`
	Port        int    `json:"port"`
	Status      string `json:"status"`
	Fingerprint string `json:"fingerprint"`
	KeyType     string `json:"keyType"`
	StoredPrint string `json:"storedFingerprint,omitempty"`
}

type Service struct {
	store *Store
}

func NewService(appDir string) (*Service, error) {
	store := NewStore(appDir)
	if err := store.Load(); err != nil {
		return nil, err
	}
	return &Service{store: store}, nil
}

func (s *Service) CheckHost(_ context.Context, host string, port int) (HostKeyCheck, error) {
	remote, err := ScanHostKey(host, port)
	if err != nil {
		return HostKeyCheck{}, err
	}

	check := HostKeyCheck{
		Host:        remote.Host,
		Port:        remote.Port,
		Fingerprint: remote.Fingerprint,
		KeyType:     remote.KeyType,
	}

	stored, ok := s.store.Get(host, port)
	if !ok {
		check.Status = StatusUnknown
		return check, nil
	}

	check.StoredPrint = stored.Fingerprint
	if stored.Fingerprint == remote.Fingerprint {
		check.Status = StatusTrusted
	} else {
		check.Status = StatusChanged
	}
	return check, nil
}

func (s *Service) TrustHost(_ context.Context, host string, port int, fingerprint, keyType string) error {
	return s.store.Trust(host, port, fingerprint, keyType)
}

func (s *Service) RemoveHost(_ context.Context, host string, port int) error {
	return s.store.Remove(host, port)
}

func (s *Service) List(_ context.Context) []Entry {
	return s.store.List()
}

func (s *Service) IsTrusted(host string, port int, fingerprint string) bool {
	stored, ok := s.store.Get(host, port)
	return ok && stored.Fingerprint == fingerprint
}
