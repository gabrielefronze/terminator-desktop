package settings

import "testing"

func TestCssFontFamilyStack(t *testing.T) {
	if got := cssFontFamilyStack("Fira Code Nerd Font Mono"); got != `"Fira Code Nerd Font Mono", monospace` {
		t.Fatalf("got %q", got)
	}
}

func TestFontDataMIME(t *testing.T) {
	if fontDataMIME("/fonts/Foo.otf") != "font/otf" {
		t.Fatal("otf mime")
	}
	if fontFormatHint("/fonts/Foo.ttf") != "truetype" {
		t.Fatal("ttf format")
	}
}
