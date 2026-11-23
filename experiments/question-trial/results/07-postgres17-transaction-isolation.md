# 07 13.2. Transaction Isolation

このファイルは `tools/report.mjs` が書き出したものです。評価は `evaluation.md` に書きます。

## 資料

- 種類：公式ドキュメント（英語、PostgreSQL 17 Documentation）
- URL：https://www.postgresql.org/docs/17/transaction-iso.html
- 取得日時：2026-11-16T12:50:12.406Z
- 読む範囲：ページ全体（23435字。ページ全体は23435字）
- 読む範囲の本文の SHA-256：`427a4e58c5a10be08f2ead970477dd42f58261574cd20c6248d5b5eec210e4ff`

## 本文の取得

- 方法：Node の fetch で HTML を取り、Readability（@mozilla/readability）で本文を抜き出して、見出し・段落・コード・表をテキストに直した
- HTML 47685 バイト、取得 3647 ミリ秒、見出し 5 個、図 0 枚、コード 7 個、表 1 個、数式 0 個（図・コード・表・数式はページ全体での数）

手間取った点、気づいた点：

- 静的な HTML で、取得と抽出はそのまま通った
- ページの題（13.2. Transaction Isolation）が本文から落ちる。Readability がタイトルを本文と別に返すため
- 見出しの末尾にアンカー用の「#」が残る
- 用語の定義（dl 要素）が段落に平たくなる
- 対象バージョンは本文になく、URL の /17/ から取るしかない

## 生成された問い

### 07-Q1（観点：なぜ）— 機械照合：通過

**問い**：PostgreSQL 17 では SQL 標準の4つのトランザクション分離レベルをすべて指定できるが、標準の定義どおりには振る舞わないレベルがある。なぜそのような実装になっているのか。また、それが SQL 標準に照らして許されるのはなぜか。

**模範解答の要点**：

1. 内部で実装されている分離レベルは3つだけで、最も弱いレベルを指定しても1つ上のレベルと同じ動作になる。
2. 多版型同時実行制御（MVCC）の構造に標準のレベルを対応づけるには、そうするのが唯一筋の通ったやり方だから。
3. 標準が定めているのは各レベルで起きてはならない現象だけなので、それより強い保証を与える実装は認められる。

**根拠**：

根拠1（要点 1 を支える。見出し「」）

> In PostgreSQL, you can request any of the four standard transaction isolation levels, but internally only three distinct isolation levels are implemented, i.e., PostgreSQL's Read Uncommitted mode behaves like Read Committed.

- 照合：一字一句一致、見出しも一致（224字）

根拠2（要点 2 を支える。見出し「」）

> This is because it is the only sensible way to map the standard isolation levels to PostgreSQL's multiversion concurrency control architecture.

- 照合：一字一句一致、見出しも一致（143字）

根拠3（要点 3 を支える。見出し「」）

> This is acceptable under the SQL standard because the standard specifies which anomalies must not occur at certain isolation levels; higher guarantees are acceptable.

- 照合：一字一句一致、見出しも一致（166字）

### 07-Q2（観点：比べると）— 機械照合：通過

**問い**：PostgreSQL 17 の Read Committed と Repeatable Read では、問い合わせが参照するスナップショットの取り方がどう違うか。その違いは、1つのトランザクションの中で同じ SELECT を繰り返したときの結果にどう表れるか。

**模範解答の要点**：

1. Read Committed では、問い合わせごとに、その問い合わせを開始した時点のスナップショットを見る。
2. Repeatable Read では、トランザクション内の最初の文（トランザクション制御文を除く）の開始時点のスナップショットを最後まで使うので、繰り返した SELECT は同じデータを返す。
3. Read Committed では、2回の SELECT の間に他のトランザクションがコミットすると、同じトランザクション内でも結果が変わりうる。

**根拠**：

根拠1（要点 1 を支える。見出し「13.2.1. Read Committed Isolation Level #」）

> In effect, a SELECT query sees a snapshot of the database as of the instant the query begins to run.

- 照合：一字一句一致、見出しも一致（100字）

根拠2（要点 1・2 を支える。見出し「13.2.2. Repeatable Read Isolation Level #」）

> This level is different from Read Committed in that a query in a repeatable read transaction sees a snapshot as of the start of the first non-transaction-control statement in the transaction, not as of the start of the current statement within the transaction. Thus, successive SELECT commands within a single transaction see the same data, i.e., they do not see changes made by other transactions that committed after their own transaction started.

- 照合：一字一句一致、見出しも一致（449字）

根拠3（要点 3 を支える。見出し「13.2.1. Read Committed Isolation Level #」）

> Also note that two successive SELECT commands can see different data, even though they are within a single transaction, if other transactions commit changes after the first SELECT starts and before the second SELECT starts.

- 照合：一字一句一致、見出しも一致（223字）

### 07-Q3（観点：条件が変わると）— 機械照合：通過

**問い**：PostgreSQL 17 の Read Committed で、UPDATE や DELETE が対象として見つけた行を、並行する別のトランザクションが先に更新してコミットした場合、後から来たコマンドはその行をどう扱うか。また、その扱いはどんな種類のコマンドで問題になり、どんな種類のコマンドでは問題にならないか。

**模範解答の要点**：

1. 更新後の行に対して WHERE 条件を評価し直し、まだ条件に合っていれば更新後の行に対して操作を行う。
2. 更新しようとする行だけは並行更新の結果が見え、他の行では見えないので、1つのコマンドが見るデータに一貫性がなくなり、検索条件が複雑なコマンドには向かない。
3. あらかじめ決まった行だけを対象にする単純な更新であれば、更新後の行を見ても困る不整合は生じない。

**根拠**：

根拠1（要点 1 を支える。見出し「13.2.1. Read Committed Isolation Level #」）

> The search condition of the command (the WHERE clause) is re-evaluated to see if the updated version of the row still matches the search condition. If so, the second updater proceeds with its operation using the updated version of the row.

- 照合：一字一句一致、見出しも一致（239字）

根拠2（要点 2 を支える。見出し「13.2.1. Read Committed Isolation Level #」）

> Because of the above rules, it is possible for an updating command to see an inconsistent snapshot: it can see the effects of concurrent updating commands on the same rows it is trying to update, but it does not see effects of those commands on other rows in the database. This behavior makes Read Committed mode unsuitable for commands that involve complex search conditions; however, it is just right for simpler cases.

- 照合：一字一句一致、見出しも一致（421字）

根拠3（要点 3 を支える。見出し「13.2.1. Read Committed Isolation Level #」）

> Because each command is affecting only a predetermined row, letting it see the updated version of the row does not create any troublesome inconsistency.

- 照合：一字一句一致、見出しも一致（152字）

### 07-Q4（観点：条件が変わると）— 機械照合：通過

**問い**：PostgreSQL 17 の Repeatable Read トランザクションが更新しようとした行を、そのトランザクションの開始後に別のトランザクションが更新してコミットしていた場合、何が起きるか。アプリケーション側に求められる対処と、その対処でうまくいく理由もあわせて説明せよ。

**模範解答の要点**：

1. 自分の開始後に他のトランザクションが変更した行は変更もロックもできないため、エラーになってトランザクションがロールバックされる。
2. アプリケーションは、そのトランザクションを中断し、全体を最初からやり直す必要がある。
3. やり直したトランザクションは、先にコミットされた変更を最初から見た状態で始まるので、新しい行を出発点に更新しても論理的な衝突がない。

**根拠**：

根拠1（要点 1 を支える。見出し「13.2.2. Repeatable Read Isolation Level #」）

> But if the first updater commits (and actually updated or deleted the row, not just locked it) then the repeatable read transaction will be rolled back with the message

- 照合：一字一句一致、見出しも一致（168字）

根拠2（要点 1 を支える。見出し「13.2.2. Repeatable Read Isolation Level #」）

> because a repeatable read transaction cannot modify or lock rows changed by other transactions after the repeatable read transaction began.

- 照合：一字一句一致、見出しも一致（139字）

根拠3（要点 2・3 を支える。見出し「13.2.2. Repeatable Read Isolation Level #」）

> When an application receives this error message, it should abort the current transaction and retry the whole transaction from the beginning. The second time through, the transaction will see the previously-committed change as part of its initial view of the database, so there is no logical conflict in using the new version of the row as the starting point for the new transaction's update.

- 照合：一字一句一致、見出しも一致（391字）

### 07-Q5（観点：比べると）— 機械照合：通過

**問い**：PostgreSQL 17 の Serializable 分離レベルは、Repeatable Read と比べて仕組みの上で何が加わっているか。それによって開発者は何を得て、代わりにどんなコストを負うか。

**模範解答の要点**：

1. 動作は Repeatable Read と同じで、そこに、直列に実行した場合と食い違う結果になりうる状況を監視する仕組みが加わっている。
2. コミットに成功したトランザクション群は1つずつ順に実行したのと同じ結果になるので、各トランザクションが単独で正しいことを確かめれば、他のトランザクションの内容を知らなくても正しさを信頼できる。
3. 監視によってブロックが増えることはないが、監視そのもののオーバーヘッドと、直列化失敗で打ち切られたトランザクションをやり直すコストがかかる。

**根拠**：

根拠1（要点 1 を支える。見出し「13.2.3. Serializable Isolation Level #」）

> In fact, this isolation level works exactly the same as Repeatable Read except that it also monitors for conditions which could make execution of a concurrent set of serializable transactions behave in a manner inconsistent with all possible serial (one at a time) executions of those transactions.

- 照合：一字一句一致、見出しも一致（298字）

根拠2（要点 2 を支える。見出し「13.2.3. Serializable Isolation Level #」）

> The guarantee that any set of successfully committed concurrent Serializable transactions will have the same effect as if they were run one at a time means that if you can demonstrate that a single transaction, as written, will do the right thing when run by itself, you can have confidence that it will do the right thing in any mix of Serializable transactions, even without any information about what those other transactions might do, or it will not successfully commit.

- 照合：一字一句一致、見出しも一致（474字）

根拠3（要点 3 を支える。見出し「13.2.3. Serializable Isolation Level #」）

> This monitoring does not introduce any blocking beyond that present in repeatable read, but there is some overhead to the monitoring, and detection of the conditions which could cause a serialization anomaly will trigger a serialization failure.

- 照合：一字一句一致、見出しも一致（245字）

根拠4（要点 3 を支える。見出し「13.2.3. Serializable Isolation Level #」）

> The monitoring of read/write dependencies has a cost, as does the restart of transactions which are terminated with a serialization failure, but balanced against the cost and blocking involved in use of explicit locks and SELECT FOR UPDATE or SELECT FOR SHARE, Serializable transactions are the best performance choice for some environments.

- 照合：一字一句一致、見出しも一致（341字）

## 生成しなかった問い

- Read Committed での INSERT ... ON CONFLICT と MERGE の並行時の挙動：コマンドごとの個別の規則で、読む範囲の中心となる仕組みではなく細部にあたるため。
- 述語ロックの粒度の統合や、Serializable で性能を出すための設定項目：設定値やパラメータ名を答えさせる問いになりやすく、運用上の細部にあたるため。
- Snapshot Isolation と従来のロック方式とで許される現象の違い：本文がこの違いをマニュアルの範囲外として文献に委ねており、本文だけでは模範解答の根拠がそろわないため。
- シーケンスへの変更がロールバックされないという例外規則：本文には事実が1文あるだけで、理由や成立条件の説明がなく、要点を2つ以上立てられないため。

## 生成した LLM の自己申告

- 読む範囲の適切さ：1ページの中に3つの分離レベルと標準との対応づけという複数の中心があり、問いが5問になった。分離レベルごとに範囲を分けたほうが、1回に読む単位としては扱いやすい。
- 迷った点：英語の1文が長く、根拠を1〜2文に収めると quote が長くなる箇所があった。また、エラーメッセージの前後で段落が分かれているため、Repeatable Read のロールバックの根拠を2つの quote に分ける必要があった。

