package ssh

import (
	"io"
	"os"
	"path"
	"strings"
	"terminator-desktop/backend/internal/apperror"

	"github.com/pkg/sftp"
)

type SftpEntry struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"isDir"`
	ModTime int64  `json:"modTime"`
}

func (s *SshService) openSftpClient(sessionID string) (*sftp.Client, error) {
	s.mu.RLock()
	active, exists := s.sessions[sessionID]
	s.mu.RUnlock()
	if !exists || active.local || active.client == nil {
		return nil, apperror.SSHSessionNotFound()
	}
	client, err := sftp.NewClient(active.client)
	if err != nil {
		return nil, apperror.SSHConnectionFailed("failed to open SFTP", err)
	}
	return client, nil
}

func (s *SshService) SftpList(sessionID, remotePath string) ([]SftpEntry, error) {
	client, err := s.openSftpClient(sessionID)
	if err != nil {
		return nil, err
	}
	defer client.Close()

	remotePath = cleanRemotePath(remotePath)
	infos, err := client.ReadDir(remotePath)
	if err != nil {
		return nil, apperror.SSHConnectionFailed("failed to list directory", err)
	}

	entries := make([]SftpEntry, 0, len(infos))
	for _, info := range infos {
		entryPath := path.Join(remotePath, info.Name())
		if remotePath == "/" {
			entryPath = "/" + info.Name()
		}
		entries = append(entries, SftpEntry{
			Name:    info.Name(),
			Path:    entryPath,
			Size:    info.Size(),
			IsDir:   info.IsDir(),
			ModTime: info.ModTime().Unix(),
		})
	}
	return entries, nil
}

func (s *SshService) SftpDownload(sessionID, remotePath, localPath string) error {
	client, err := s.openSftpClient(sessionID)
	if err != nil {
		return err
	}
	defer client.Close()

	remotePath = cleanRemotePath(remotePath)
	src, err := client.Open(remotePath)
	if err != nil {
		return apperror.SSHConnectionFailed("failed to open remote file", err)
	}
	defer src.Close()

	dst, err := os.Create(localPath)
	if err != nil {
		return err
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

func (s *SshService) SftpUpload(sessionID, localPath, remotePath string) error {
	client, err := s.openSftpClient(sessionID)
	if err != nil {
		return err
	}
	defer client.Close()

	remotePath = cleanRemotePath(remotePath)
	src, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer src.Close()

	dst, err := client.OpenFile(remotePath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC)
	if err != nil {
		return apperror.SSHConnectionFailed("failed to create remote file", err)
	}
	defer dst.Close()

	_, err = io.Copy(dst, src)
	return err
}

func cleanRemotePath(remotePath string) string {
	if remotePath == "" {
		return "."
	}
	return strings.ReplaceAll(remotePath, "\\", "/")
}
