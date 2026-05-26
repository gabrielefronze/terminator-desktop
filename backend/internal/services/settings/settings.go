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

type AppSettings struct {
	Language            string `json:"language"`
	TerminalFontFamily  string `json:"terminalFontFamily"`
	TerminalFontSize    int    `json:"terminalFontSize"`
	ShowLocalhostHost   bool   `json:"showLocalhostHost"`
	AppBackgroundColor  string `json:"appBackgroundColor"`
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
	return settings
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
		Language:            "en",
		TerminalFontFamily:  DefaultTerminalFontFamily,
		TerminalFontSize:    DefaultTerminalFontSize,
		ShowLocalhostHost:   true,
		AppBackgroundColor:  DefaultAppBackgroundColor,
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