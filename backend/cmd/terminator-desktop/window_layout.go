package main

import (
	"log/slog"
	"path/filepath"
	"sync"
	"time"

	"terminator-desktop/backend/internal/windowstate"

	"github.com/wailsapp/wails/v3/pkg/application"
	"github.com/wailsapp/wails/v3/pkg/events"
)

const windowStateFile = "window-state.json"

type windowLayoutStore struct {
	path   string
	window *application.WebviewWindow

	mu        sync.Mutex
	saveTimer *time.Timer
}

func newWindowLayoutStore(appDir string, window *application.WebviewWindow) *windowLayoutStore {
	return &windowLayoutStore{
		path:   filepath.Join(appDir, windowStateFile),
		window: window,
	}
}

func loadWindowLayout(appDir string) (windowstate.SavedWindowLayout, bool) {
	layout, found, err := windowstate.Load(filepath.Join(appDir, windowStateFile))
	if err != nil {
		slog.Warn("Failed to load window layout, using defaults", "error", err)
		return windowstate.DefaultLayout(), false
	}
	return layout, found
}

func applyLayoutToOptions(layout windowstate.SavedWindowLayout, hasSaved bool) application.WebviewWindowOptions {
	layout = layout.Normalized()
	opts := application.WebviewWindowOptions{
		Width:  layout.Width,
		Height: layout.Height,
	}

	if hasSaved {
		opts.InitialPosition = application.WindowXY
		opts.X = layout.X
		opts.Y = layout.Y
	} else {
		opts.InitialPosition = application.WindowCentered
	}

	if layout.Maximised {
		opts.StartState = application.WindowStateMaximised
	}

	return opts
}

func (s *windowLayoutStore) attach() {
	s.window.OnWindowEvent(events.Common.WindowDidMove, func(*application.WindowEvent) {
		s.scheduleSave()
	})
	s.window.OnWindowEvent(events.Common.WindowDidResize, func(*application.WindowEvent) {
		s.scheduleSave()
	})
	s.window.OnWindowEvent(events.Common.WindowMaximise, func(*application.WindowEvent) {
		s.scheduleSave()
	})
	s.window.OnWindowEvent(events.Common.WindowUnMaximise, func(*application.WindowEvent) {
		s.scheduleSave()
	})
	s.window.OnWindowEvent(events.Common.WindowRestore, func(*application.WindowEvent) {
		s.scheduleSave()
	})
	s.window.OnWindowEvent(events.Common.WindowClosing, func(*application.WindowEvent) {
		s.saveNow()
	})
}

func (s *windowLayoutStore) scheduleSave() {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.saveTimer != nil {
		s.saveTimer.Stop()
	}
	s.saveTimer = time.AfterFunc(400*time.Millisecond, func() {
		s.saveNow()
	})
}

func (s *windowLayoutStore) saveNow() {
	if s.window == nil {
		return
	}

	layout := s.capture()
	if err := windowstate.Save(s.path, layout); err != nil {
		slog.Warn("Failed to save window layout", "error", err)
	}
}

func (s *windowLayoutStore) capture() windowstate.SavedWindowLayout {
	bounds := s.window.Bounds()
	layout := windowstate.SavedWindowLayout{
		X:         bounds.X,
		Y:         bounds.Y,
		Width:     bounds.Width,
		Height:    bounds.Height,
		Maximised: s.window.IsMaximised(),
	}

	// When maximised, OS bounds are often the full work area; keep last normal size if we have it.
	if layout.Maximised {
		if saved, _, err := windowstate.Load(s.path); err == nil && saved.Width >= windowstate.MinWidth {
			layout.Width = saved.Width
			layout.Height = saved.Height
			layout.X = saved.X
			layout.Y = saved.Y
		}
	}

	return layout.Normalized()
}
