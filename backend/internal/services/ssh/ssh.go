package ssh

import (
	"fmt"
	"io"
	"os"
	"os/exec"
	"sync"
	"terminator-desktop/backend/internal/apperror"
	"time"

	"golang.org/x/crypto/ssh"
)

type SSHEmitter interface {
	EmitData(sessionID string, data []byte)
	EmitClosed(sessionID string)
}

type SSHConnectionConfig struct {
	ID         string `json:"id"`
	Local      bool   `json:"local"`
	Host       string `json:"host"`
	Port       int    `json:"port"`
	Username   string `json:"username"`
	Password   string `json:"password,omitempty"`
	PrivateKey string `json:"privateKey,omitempty"`
	// Optional jump host / relay (bastion) — one hop only.
	RelayHost       string `json:"relayHost,omitempty"`
	RelayPort       int    `json:"relayPort,omitempty"`
	RelayUsername   string `json:"relayUsername,omitempty"`
	RelayPassword   string `json:"relayPassword,omitempty"`
	RelayPrivateKey string `json:"relayPrivateKey,omitempty"`
}

type activeSession struct {
	local      bool
	stdin      io.WriteCloser
	stdout     io.Reader
	client     *ssh.Client
	jumpClient *ssh.Client
	session    *ssh.Session
	localCmd   *exec.Cmd
	ptyFile    *os.File
}

type SshService struct {
	emitter  SSHEmitter
	mu       sync.RWMutex
	sessions map[string]*activeSession
}

// TODO: configurable timeout?
const timeout = 15 * time.Second

const batchRatePerSecond = 60

func NewSshService(emitter SSHEmitter) *SshService {
	return &SshService{
		emitter:  emitter,
		sessions: make(map[string]*activeSession),
	}
}

func (s *SshService) Connect(config *SSHConnectionConfig) error {
	if config.Local {
		return s.connectLocal(config)
	}

	targetConfig, err := clientConfig(config.Username, config.Password, config.PrivateKey)
	if err != nil {
		return err
	}

	targetAddr := fmt.Sprintf("%s:%d", config.Host, config.Port)

	var client *ssh.Client
	var jumpClient *ssh.Client

	if config.RelayHost != "" {
		relayPort := config.RelayPort
		if relayPort <= 0 {
			relayPort = 22
		}
		jumpConfig, err := clientConfig(
			config.RelayUsername,
			config.RelayPassword,
			config.RelayPrivateKey,
		)
		if err != nil {
			return apperror.SSHConnectionFailed("relay host has no authentication configured", err)
		}
		jumpAddr := fmt.Sprintf("%s:%d", config.RelayHost, relayPort)
		client, jumpClient, err = dialViaJump(jumpConfig, jumpAddr, targetConfig, targetAddr)
		if err != nil {
			return err
		}
	} else {
		client, err = ssh.Dial("tcp", targetAddr, targetConfig)
		if err != nil {
			return apperror.SSHConnectionFailed(fmt.Sprintf("failed to connect to %s", targetAddr), err)
		}
	}

	session, err := client.NewSession()
	if err != nil {
		_ = client.Close()
		return apperror.SSHConnectionFailed("failed to create session", err)
	}

	stdin, err := session.StdinPipe()
	if err != nil {
		_ = session.Close()
		_ = client.Close()
		return err
	}

	stdout, err := session.StdoutPipe()
	if err != nil {
		_ = session.Close()
		_ = client.Close()
		return err
	}

	session.Stderr = session.Stdout

	modes := ssh.TerminalModes{
		ssh.ECHO:          1,
		ssh.TTY_OP_ISPEED: 115200, // baud rate
		ssh.TTY_OP_OSPEED: 115200,
	}

	// 24x80 is just the default
	if err = session.RequestPty("xterm-256color", 24, 80, modes); err != nil {
		_ = session.Close()
		_ = client.Close()
		return apperror.SSHConnectionFailed("failed to request PTY", err)
	}

	if err = session.Shell(); err != nil {
		_ = session.Close()
		_ = client.Close()
		return apperror.SSHConnectionFailed("failed to start shell", err)
	}

	s.mu.Lock()
	currentSession := &activeSession{
		local:      false,
		client:     client,
		jumpClient: jumpClient,
		session:    session,
		stdin:      stdin,
		stdout:     stdout,
	}
	s.sessions[config.ID] = currentSession
	s.mu.Unlock()

	go s.streamOutput(config.ID, stdout, currentSession)

	return nil
}

// Input writes data to SSH stdin
func (s *SshService) Input(sessionID string, data string) error {
	s.mu.RLock()
	active, exists := s.sessions[sessionID]
	s.mu.RUnlock()

	if !exists {
		return apperror.SSHSessionNotFound()
	}

	_, err := active.stdin.Write([]byte(data))
	return err
}

func (s *SshService) Resize(sessionID string, rows, cols int) error {
	s.mu.RLock()
	active, exists := s.sessions[sessionID]
	s.mu.RUnlock()

	if !exists {
		return apperror.SSHSessionNotFound()
	}

	if active.local {
		return resizeLocalPTY(active.ptyFile, rows, cols)
	}

	return active.session.WindowChange(rows, cols)
}

func (s *SshService) Disconnect(sessionID string) {
	s.mu.Lock()
	active, exists := s.sessions[sessionID]
	if exists {
		delete(s.sessions, sessionID)
	}
	s.mu.Unlock()

	if exists {
		if active.local {
			closeLocalSession(active)
		} else {
			_ = active.session.Close()
			_ = active.client.Close()
			if active.jumpClient != nil {
				_ = active.jumpClient.Close()
			}
		}
		s.emitter.EmitClosed(sessionID)
	}
}

func (s *SshService) streamOutput(sessionID string, stdout io.Reader, current *activeSession) {
	buf := make([]byte, 32*1024)
	dataChan := make(chan []byte)

	go readOutput(stdout, buf, dataChan)

	batchDelay := time.Second / time.Duration(batchRatePerSecond)
	ticker := time.NewTicker(batchDelay)
	defer ticker.Stop()

	batchSize := 128 * 1024
	batch := make([]byte, 0, batchSize)

	for {
		select {
		case chunk, ok := <-dataChan:
			if !ok {
				if len(batch) > 0 {
					s.emitter.EmitData(sessionID, batch)
				}
				s.cleanupSession(sessionID, current)
				return
			}

			batch = append(batch, chunk...)

			if len(batch) >= batchSize {
				s.emitter.EmitData(sessionID, batch)
				batch = batch[:0]
			}

		case <-ticker.C:
			if len(batch) > 0 {
				s.emitter.EmitData(sessionID, batch)
				batch = batch[:0]
			}
		}
	}
}

func readOutput(stdout io.Reader, buf []byte, dataChan chan []byte) {
	for {
		n, err := stdout.Read(buf)
		if n > 0 {
			chunk := make([]byte, n)
			copy(chunk, buf[:n])
			dataChan <- chunk
		}
		if err != nil {
			close(dataChan)
			return
		}
	}
}

func (s *SshService) cleanupSession(sessionID string, current *activeSession) {
	s.mu.Lock()
	active, exists := s.sessions[sessionID]
	if exists && active == current {
		delete(s.sessions, sessionID)
		s.mu.Unlock()

		if current.local {
			closeLocalSession(current)
		} else {
			if current.session != nil {
				_ = current.session.Close()
			}
			if current.client != nil {
				_ = current.client.Close()
			}
			if current.jumpClient != nil {
				_ = current.jumpClient.Close()
			}
		}
		s.emitter.EmitClosed(sessionID)
	} else {
		s.mu.Unlock()
	}
}
