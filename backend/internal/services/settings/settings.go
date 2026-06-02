package settings

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

const (
	DefaultTerminalFontFamily  = "Cascadia Code"
	DefaultTerminalFontSize    = 14
)

const (
	DefaultVaultAutoLockMinutes = 15
	minVaultAutoLockMinutes     = 1
	maxVaultAutoLockMinutes     = 720

	DefaultSshKeepAliveIntervalSeconds = 30
	minSshKeepAliveIntervalSeconds     = 5
	maxSshKeepAliveIntervalSeconds     = 300
)

type AppSettings struct {
	Language               string `json:"language"`
	TerminalFontFamily     string `json:"terminalFontFamily"`
	TerminalFontSize       int    `json:"terminalFontSize"`
	TerminalWebglRenderer  bool   `json:"terminalWebglRenderer"`
	ShowLocalhostHost      bool   `json:"showLocalhostHost"`
	AppBackgroundColor     string `json:"appBackgroundColor"`
	AccentColor            string `json:"accentColor"`
	VaultAutoLockEnabled   bool   `json:"vaultAutoLockEnabled"`
	VaultAutoLockMinutes   int    `json:"vaultAutoLockMinutes"`
	VaultAutoLockOnSleep   bool   `json:"vaultAutoLockOnSleep"`
	SessionRestoreEnabled       bool `json:"sessionRestoreEnabled"`
	CommandHistoryEnabled       bool `json:"commandHistoryEnabled"`
	SshKeepAliveEnabled         bool `json:"sshKeepAliveEnabled"`
	SshKeepAliveIntervalSeconds int  `json:"sshKeepAliveIntervalSeconds"`
	SshReconnectPromptEnabled   bool `json:"sshReconnectPromptEnabled"`
}

func normalizeSettings(settings AppSettings) AppSettings {
	if settings.Language == "" {
		settings.Language = "en"
	}
	if settings.TerminalFontFamily == "" {
		settings.TerminalFontFamily = DefaultTerminalFontFamily
	}
	if settings.TerminalFontSize <= 0 {
		settings.TerminalFontSize = DefaultTerminalFontSize
	}
	settings.AppBackgroundColor = normalizeAppBackgroundColor(settings.AppBackgroundColor)
	settings.AccentColor = normalizeAccentColor(settings.AccentColor)
	settings.VaultAutoLockMinutes = normalizeVaultAutoLockMinutes(settings.VaultAutoLockMinutes)
	legacyKeepAlive := settings.SshKeepAliveIntervalSeconds == 0
	settings.SshKeepAliveIntervalSeconds = normalizeSshKeepAliveIntervalSeconds(
		settings.SshKeepAliveIntervalSeconds,
	)
	if legacyKeepAlive {
		settings.SshKeepAliveEnabled = true
	}
	return settings
}

func normalizeSshKeepAliveIntervalSeconds(seconds int) int {
	if seconds <= 0 {
		return DefaultSshKeepAliveIntervalSeconds
	}
	if seconds < minSshKeepAliveIntervalSeconds {
		return minSshKeepAliveIntervalSeconds
	}
	if seconds > maxSshKeepAliveIntervalSeconds {
		return maxSshKeepAliveIntervalSeconds
	}
	return seconds
}

func normalizeVaultAutoLockMinutes(minutes int) int {
	if minutes <= 0 {
		return DefaultVaultAutoLockMinutes
	}
	if minutes < minVaultAutoLockMinutes {
		return minVaultAutoLockMinutes
	}
	if minutes > maxVaultAutoLockMinutes {
		return maxVaultAutoLockMinutes
	}
	return minutes
}

type SettingsService struct {
	configPath string
	mutex      sync.RWMutex
}

func NewSettingsService(appDir string) *SettingsService {
	return &SettingsService{
		configPath: filepath.Join(appDir, "settings.json"),
	}
}

func (s *SettingsService) GetSettings() (AppSettings, error) {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	settings := AppSettings{
		Language:              "en",
		TerminalFontFamily:      DefaultTerminalFontFamily,
		TerminalFontSize:        DefaultTerminalFontSize,
		TerminalWebglRenderer:   true,
		ShowLocalhostHost:       true,
		AppBackgroundColor:      DefaultAppBackgroundColor,
		AccentColor:             DefaultAccentColor,
		SessionRestoreEnabled:         true,
		CommandHistoryEnabled:         true,
		SshKeepAliveEnabled:           true,
		SshKeepAliveIntervalSeconds:   DefaultSshKeepAliveIntervalSeconds,
		SshReconnectPromptEnabled:     true,
	}

	data, err := os.ReadFile(s.configPath)
	if err != nil {
		if os.IsNotExist(err) {
			return normalizeSettings(settings), nil
		}
		return settings, err
	}

	err = json.Unmarshal(data, &settings)
	if err != nil {
		return settings, err
	}

	return normalizeSettings(settings), nil
}

func (s *SettingsService) SaveSettings(settings AppSettings) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	settings = normalizeSettings(settings)

	data, err := json.MarshalIndent(settings, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.configPath, data, 0644)
}