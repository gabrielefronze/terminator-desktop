package settings

import (
	"path/filepath"
	"strings"
	"unicode"
)

// common typographic weight/style suffixes on font files (longest first).
var fontStyleSuffixes = []string{
	" Bold Italic",
	" SemiBold Italic",
	" DemiBold Italic",
	" ExtraBold Italic",
	" BoldItalic",
	" SemiBoldItalic",
	" ExtraLight",
	" UltraLight",
	" SemiBold",
	" DemiBold",
	" ExtraBold",
	" Regular",
	" Italic",
	" Retina",
	" Medium",
	" Light",
	" Bold",
	" Thin",
	" Black",
	" Heavy",
	" Book",
	"-BoldItalic",
	"-SemiBoldItalic",
	"-Bold-Italic",
	"-Regular",
	"-Italic",
	"-Retina",
	"-SemiBold",
	"-DemiBold",
	"-ExtraBold",
	"-ExtraLight",
	"-UltraLight",
	"-Medium",
	"-Light",
	"-Bold",
	"-Thin",
	"-Black",
	"-Heavy",
	"-Book",
}

func resolveFontFamily(family, filename string) string {
	family = strings.TrimSpace(family)
	if family != "" {
		return family
	}
	return familyFromFilename(filename)
}

func familyFromFilename(filename string) string {
	if filename == "" {
		return ""
	}

	base := filepath.Base(filename)
	base = strings.TrimSuffix(base, filepath.Ext(base))
	base = strings.TrimSpace(base)
	if base == "" {
		return ""
	}

	stem := stripFontStyleSuffix(base)
	return humanizeFontStem(stem)
}

func stripFontStyleSuffix(name string) string {
	lower := strings.ToLower(name)
	for _, suffix := range fontStyleSuffixes {
		sufLower := strings.ToLower(suffix)
		if strings.HasSuffix(lower, sufLower) {
			cut := len(name) - len(suffix)
			if cut > 0 {
				return strings.TrimSpace(name[:cut])
			}
		}
	}
	return name
}

// compact phrases in font filenames → spaced labels (longest match first).
var filenamePhraseReplacements = []struct{ compact, spaced string }{
	{"FiraCodeNerdFontMono", "Fira Code Nerd Font Mono"},
	{"FiraCodeNerdFontPropo", "Fira Code Nerd Font Propo"},
	{"FiraCodeNerdFont", "Fira Code Nerd Font"},
	{"JetBrainsMonoNerdFont", "JetBrains Mono Nerd Font"},
	{"CaskaydiaCoveNerdFontMono", "Caskaydia Cove Nerd Font Mono"},
	{"CaskaydiaCoveNerdFont", "Caskaydia Cove Nerd Font"},
	{"MesloLGSNerdFont", "Meslo LGS Nerd Font"},
	{"NerdFontMono", "Nerd Font Mono"},
	{"NerdFontPropo", "Nerd Font Propo"},
	{"NerdFont", "Nerd Font"},
	{"JetBrainsMono", "JetBrains Mono"},
	{"CaskaydiaCove", "Caskaydia Cove"},
	{"MesloLGS", "Meslo LGS"},
	{"FiraCode", "Fira Code"},
	{"RedHatMono", "Red Hat Mono"},
}

func humanizeFontStem(stem string) string {
	stem = strings.ReplaceAll(stem, "_", " ")
	stem = strings.TrimSpace(stem)
	if stem == "" {
		return ""
	}

	for _, pair := range filenamePhraseReplacements {
		stem = strings.ReplaceAll(stem, pair.compact, pair.spaced)
	}

	if strings.Contains(stem, " ") {
		return collapseSpaces(stem)
	}

	return splitCamelCase(stem)
}

func splitCamelCase(s string) string {
	runes := []rune(s)
	if len(runes) == 0 {
		return ""
	}

	var b strings.Builder
	b.Grow(len(s) + 8)

	for i, r := range runes {
		if i > 0 {
			prev := runes[i-1]
			if unicode.IsLower(prev) && unicode.IsUpper(r) {
				b.WriteRune(' ')
			}
		}
		b.WriteRune(r)
	}

	return collapseSpaces(b.String())
}

func collapseSpaces(s string) string {
	return strings.Join(strings.Fields(s), " ")
}
