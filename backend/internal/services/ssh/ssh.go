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
	EmitClosed(sessionID string, unexpected bool)
}

type activeSession struct {
	local       bool
	forwardOnly bool
	stdin       io.WriteCloser
	stdout      io.Reader
	client      *ssh.Client
	jumpClients []*ssh.Client
	session     *ssh.Session
	localCmd       *exec.Cmd
	ptyFile        *os.File
	keepAliveStop  chan struct{}
	agentConn      io.Closer
}

type SshService struct {
	emitter   SSHEmitter
	verifier  HostKeyVerifier
	mu        sync.RWMutex
	forwardMu sync.RWMutex
	sessions  map[string]*activeSession
	forwards  map[string]*portForwardState
}

// TODO: configurable timeout?
const timeout = 15 * time.Second

const batchRatePerSecond = 60

func NewSshService(emitter SSHEmitter, verifier HostKeyVerifier) *SshService {
	return &SshService{
		emitter:  emitter,
		verifier: verifier,
		sessions: make(map[string]*activeSession),
		forwards: make(map[string]*portForwardState),
	}
}

func (s *SshService) CheckPrivateKeyNeedsPassphrase(privateKey string) (bool, error) {
	return CheckPrivateKeyPassphrase(privateKey)
}

func (s *SshService) Connect(config *SSHConnectionConfig) error {
	if config.Local {
		return s.connectLocal(config)
	}

	port := config.Port
	if port <= 0 {
		port = 22
	}

	targetConfig, err := clientConfig(
		config.Username,
		targetAuthOptions(config),
		config.Host,
		port,
		s.verifier,
	)
	if err != nil {
		return err
	}

	targetAddr := fmt.Sprintf("%s:%d", config.Host, port)
	hops := legacyRelayHops(config)
	client, jumpClients, err := dialViaRelayChain(hops, s.verifier, targetConfig, targetAddr)
	if err != nil {
		return err
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

	var agentConn io.Closer
	if config.ForwardAgent {
		agentConn, err = setupAgentForwarding(session, client, jumpClients)
		if err != nil {
			_ = session.Close()
			_ = client.Close()
			closeClients(jumpClients)
			return err
		}
	}

	for key, value := range config.Environment {
		_ = session.Setenv(key, value)
	}

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
		local:       false,
		client:      client,
		jumpClients: jumpClients,
		session:     session,
		stdin:       stdin,
		stdout:      stdout,
		agentConn:   agentConn,
	}
	s.sessions[config.ID] = currentSession
	s.mu.Unlock()

	startSessionKeepAlive(
		currentSession,
		keepAliveEnabled(config),
		config.KeepAliveIntervalSeconds,
	)
	go s.streamOutput(config.ID, stdout, currentSession)

	if config.StartupCommand != "" {
		go func() {
			time.Sleep(200 * time.Millisecond)
			_, _ = stdin.Write([]byte(config.StartupCommand + "\n"))
		}()
	}

	return nil
}

// ConnectForwardOnly opens an SSH client without a shell, for port forwarding only.
func (s *SshService) ConnectForwardOnly(config *SSHConnectionConfig) error {
	if config.Local {
		return apperror.Validation("forward-only sessions require a remote host")
	}

	port := config.Port
	if port <= 0 {
		port = 22
	}

	targetConfig, err := clientConfig(
		config.Username,
		targetAuthOptions(config),
		config.Host,
		port,
		s.verifier,
	)
	if err != nil {
		return err
	}

	targetAddr := fmt.Sprintf("%s:%d", config.Host, port)
	hops := legacyRelayHops(config)
	client, jumpClients, err := dialViaRelayChain(hops, s.verifier, targetConfig, targetAddr)
	if err != nil {
		return err
	}

	s.mu.Lock()
	forwardSession := &activeSession{
		local:       false,
		forwardOnly: true,
		client:      client,
		jumpClients: jumpClients,
	}
	s.sessions[config.ID] = forwardSession
	s.mu.Unlock()

	startSessionKeepAlive(
		forwardSession,
		keepAliveEnabled(config),
		config.KeepAliveIntervalSeconds,
	)

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
	if active.forwardOnly {
		return apperror.Validation("session is forward-only")
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
	if active.forwardOnly {
		return apperror.Validation("session is forward-only")
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
		stopSessionKeepAlive(active)
		s.stopForwardsForSession(sessionID)
		if active.local {
			closeLocalSession(active)
		} else if active.forwardOnly {
			_ = active.client.Close()
			closeClients(active.jumpClients)
		} else {
			_ = active.session.Close()
			_ = active.client.Close()
			closeClients(active.jumpClients)
			closeAgentConn(active)
		}
		s.emitter.EmitClosed(sessionID, false)
	}
}

func (s *SshService) stopForwardsForSession(sessionID string) {
	s.forwardMu.Lock()
	defer s.forwardMu.Unlock()
	for id, state := range s.forwards {
		if state.forward.SessionID != sessionID {
			continue
		}
		state.cancel()
		if state.listener != nil {
			_ = state.listener.Close()
		}
		delete(s.forwards, id)
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

		stopSessionKeepAlive(current)
		s.stopForwardsForSession(sessionID)
		if current.local {
			closeLocalSession(current)
		} else if current.forwardOnly {
			if current.client != nil {
				_ = current.client.Close()
			}
			closeClients(current.jumpClients)
		} else {
			if current.session != nil {
				_ = current.session.Close()
			}
			if current.client != nil {
				_ = current.client.Close()
			}
			closeClients(current.jumpClients)
			closeAgentConn(current)
		}
		s.emitter.EmitClosed(sessionID, true)
	} else {
		s.mu.Unlock()
	}
}
