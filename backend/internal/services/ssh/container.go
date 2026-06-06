package ssh

import (
	"os/exec"
	"strings"
	"terminator-desktop/backend/internal/apperror"

	"github.com/creack/pty"
)

func (s *SshService) connectContainer(config *SSHConnectionConfig) error {
	runtime := strings.TrimSpace(config.ContainerRuntime)
	if runtime == "" {
		runtime = "docker"
	}

	containerID := strings.TrimSpace(config.ContainerID)
	if containerID == "" {
		return apperror.Validation("container id is required")
	}

	shell := containerShell(config.ContainerShell)
	// -t allocates a TTY inside the container so the shell is interactive and echoes input.
	// The outer creack/pty provides the terminal on our side; docker still needs -t in the container.
	cmd := exec.Command(
		runtime,
		"exec",
		"-it",
		"-e", "TERM=xterm-256color",
		"-e", "COLORTERM=truecolor",
		containerID,
		shell,
	)
	cmd.Env = localShellEnv()

	ptyFile, err := pty.Start(cmd)
	if err != nil {
		return apperror.SSHConnectionFailed("failed to attach to container", err)
	}

	_ = pty.Setsize(ptyFile, &pty.Winsize{
		Rows: 24,
		Cols: 80,
	})

	current := &activeSession{
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

func containerShell(preferred string) string {
	shell := strings.TrimSpace(preferred)
	if shell != "" {
		return shell
	}
	return "/bin/sh"
}

func isPtySession(active *activeSession) bool {
	return active.ptyFile != nil
}
