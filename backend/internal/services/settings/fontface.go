package settings

import (
	"encoding/base64"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/adrg/sysfont"
)

const terminalFontFaceAlias = "terminator-terminal-font"

// TerminalFontFace describes how the frontend should load the terminal font.
type TerminalFontFace struct {
	// Family is the CSS font-family value for xterm (may be a @font-face alias).
	Family string `json:"family"`
	// CSS is an optional @font-face rule (data URL) when a system file was resolved.
	CSS string `json:"css,omitempty"`
}

// BuildTerminalFontFace resolves a system font file for canvas rendering in the webview.
func BuildTerminalFontFace(familyName string) (TerminalFontFace, error) {
	familyName = strings.TrimSpace(familyName)
	if familyName == "" {
		familyName = DefaultTerminalFontFamily
	}

	path := findFontPathForFamily(familyName)
	if path == "" {
		return TerminalFontFace{Family: cssFontFamilyStack(familyName)}, nil
	}

	const maxFontBytes = 8 << 20
	info, err := os.Stat(path)
	if err != nil || info.Size() <= 0 || info.Size() > maxFontBytes {
		return TerminalFontFace{Family: cssFontFamilyStack(familyName)}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return TerminalFontFace{Family: cssFontFamilyStack(familyName)}, nil
	}

	mime := fontDataMIME(path)
	encoded := base64.StdEncoding.EncodeToString(data)
	css := fmt.Sprintf(
		`@font-face{font-family:%q;font-style:normal;font-weight:normal;font-display:block;`+
			`src:url("data:%s;base64,%s") format("%s");}`,
		terminalFontFaceAlias,
		mime,
		encoded,
		fontFormatHint(path),
	)

	return TerminalFontFace{
		Family: cssFontFamilyStack(terminalFontFaceAlias),
		CSS:    css,
	}, nil
}

func (s *SettingsService) BuildTerminalFontFace(familyName string) (TerminalFontFace, error) {
	return BuildTerminalFontFace(familyName)
}

func findFontPathForFamily(familyName string) string {
	finder := sysfont.NewFinder(nil)
	if finder == nil {
		return ""
	}

	target := strings.ToLower(strings.TrimSpace(familyName))
	var containsMatch string

	for _, font := range finder.List() {
		if font.Filename == "" {
			continue
		}
		resolved := resolveFontFamily(font.Family, font.Filename)
		if resolved == "" {
			continue
		}
		if strings.EqualFold(resolved, familyName) {
			return font.Filename
		}
		lower := strings.ToLower(resolved)
		if containsMatch == "" && (lower == target || strings.Contains(lower, target) || strings.Contains(target, lower)) {
			containsMatch = font.Filename
		}
	}

	return containsMatch
}

func cssFontFamilyStack(primary string) string {
	primary = strings.TrimSpace(primary)
	if primary == "" {
		primary = DefaultTerminalFontFamily
	}
	if strings.Contains(primary, ",") {
		return primary
	}
	return fmt.Sprintf("%q, monospace", primary)
}

func fontDataMIME(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".otf":
		return "font/otf"
	case ".woff":
		return "font/woff"
	case ".woff2":
		return "font/woff2"
	default:
		return "font/ttf"
	}
}

func fontFormatHint(path string) string {
	switch strings.ToLower(filepath.Ext(path)) {
	case ".otf":
		return "opentype"
	case ".woff":
		return "woff"
	case ".woff2":
		return "woff2"
	default:
		return "truetype"
	}
}
