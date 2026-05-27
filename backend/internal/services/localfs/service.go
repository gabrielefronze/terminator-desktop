package localfs

import (
	"context"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"terminator-desktop/backend/internal/apperror"
)

type LocalEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"isDir"`
	ModTime int64  `json:"modTime"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

func (s *Service) HomeDir(_ context.Context) (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return home, nil
}

func (s *Service) ListDir(_ context.Context, dirPath string) ([]LocalEntry, error) {
	if dirPath == "" {
		return nil, apperror.Validation("directory path is required")
	}

	clean := filepath.Clean(dirPath)
	info, err := os.Stat(clean)
	if err != nil {
		return nil, err
	}
	if !info.IsDir() {
		return nil, apperror.Validation("path is not a directory")
	}

	infos, err := os.ReadDir(clean)
	if err != nil {
		return nil, err
	}

	entries := make([]LocalEntry, 0, len(infos))
	for _, entry := range infos {
		name := entry.Name()
		if strings.HasPrefix(name, ".") {
			continue
		}
		fullPath := filepath.Join(clean, name)
		item := LocalEntry{
			Name:  name,
			Path:  fullPath,
			IsDir: entry.IsDir(),
		}
		if detail, err := entry.Info(); err == nil {
			if !detail.IsDir() {
				item.Size = detail.Size()
			}
			item.ModTime = detail.ModTime().Unix()
		}
		entries = append(entries, item)
	}

	sort.Slice(entries, func(i, j int) bool {
		if entries[i].IsDir != entries[j].IsDir {
			return entries[i].IsDir
		}
		return strings.ToLower(entries[i].Name) < strings.ToLower(entries[j].Name)
	})

	return entries, nil
}
