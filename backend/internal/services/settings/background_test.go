package settings

import "testing"

func TestNormalizeAppBackgroundColor(t *testing.T) {
	if got := normalizeAppBackgroundColor(""); got != DefaultAppBackgroundColor {
		t.Fatalf("empty = %q", got)
	}
	if got := normalizeAppBackgroundColor("#abc"); got != "#aabbcc" {
		t.Fatalf("short hex = %q", got)
	}
	if got := normalizeAppBackgroundColor("not-a-color"); got != DefaultAppBackgroundColor {
		t.Fatalf("invalid = %q", got)
	}
}
