package commandhistory

import (
	"context"
	"database/sql"
	"testing"

	"terminator-desktop/backend/internal/dbgen"
	"terminator-desktop/backend/internal/migration"
	"terminator-desktop/backend/internal/vault"

	_ "github.com/mattn/go-sqlite3"
)

func TestAppendAndSearch(t *testing.T) {
	db, err := sql.Open("sqlite3", ":memory:")
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	if err := migration.RunMigrations(db); err != nil {
		t.Fatal(err)
	}

	v := vault.New()
	v.Unlock(
		[]byte("01234567890123456789012345678901"),
		[]byte("01234567890123456789012345678901"),
	)

	svc := NewService(dbgen.New(db), v)
	ctx := context.Background()

	if err := svc.Append(ctx, "host-1", "Web", "kubectl get pods"); err != nil {
		t.Fatal(err)
	}
	if err := svc.Append(ctx, "host-2", "DB", "systemctl status nginx"); err != nil {
		t.Fatal(err)
	}

	global, err := svc.Search(ctx, "kube", ScopeGlobal, "", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(global) != 1 || global[0].Command != "kubectl get pods" {
		t.Fatalf("global search: %+v", global)
	}

	local, err := svc.Search(ctx, "", ScopeLocal, "host-2", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(local) != 1 || local[0].HostID != "host-2" {
		t.Fatalf("local search: %+v", local)
	}
}
