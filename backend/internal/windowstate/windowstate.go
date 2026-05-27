package windowstate

import (
	"encoding/json"
	"os"
	"path/filepath"
)

const (
	DefaultWidth  = 1280
	DefaultHeight = 800
	MinWidth      = 640
	MinHeight     = 480
)

// SavedWindowLayout is persisted between app launches.
type SavedWindowLayout struct {
	X         int  `json:"x"`
	Y         int  `json:"y"`
	Width     int  `json:"width"`
	Height    int  `json:"height"`
	Maximised bool `json:"maximised"`
}

func DefaultLayout() SavedWindowLayout {
	return SavedWindowLayout{
		Width:  DefaultWidth,
		Height: DefaultHeight,
	}
}

func (l SavedWindowLayout) Normalized() SavedWindowLayout {
	if l.Width < MinWidth {
		l.Width = DefaultWidth
	}
	if l.Height < MinHeight {
		l.Height = DefaultHeight
	}
	if l.Width > 7680 {
		l.Width = DefaultWidth
	}
	if l.Height > 4320 {
		l.Height = DefaultHeight
	}
	return l
}

func Load(path string) (SavedWindowLayout, bool, error) {
	layout := DefaultLayout()

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return layout, false, nil
		}
		return layout, false, err
	}

	if err := json.Unmarshal(data, &layout); err != nil {
		return DefaultLayout(), true, err
	}

	return layout.Normalized(), true, nil
}

func Save(path string, layout SavedWindowLayout) error {
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return err
	}

	layout = layout.Normalized()
	data, err := json.MarshalIndent(layout, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}
