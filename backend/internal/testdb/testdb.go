// Package testdb は、DB を使うテストに、マイグレーションを当てた空の DB を渡す。
//
// テストごとに別のスキーマを作り、search_path をそのスキーマにした接続を返す。
// go test ./... はパッケージを並行に流すので、1つのスキーマを共有するとテスト同士の
// データがぶつかる。スキーマはテストの終わりに消す。
package testdb

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"os"
	"path/filepath"
	"runtime"
	"testing"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

// defaultURL は compose.yaml の PostgreSQL のテスト用 DB。.env.example と同じ値。
const defaultURL = "postgres://seidoku:seidoku@localhost:54320/seidoku_test?sslmode=disable"

// New は、マイグレーションを当てた専用のスキーマにつながる接続を返す。
// 接続先は TEST_DATABASE_URL、なければ compose.yaml のテスト用 DB。
func New(t testing.TB) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = defaultURL
	}

	admin, err := pgx.Connect(ctx, dsn)
	if err != nil {
		t.Fatalf("connect to test database (is `docker compose up -d` running?): %v", err)
	}
	defer admin.Close(ctx)

	schema := "test_" + randomHex(t, 8)
	if _, err := admin.Exec(ctx, "CREATE SCHEMA "+pgx.Identifier{schema}.Sanitize()); err != nil {
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		ctx := context.Background()
		conn, err := pgx.Connect(ctx, dsn)
		if err != nil {
			t.Errorf("connect to drop schema %s: %v", schema, err)
			return
		}
		defer conn.Close(ctx)
		if _, err := conn.Exec(ctx, "DROP SCHEMA "+pgx.Identifier{schema}.Sanitize()+" CASCADE"); err != nil {
			t.Errorf("drop schema %s: %v", schema, err)
		}
	})

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("open pool: %v", err)
	}
	t.Cleanup(pool.Close)

	migrate(t, pool)
	return pool
}

func migrate(t testing.TB, pool *pgxpool.Pool) {
	t.Helper()
	db := stdlib.OpenDBFromPool(pool)
	defer db.Close()

	provider, err := goose.NewProvider(goose.DialectPostgres, db, os.DirFS(migrationsDir(t)))
	if errors.Is(err, goose.ErrNoMigrations) {
		// 最初のマイグレーションを書くまでは、当てるものがない
		return
	}
	if err != nil {
		t.Fatalf("load migrations: %v", err)
	}
	if _, err := provider.Up(context.Background()); err != nil {
		t.Fatalf("apply migrations: %v", err)
	}
}

// migrationsDir は backend/migrations の絶対パスを返す。
// go test はパッケージのディレクトリで流れるので、相対パスではなくこのファイルの位置から決める。
func migrationsDir(t testing.TB) string {
	t.Helper()
	_, file, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("locate testdb source file")
	}
	return filepath.Join(filepath.Dir(file), "..", "..", "migrations")
}

func randomHex(t testing.TB, n int) string {
	t.Helper()
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		t.Fatalf("random: %v", err)
	}
	return hex.EncodeToString(b)
}
