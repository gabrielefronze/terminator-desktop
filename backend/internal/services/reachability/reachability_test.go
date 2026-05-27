package reachability

import "testing"

func TestPingTargetLocal(t *testing.T) {
	r := pingTarget(HostPingTarget{ID: "1", Local: true})
	if !r.Reachable || r.LatencyMs != 0 {
		t.Fatalf("local host = %+v", r)
	}
}

func TestPingTargetEmptyHost(t *testing.T) {
	r := pingTarget(HostPingTarget{ID: "1", Host: "", Port: 22})
	if r.Reachable {
		t.Fatalf("empty host should be unreachable: %+v", r)
	}
}

func TestNormalizeHost(t *testing.T) {
	if got := normalizeHost("10.0.0.1:2222"); got != "10.0.0.1" {
		t.Fatalf("got %q", got)
	}
}
