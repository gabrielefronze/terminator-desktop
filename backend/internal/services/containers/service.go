package containers

import (
	"context"
	"encoding/json"
	"os/exec"
	"strings"
	"terminator-desktop/backend/internal/apperror"
)

const (
	RuntimeDocker = "docker"
	RuntimePodman = "podman"
)

// RunningContainer describes a local container that is currently running.
type RunningContainer struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Image   string `json:"image"`
	Status  string `json:"status"`
	State   string `json:"state"`
	Runtime string `json:"runtime"`
}

type Service struct{}

func NewService() *Service {
	return &Service{}
}

// DetectRuntime returns the first available container CLI on PATH.
func (s *Service) DetectRuntime(_ context.Context) (string, error) {
	for _, runtime := range []string{RuntimeDocker, RuntimePodman} {
		if commandAvailable(runtime) {
			return runtime, nil
		}
	}
	return "", apperror.NotFound("no container runtime found (docker or podman)", nil)
}

// ListRunning returns running containers for the given runtime (empty = auto-detect).
func (s *Service) ListRunning(_ context.Context, runtime string) ([]RunningContainer, error) {
	selected, err := resolveRuntime(runtime)
	if err != nil {
		return nil, err
	}

	output, err := exec.Command(
		selected,
		"ps",
		"--filter", "status=running",
		"--format", "{{json .}}",
	).Output()
	if err != nil {
		return nil, err
	}

	return parseContainerLines(string(output), selected)
}

func resolveRuntime(runtime string) (string, error) {
	if runtime != "" {
		if !commandAvailable(runtime) {
			return "", apperror.NotFound(runtime+" is not available", nil)
		}
		return runtime, nil
	}
	return detectRuntime()
}

func detectRuntime() (string, error) {
	for _, runtime := range []string{RuntimeDocker, RuntimePodman} {
		if commandAvailable(runtime) {
			return runtime, nil
		}
	}
	return "", apperror.NotFound("no container runtime found (docker or podman)", nil)
}

func commandAvailable(name string) bool {
	_, err := exec.LookPath(name)
	return err == nil
}

type psJSON struct {
	ID     string `json:"ID"`
	Names  string `json:"Names"`
	Image  string `json:"Image"`
	Status string `json:"Status"`
	State  string `json:"State"`
}

func parseContainerLines(output, runtime string) ([]RunningContainer, error) {
	lines := strings.Split(strings.TrimSpace(output), "\n")
	containers := make([]RunningContainer, 0, len(lines))

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		var row psJSON
		if err := json.Unmarshal([]byte(line), &row); err != nil {
			continue
		}

		name := strings.TrimPrefix(strings.TrimSpace(row.Names), "/")
		if name == "" {
			name = row.ID
		}

		containers = append(containers, RunningContainer{
			ID:      row.ID,
			Name:    name,
			Image:   row.Image,
			Status:  row.Status,
			State:   row.State,
			Runtime: runtime,
		})
	}

	return containers, nil
}
