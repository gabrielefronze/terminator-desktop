package ssh

import (
	"os"
	"os/exec"
	"runtime"
	"strings"
	"terminator-desktop/backend/internal/apperror"

	"github.com/creack/pty"
)

func defaultShell() string {
	if shell := os.Getenv("SHELL"); shell != "" {
		return shell
	}
	if runtime.GOOS == "windows" {
		return "powershell.exe"
	}
	return "/bin/sh"
}

func (s *SshService) connectLocal(config *SSHConnectionConfig) error {
	cmd := exec.Command(defaultShell())
	cmd.Dir = mustHomeDir()
	cmd.Env = localShellEnv()

	ptyFile, err := pty.Start(cmd)
	if err != nil {
		return apperror.SSHConnectionFailed("failed to start local shell", err)
	}

	current := &activeSession{
		local:    true,
		stdin:    ptyFile,
		stdout:   ptyFile,
		localCmd: cmd,
		ptyFile:  ptyFile,
	}

	s.mu.Lock()
	s.sessions[config.ID] = current
	s.mu.Unlock()

	go s.streamOutput(config.ID, ptyFile, current)

	return nil
}

func mustHomeDir() string {
	if home, err := os.UserHomeDir(); err == nil && home != "" {
		return home
	}
	wd, err := os.Getwd()
	if err == nil {
		return wd
	}
	return "."
}

func resizeLocalPTY(ptyFile *os.File, rows, cols int) error {
	if rows <= 0 || cols <= 0 {
		return nil
	}
	return pty.Setsize(ptyFile, &pty.Winsize{
		Rows: uint16(rows),
		Cols: uint16(cols),
	})
}

func localShellEnv() []string {
	env := os.Environ()
	env = setEnvVar(env, "TERM", "xterm-256color")
	env = setEnvVar(env, "COLORTERM", "truecolor")

	if !envHasUTF8Locale(env) {
		env = append(env, "LANG=en_US.UTF-8", "LC_CTYPE=UTF-8")
	}

	return env
}

func setEnvVar(env []string, key, value string) []string {
	prefix := key + "="
	out := make([]string, 0, len(env)+1)
	replaced := false
	for _, entry := range env {
		if strings.HasPrefix(entry, prefix) {
			out = append(out, prefix+value)
			replaced = true
			continue
		}
		out = append(out, entry)
	}
	if !replaced {
		out = append(out, prefix+value)
	}
	return out
}

func envHasUTF8Locale(env []string) bool {
	for _, entry := range env {
		if strings.HasPrefix(entry, "LANG=") ||
			strings.HasPrefix(entry, "LC_ALL=") ||
			strings.HasPrefix(entry, "LC_CTYPE=") {
			lower := strings.ToLower(entry)
			if strings.Contains(lower, "utf-8") || strings.Contains(lower, "utf8") {
				return true
			}
		}
	}
	return false
}

func closeLocalSession(active *activeSession) {
	if active.ptyFile != nil {
		_ = active.ptyFile.Close()
	}
	if active.localCmd != nil && active.localCmd.Process != nil {
		_ = active.localCmd.Process.Kill()
	}
}
