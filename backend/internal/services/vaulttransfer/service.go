package vaulttransfer

import (
	"context"
	"os"
	"path/filepath"
	"time"

	"github.com/wailsapp/wails/v3/pkg/application"

	"terminator-desktop/backend/internal/apperror"
	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/services/knownhosts"
	"terminator-desktop/backend/internal/vault"
)

type Service struct {
	q           *dbgen.Queries
	v           *vault.Vault
	knownHosts  *knownhosts.Service
	dialogs     *application.DialogManager
	mainWindow  application.Window
}

func NewService(
	q *dbgen.Queries,
	v *vault.Vault,
	knownHosts *knownhosts.Service,
	app *application.App,
	mainWindow application.Window,
) *Service {
	return &Service{
		q:          q,
		v:          v,
		knownHosts: knownHosts,
		dialogs:    app.Dialog,
		mainWindow: mainWindow,
	}
}

func (s *Service) DefaultSSHConfigPath(_ context.Context) (string, error) {
	return defaultSSHConfigPath()
}

func (s *Service) DefaultKnownHostsPath(_ context.Context) (string, error) {
	return defaultKnownHostsPath()
}

func (s *Service) ExportVault(ctx context.Context, encrypted bool, password string) (ExportResult, error) {
	if !s.v.IsUnlocked() {
		return ExportResult{}, errVaultLocked()
	}

	payload, err := collectVaultPayload(ctx, s.q, s.v)
	if err != nil {
		return ExportResult{}, err
	}

	data, err := encodeBundle(payload, encrypted, password)
	if err != nil {
		return ExportResult{}, err
	}

	path, err := s.promptSavePath(defaultExportFilename())
	if err != nil {
		return ExportResult{}, err
	}
	if path == "" {
		return ExportResult{Cancelled: true}, nil
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return ExportResult{}, err
	}

	return ExportResult{Path: path}, nil
}

func (s *Service) ImportVault(ctx context.Context, password string) (ImportResult, error) {
	if !s.v.IsUnlocked() {
		return ImportResult{}, errVaultLocked()
	}

	path, err := s.promptOpenPath()
	if err != nil {
		return ImportResult{}, err
	}
	if path == "" {
		return ImportResult{Cancelled: true}, nil
	}

	return s.importVaultFile(ctx, path, password)
}

func (s *Service) ImportSSHConfig(ctx context.Context, configPath string, mergeKnownHosts bool) (ImportResult, error) {
	if !s.v.IsUnlocked() {
		return ImportResult{}, errVaultLocked()
	}

	if configPath == "" {
		var err error
		configPath, err = defaultSSHConfigPath()
		if err != nil {
			return ImportResult{}, err
		}
	}

	payload, err := parseSSHConfigFile(configPath)
	if err != nil {
		return ImportResult{}, err
	}

	result, err := importPayload(ctx, s.q, s.v, payload)
	if err != nil {
		return result, err
	}

	if mergeKnownHosts {
		knownHostsPath, err := defaultKnownHostsPath()
		if err != nil {
			return result, err
		}
		merged, err := s.knownHosts.MergeFromFile(knownHostsPath)
		if err != nil {
			return result, err
		}
		result.KnownHostsMerged = merged
	}

	return result, nil
}

func (s *Service) ImportSSHConfigWithDialog(ctx context.Context, mergeKnownHosts bool) (ImportResult, error) {
	if !s.v.IsUnlocked() {
		return ImportResult{}, errVaultLocked()
	}

	defaultPath, err := defaultSSHConfigPath()
	if err != nil {
		return ImportResult{}, err
	}

	path, err := s.promptOpenPathAt(defaultPath)
	if err != nil {
		return ImportResult{}, err
	}
	if path == "" {
		return ImportResult{Cancelled: true}, nil
	}

	return s.ImportSSHConfig(ctx, path, mergeKnownHosts)
}

func (s *Service) importVaultFile(ctx context.Context, path, password string) (ImportResult, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return ImportResult{}, err
	}

	payload, err := decodeBundle(data, password)
	if err != nil {
		return ImportResult{}, err
	}

	return importPayload(ctx, s.q, s.v, payload)
}

func (s *Service) promptSavePath(defaultName string) (string, error) {
	dialog := s.dialogs.SaveFile().
		SetMessage("Export vault").
		SetFilename(defaultName).
		AddFilter("Nexus vault bundle", "*.json")
	if s.mainWindow != nil {
		dialog = dialog.AttachToWindow(s.mainWindow)
	}
	return dialog.PromptForSingleSelection()
}

func (s *Service) promptOpenPath() (string, error) {
	dialog := s.dialogs.OpenFile().
		SetMessage("Import vault").
		CanChooseFiles(true).
		CanChooseDirectories(false).
		AddFilter("Nexus vault bundle", "*.json")
	if s.mainWindow != nil {
		dialog = dialog.AttachToWindow(s.mainWindow)
	}
	return dialog.PromptForSingleSelection()
}

func (s *Service) promptOpenPathAt(defaultPath string) (string, error) {
	dialog := s.dialogs.OpenFile().
		SetMessage("Select SSH config").
		SetDirectory(filepath.Dir(defaultPath)).
		CanChooseFiles(true).
		CanChooseDirectories(false).
		AddFilter("SSH config", "config;*.conf").
		AddFilter("All files", "*")
	if s.mainWindow != nil {
		dialog = dialog.AttachToWindow(s.mainWindow)
	}
	return dialog.PromptForSingleSelection()
}

func errVaultLocked() error {
	return apperror.VaultLocked()
}

// defaultExportFilename returns a timestamped export filename.
func defaultExportFilename() string {
	return "nexus-vault-export-" + time.Now().UTC().Format("2006-01-02") + ".json"
}
