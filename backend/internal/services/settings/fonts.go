package settings

import (
	"sort"

	"github.com/adrg/sysfont"
)

// ListSystemFonts returns sorted, unique font family names installed on the system.
func ListSystemFonts() []string {
	finder := sysfont.NewFinder(nil)
	if finder == nil {
		return fallbackMonospaceFonts()
	}

	seen := make(map[string]struct{})
	for _, font := range finder.List() {
		family := resolveFontFamily(font.Family, font.Filename)
		if family == "" {
			continue
		}
		seen[family] = struct{}{}
	}

	if len(seen) == 0 {
		return fallbackMonospaceFonts()
	}

	families := make([]string, 0, len(seen))
	for family := range seen {
		families = append(families, family)
	}
	sort.Strings(families)
	return families
}

func (s *SettingsService) ListSystemFonts() []string {
	return ListSystemFonts()
}

func fallbackMonospaceFonts() []string {
	return []string{
		"Andale Mono",
		"Cascadia Code",
		"Consolas",
		"Courier New",
		"Fira Code",
		"JetBrains Mono",
		"Menlo",
		"Monaco",
		"SF Mono",
		"Source Code Pro",
		"Ubuntu Mono",
	}
}
