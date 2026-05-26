package settings

import (
	"regexp"
	"strings"
)

const DefaultAppBackgroundColor = "#09090b"

var hexColorPattern = regexp.MustCompile(`^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)

func normalizeAppBackgroundColor(color string) string {
	color = strings.TrimSpace(color)
	if color == "" {
		return DefaultAppBackgroundColor
	}
	if !hexColorPattern.MatchString(color) {
		return DefaultAppBackgroundColor
	}
	if len(color) == 4 {
		return expandShortHex(color)
	}
	return color
}

func expandShortHex(hex string) string {
	return "#" +
		strings.Repeat(string(hex[1]), 2) +
		strings.Repeat(string(hex[2]), 2) +
		strings.Repeat(string(hex[3]), 2)
}
