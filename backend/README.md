# backend

seidoku の API サーバー（Go）。構成と道具を選んだ理由は [ADR 0002](../docs/adr/0002-repository-and-backend-tools.md) にある。

## 置き場所

| 場所 | 中身 |
|---|---|
| `cmd/server/` | API サーバーの入り口 |
| `migrations/` | goose のマイグレーション（SQL）。sqlc もここをスキーマとして読む |
| `internal/db/queries/` | sqlc に渡すクエリ（SQL） |
| `internal/db/` | sqlc が生成する Go のコード。手で直さない |
| `internal/testdb/` | DB を使うテストに、マイグレーションを当てた空のスキーマを渡す |

## 動かし方

コマンドは `backend/` で実行する。PostgreSQL はリポジトリの直下の `compose.yaml` で立てる。

```sh
# PostgreSQL を立てる（開発用の seidoku と、テスト用の seidoku_test ができる）
docker compose up -d --wait

# マイグレーションを当てる
go tool goose -dir migrations postgres "postgres://seidoku:seidoku@localhost:54320/seidoku?sslmode=disable" up

# マイグレーションを足す
go tool goose -dir migrations -s create <名前> sql

# クエリから Go のコードを生成する
go tool sqlc generate

# テスト（compose の PostgreSQL が要る）
go test ./...

# サーバーを起動する
DATABASE_URL="postgres://seidoku:seidoku@localhost:54320/seidoku?sslmode=disable" go run ./cmd/server
```

接続先は `.env.example` にある。テストは `TEST_DATABASE_URL` があればそこに、なければ compose のテスト用 DB につなぐ。
