package localfs

import (
	"context"
	"os"
	"os/exec"
	"runtime"
)

func (s *Service) OpenPath(_ context.Context, path string) error {
	switch runtime.GOOS {
	case "darwin":
		return exec.Command("open", path).Start()
	case "windows":
		return exec.Command("cmd", "/c", "start", "", path).Start()
	default:
		return exec.Command("xdg-open", path).Start()
	}
}

func (s *Service) RemovePath(_ context.Context, path string) error {
	return os.Remove(path)
}
