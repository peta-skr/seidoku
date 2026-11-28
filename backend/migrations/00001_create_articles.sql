-- +goose Up
CREATE TABLE articles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- ID
    final_url text NOT NULL UNIQUE, -- 取得したときのURL
    title text NOT NULL, -- タイトル
    content text NOT NULL, -- 本文
    content_hash text NOT NULL, -- 本文のハッシュ
    fetched_at timestamptz NOT NULL DEFAULT now(), -- 取得日時
    questions_generated_at timestamptz, -- 問いを作った日時
    questions_failure_reason text, -- 問いを作れなかった理由
    CONSTRAINT articles_reason_requires_generated_at_check CHECK(
        questions_generated_at IS NOT NULL OR questions_failure_reason IS NULL
    )
);

CREATE TABLE article_urls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), -- ID
    url text NOT NULL UNIQUE, -- 入力URL
    article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE article_urls;

DROP TABLE articles;
