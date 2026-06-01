package autolock

import (
	"terminator-desktop/backend/internal/services/auth"
	"terminator-desktop/backend/internal/services/settings"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

const VaultAutoLockedEvent = "vault:auto-locked"

type Service struct {
	auth     *auth.AuthService
	settings *settings.SettingsService
	app      *application.App
}

func NewService(
	auth *auth.AuthService,
	settings *settings.SettingsService,
	app *application.App,
) *Service {
	return &Service{
		auth:     auth,
		settings: settings,
		app:      app,
	}
}

func (s *Service) Attach(window application.Window) {
	window.OnWindowEvent(events.Common.WindowHide, func(*application.WindowEvent) {
		s.maybeLockOnHide()
	})
}

func (s *Service) maybeLockOnHide() {
	cfg, err := s.settings.GetSettings()
	if err != nil || !cfg.VaultAutoLockOnSleep {
		return
	}
	if !s.auth.IsVaultUnlocked() {
		return
	}
	s.auth.LockVault()
	s.app.Event.Emit(VaultAutoLockedEvent, true)
}
