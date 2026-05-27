package reachability

import (
	"context"
	"fmt"
	"net"
	"strconv"
	"sync"
	"time"
)

const (
	defaultPort    = 22
	pingTimeout    = 3 * time.Second
	maxConcurrency = 12
)

// HostPingTarget identifies a host to probe.
type HostPingTarget struct {
	ID    string `json:"id"`
	Host  string `json:"host"`
	Port  int    `json:"port"`
	Local bool   `json:"local"`
}

// HostPingResult is the outcome of a TCP reachability check.
type HostPingResult struct {
	ID        string `json:"id"`
	Reachable bool   `json:"reachable"`
	LatencyMs int64  `json:"latencyMs"`
}

type ReachabilityService struct{}

func NewReachabilityService() *ReachabilityService {
	return &ReachabilityService{}
}

func (s *ReachabilityService) PingHosts(_ context.Context, targets []HostPingTarget) []HostPingResult {
	if len(targets) == 0 {
		return nil
	}

	results := make([]HostPingResult, len(targets))
	var wg sync.WaitGroup
	sem := make(chan struct{}, maxConcurrency)

	for i, target := range targets {
		wg.Add(1)
		go func(idx int, t HostPingTarget) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()
			results[idx] = pingTarget(t)
		}(i, target)
	}

	wg.Wait()
	return results
}

func pingTarget(target HostPingTarget) HostPingResult {
	result := HostPingResult{ID: target.ID}

	if target.Local {
		result.Reachable = true
		result.LatencyMs = 0
		return result
	}

	host := normalizeHost(target.Host)
	if host == "" {
		return result
	}

	port := target.Port
	if port <= 0 {
		port = defaultPort
	}

	addr := net.JoinHostPort(host, strconv.Itoa(port))
	start := time.Now()
	conn, err := net.DialTimeout("tcp", addr, pingTimeout)
	if err != nil {
		return result
	}
	_ = conn.Close()

	result.Reachable = true
	result.LatencyMs = time.Since(start).Milliseconds()
	return result
}

func normalizeHost(host string) string {
	h := host
	if h == "" {
		return ""
	}
	// Allow host:port in the host field; PingHosts uses the Port field when set.
	if targetHost, _, err := net.SplitHostPort(h); err == nil {
		return targetHost
	}
	return h
}

// ResolveAddr returns the dial address for display/debug.
func ResolveAddr(host string, port int) string {
	h := normalizeHost(host)
	if h == "" {
		return ""
	}
	p := port
	if p <= 0 {
		p = defaultPort
	}
	return fmt.Sprintf("%s:%d", h, p)
}
