package settings

import "testing"

func TestNormalizeAccentColor(t *testing.T) {
	if got := normalizeAccentColor(""); got != DefaultAccentColor {
		t.Fatalf("empty = %q", got)
	}
	if got := normalizeAccentColor("#abc"); got != "#aabbcc" {
		t.Fatalf("short hex = %q", got)
	}
	if got := normalizeAccentColor("not-a-color"); got != DefaultAccentColor {
		t.Fatalf("invalid = %q", got)
	}
}
