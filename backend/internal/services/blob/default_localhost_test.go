package blob

import (
	"testing"
)

func TestOsLoginName(t *testing.T) {
	t.Setenv("USER", "alice")
	t.Setenv("USERNAME", "bob")

	if got := osLoginName(); got != "alice" {
		t.Fatalf("osLoginName() = %q, want alice", got)
	}
}

func TestDefaultLocalhostHost(t *testing.T) {
	h := defaultLocalhostHost()
	if h.ID != DefaultLocalhostHostID {
		t.Fatalf("id = %q", h.ID)
	}
	if h.Host != "" || h.Port != 0 {
		t.Fatalf("unexpected address: %s:%d", h.Host, h.Port)
	}
	if h.Name != "Local" {
		t.Fatalf("name = %q", h.Name)
	}
	if h.Type != TypeHost {
		t.Fatalf("type = %q", h.Type)
	}
}
