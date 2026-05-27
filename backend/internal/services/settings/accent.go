package settings

const DefaultAccentColor = "#6366f1"

func normalizeAccentColor(color string) string {
	return normalizeHexColor(color, DefaultAccentColor)
}
