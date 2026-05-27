package windowstate

import (
	"os"
	"path/filepath"
	"testing"
)

func TestNormalizedClampsSize(t *testing.T) {
	layout := SavedWindowLayout{Width: 100, Height: 100}.Normalized()
	if layout.Width != DefaultWidth || layout.Height != DefaultHeight {
		t.Fatalf("got %+v", layout)
	}
}

func TestSaveLoadRoundTrip(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "window-state.json")

	original := SavedWindowLayout{
		X:         120,
		Y:         80,
		Width:     1440,
		Height:    900,
		Maximised: true,
	}
	if err := Save(path, original); err != nil {
		t.Fatal(err)
	}

	loaded, found, err := Load(path)
	if err != nil {
		t.Fatal(err)
	}
	if !found || loaded != original {
		t.Fatalf("loaded %+v found=%v != original %+v", loaded, found, original)
	}
}

func TestLoadMissingFileUsesDefaults(t *testing.T) {
	layout, found, err := Load(filepath.Join(t.TempDir(), "missing.json"))
	if err != nil {
		t.Fatal(err)
	}
	if found {
		t.Fatal("expected no saved file")
	}
	if layout.Width != DefaultWidth || layout.Height != DefaultHeight {
		t.Fatalf("got %+v", layout)
	}
}

func TestLoadInvalidJSON(t *testing.T) {
	path := filepath.Join(t.TempDir(), "window-state.json")
	if err := os.WriteFile(path, []byte("{"), 0644); err != nil {
		t.Fatal(err)
	}
	layout, found, err := Load(path)
	if err == nil {
		t.Fatal("expected error")
	}
	if !found || layout.Width != DefaultWidth {
		t.Fatalf("got %+v found=%v", layout, found)
	}
}
