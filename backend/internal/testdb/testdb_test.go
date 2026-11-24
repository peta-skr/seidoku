package testdb_test

import (
	"context"
	"testing"

	"github.com/peta-skr/seidoku/backend/internal/testdb"
)

// 2つのテストの DB が、互いのテーブルを見ないことを確かめる。
func TestNewIsolatesSchemas(t *testing.T) {
	ctx := context.Background()
	a := testdb.New(t)
	b := testdb.New(t)

	if _, err := a.Exec(ctx, "CREATE TABLE only_in_a (id int)"); err != nil {
		t.Fatalf("create table in a: %v", err)
	}

	var exists bool
	err := b.QueryRow(ctx, "SELECT to_regclass('only_in_a') IS NOT NULL").Scan(&exists)
	if err != nil {
		t.Fatalf("query b: %v", err)
	}
	if exists {
		t.Error("table created in a is visible from b")
	}
}
