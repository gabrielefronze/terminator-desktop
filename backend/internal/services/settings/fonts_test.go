package settings

import "testing"

func TestFamilyFromFilename_NerdFonts(t *testing.T) {
	tests := []struct {
		file string
		want string
	}{
		{
			"/Users/me/Library/Fonts/FiraCodeNerdFont-Regular.ttf",
			"Fira Code Nerd Font",
		},
		{
			"/Users/me/Library/Fonts/FiraCodeNerdFontMono-Regular.ttf",
			"Fira Code Nerd Font Mono",
		},
		{
			"/Users/me/Library/Fonts/FiraCodeNerdFontPropo-Bold.ttf",
			"Fira Code Nerd Font Propo",
		},
		{
			"/Users/me/Library/Fonts/JetBrainsMonoNerdFont-Regular.ttf",
			"JetBrains Mono Nerd Font",
		},
		{
			"/Library/Fonts/MesloLGSNerdFont-Regular.ttf",
			"Meslo LGS Nerd Font",
		},
		{
			"CaskaydiaCoveNerdFontMono-BoldItalic.ttf",
			"Caskaydia Cove Nerd Font Mono",
		},
	}

	for _, tc := range tests {
		got := familyFromFilename(tc.file)
		if got != tc.want {
			t.Errorf("familyFromFilename(%q) = %q, want %q", tc.file, got, tc.want)
		}
	}
}

func TestResolveFontFamily_PrefersSysfontFamily(t *testing.T) {
	got := resolveFontFamily("Helvetica Neue", "/tmp/SomeFile.ttf")
	if got != "Helvetica Neue" {
		t.Fatalf("got %q, want Helvetica Neue", got)
	}
}

func TestResolveFontFamily_FallsBackToFilename(t *testing.T) {
	got := resolveFontFamily("", "/tmp/FiraCodeNerdFontMono-Regular.ttf")
	if got != "Fira Code Nerd Font Mono" {
		t.Fatalf("got %q", got)
	}
}

func TestListSystemFonts_IncludesDerivedFamilies(t *testing.T) {
	// Smoke test: should not panic and should return sorted unique names.
	families := ListSystemFonts()
	if len(families) == 0 {
		t.Fatal("expected at least one font family")
	}
	for i := 1; i < len(families); i++ {
		if families[i] < families[i-1] {
			t.Fatalf("not sorted: %q before %q", families[i-1], families[i])
		}
	}
}
