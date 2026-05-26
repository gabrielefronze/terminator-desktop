package blob

import (
	"os"
	"runtime"
)

// DefaultLocalhostHostID is a stable id for the seeded localhost entry.
const DefaultLocalhostHostID = "a0000000-0000-4000-8000-000000000001"

func defaultLocalhostHost() Host {
	return Host{
		ID:       DefaultLocalhostHostID,
		Type:     TypeHost,
		Name:     "Local",
		Host:     "",
		Port:     0,
		Username: "",
		Icon:     "monitor",
		Color:    "#3b82f6",
	}
}

func osLoginName() string {
	if runtime.GOOS == "windows" {
		if u := os.Getenv("USERNAME"); u != "" {
			return u
		}
	}
	if u := os.Getenv("USER"); u != "" {
		return u
	}
	return "root"
}
