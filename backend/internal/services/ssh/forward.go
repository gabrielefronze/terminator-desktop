package ssh

import (
	"fmt"
	"io"
	"net"
	"terminator-desktop/backend/internal/apperror"
)

type PortForward struct {
	ID         string `json:"id"`
	SessionID  string `json:"sessionId"`
	Mode       string `json:"mode"`
	LocalHost  string `json:"localHost"`
	LocalPort  int    `json:"localPort"`
	RemoteHost string `json:"remoteHost"`
	RemotePort int    `json:"remotePort"`
}

type portForwardState struct {
	forward PortForward
	cancel  func()
	listener net.Listener
}

func (s *SshService) ListPortForwards(sessionID string) []PortForward {
	s.forwardMu.RLock()
	defer s.forwardMu.RUnlock()
	out := make([]PortForward, 0)
	for _, state := range s.forwards {
		if state.forward.SessionID == sessionID {
			out = append(out, state.forward)
		}
	}
	return out
}

func (s *SshService) StartLocalForward(sessionID, id, localHost string, localPort int, remoteHost string, remotePort int) error {
	if id == "" {
		return apperror.Validation("forward id is required")
	}
	s.mu.RLock()
	active, exists := s.sessions[sessionID]
	s.mu.RUnlock()
	if !exists || active.local || active.client == nil {
		return apperror.SSHSessionNotFound()
	}

	if localHost == "" {
		localHost = "127.0.0.1"
	}
	if remoteHost == "" {
		remoteHost = "127.0.0.1"
	}

	listener, err := net.Listen("tcp", fmt.Sprintf("%s:%d", localHost, localPort))
	if err != nil {
		return apperror.SSHConnectionFailed("failed to listen locally", err)
	}

	ctx, cancel := contextWithCancel()
	state := &portForwardState{
		forward: PortForward{
			ID:         id,
			SessionID:  sessionID,
			Mode:       "local",
			LocalHost:  localHost,
			LocalPort:  localPort,
			RemoteHost: remoteHost,
			RemotePort: remotePort,
		},
		cancel:   cancel,
		listener: listener,
	}

	s.forwardMu.Lock()
	if s.forwards == nil {
		s.forwards = make(map[string]*portForwardState)
	}
	if _, exists := s.forwards[id]; exists {
		s.forwardMu.Unlock()
		_ = listener.Close()
		cancel()
		return apperror.Validation("forward id already exists")
	}
	s.forwards[id] = state
	s.forwardMu.Unlock()

	go func() {
		defer listener.Close()
		for {
			localConn, err := listener.Accept()
			if err != nil {
				select {
				case <-ctx.Done():
					return
				default:
				}
				return
			}
			remoteAddr := fmt.Sprintf("%s:%d", remoteHost, remotePort)
			remoteConn, err := active.client.Dial("tcp", remoteAddr)
			if err != nil {
				_ = localConn.Close()
				continue
			}
			go copyBoth(localConn, remoteConn)
		}
	}()

	return nil
}

func (s *SshService) StartRemoteForward(sessionID, id, localHost string, localPort int, remoteHost string, remotePort int) error {
	if id == "" {
		return apperror.Validation("forward id is required")
	}
	s.mu.RLock()
	active, exists := s.sessions[sessionID]
	s.mu.RUnlock()
	if !exists || active.local || active.client == nil {
		return apperror.SSHSessionNotFound()
	}

	if localHost == "" {
		localHost = "127.0.0.1"
	}
	if remoteHost == "" {
		remoteHost = "127.0.0.1"
	}

	remoteAddr := fmt.Sprintf("%s:%d", remoteHost, remotePort)
	listener, err := active.client.Listen("tcp", remoteAddr)
	if err != nil {
		return apperror.SSHConnectionFailed("failed to listen on remote", err)
	}

	ctx, cancel := contextWithCancel()
	state := &portForwardState{
		forward: PortForward{
			ID:         id,
			SessionID:  sessionID,
			Mode:       "remote",
			LocalHost:  localHost,
			LocalPort:  localPort,
			RemoteHost: remoteHost,
			RemotePort: remotePort,
		},
		cancel:   cancel,
		listener: listener,
	}

	s.forwardMu.Lock()
	if s.forwards == nil {
		s.forwards = make(map[string]*portForwardState)
	}
	if _, exists := s.forwards[id]; exists {
		s.forwardMu.Unlock()
		_ = listener.Close()
		cancel()
		return apperror.Validation("forward id already exists")
	}
	s.forwards[id] = state
	s.forwardMu.Unlock()

	go func() {
		defer listener.Close()
		for {
			remoteConn, err := listener.Accept()
			if err != nil {
				select {
				case <-ctx.Done():
					return
				default:
				}
				return
			}
			localAddr := fmt.Sprintf("%s:%d", localHost, localPort)
			localConn, err := net.Dial("tcp", localAddr)
			if err != nil {
				_ = remoteConn.Close()
				continue
			}
			go copyBoth(remoteConn, localConn)
		}
	}()

	return nil
}

func (s *SshService) StopPortForward(id string) error {
	s.forwardMu.Lock()
	state, ok := s.forwards[id]
	if ok {
		delete(s.forwards, id)
	}
	s.forwardMu.Unlock()
	if !ok {
		return apperror.NotFound("port forward not found", nil)
	}
	state.cancel()
	if state.listener != nil {
		_ = state.listener.Close()
	}
	return nil
}

func copyBoth(a, b net.Conn) {
	defer a.Close()
	defer b.Close()
	done := make(chan struct{}, 2)
	go func() {
		_, _ = io.Copy(a, b)
		done <- struct{}{}
	}()
	go func() {
		_, _ = io.Copy(b, a)
		done <- struct{}{}
	}()
	<-done
}

type cancelContext struct {
	done chan struct{}
}

func contextWithCancel() (*cancelContext, func()) {
	ctx := &cancelContext{done: make(chan struct{})}
	return ctx, func() { close(ctx.done) }
}

func (c *cancelContext) Done() <-chan struct{} {
	return c.done
}
