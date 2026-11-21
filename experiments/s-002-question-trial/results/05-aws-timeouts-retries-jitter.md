# 05 Timeouts, retries, and backoff with jitter | AWS Builder Center

このファイルは `tools/report.mjs` が書き出したものです。評価は `evaluation.md` に書きます。

## 資料

- 種類：技術記事（英語、Amazon Builders' Library）
- URL：https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
- 転送後の URL：https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter
- 取得日時：2026-11-16T12:50:06.502Z
- 読む範囲：ページ全体（14169字。ページ全体は14169字）
- 読む範囲の本文の SHA-256：`00d2f67f494d526c726828d4c47253542185ec853bb20700052535719af7c783`

## 本文の取得

- 方法：Node の fetch で HTML を取り、Readability（@mozilla/readability）で本文を抜き出して、見出し・段落・コード・表をテキストに直した
- HTML 139337 バイト、取得 2330 ミリ秒、見出し 7 個、図 0 枚、コード 0 個、表 0 個、数式 0 個（図・コード・表・数式はページ全体での数）
- 警告：別のホストへ転送された: builder.aws.com

手間取った点、気づいた点：

- aws.amazon.com の URL が builder.aws.com の別の URL に転送される。同じ資料かどうかの判定は、登録された URL ではなく転送後の URL か canonical で行う必要がある
- 見出し「Introduction」の下が空になる（導入文が見出しの外に出ている）
- 公開日と更新日の行が本文の先頭に混ざる

## 生成された問い

### 05-Q1（観点：条件が変わると）— 機械照合：通過

**問い**：サービス間のリモート呼び出しに設定するタイムアウト値を、長すぎる値にした場合と短すぎる値にした場合とで、それぞれどんな問題が起きるか。

**模範解答の要点**：

1. 長すぎると、クライアントが待っている間もリソースが使われ続け、タイムアウトを置く意味が薄れる。
2. 短すぎると、リトライされるリクエストが増えて、バックエンドへのトラフィックと遅延が増える。
3. 短すぎると、バックエンドの遅延が少し増えただけで全リクエストがリトライされ、全面的な停止につながりうる。

**根拠**：

根拠1（要点 1 を支える。見出し「Timeouts」）

> Setting a timeout too high reduces its usefulness, because resources are still consumed while the client waits for the timeout.

- 照合：一字一句一致、見出しも一致（127字）

根拠2（要点 2 を支える。見出し「Timeouts」）

> Increased traffic on the backend and increased latency because too many requests are retried.

- 照合：一字一句一致、見出しも一致（93字）

根拠3（要点 3 を支える。見出し「Timeouts」）

> Increased small backend latency leading to a complete outage, because all requests start being retried.

- 照合：一字一句一致、見出しも一致（103字）

### 05-Q2（観点：条件が変わると）— 機械照合：通過

**問い**：失敗したリクエストをクライアントがリトライする仕組みは、失敗の原因がまれな障害や一時的な障害である場合と、サーバーの過負荷である場合とで、結果がどう変わるか。

**模範解答の要点**：

1. まれな障害や一時的な障害なら、リトライされるリクエストの総数が少ないので、見かけの可用性を上げる取引として割に合う。
2. 過負荷が原因なら、リトライが負荷をさらに増やして状況を大きく悪化させる。
3. 過負荷のときは、元の問題が解消したあとも負荷が高いまま続き、復旧が遅れることがある。

**根拠**：

根拠1（要点 1 を支える。見出し「Retries and backoff」）

> This is because the overall number of retried requests is small, and the tradeoff of increasing apparent availability works well.

- 照合：一字一句一致、見出しも一致（129字）

根拠2（要点 2・3 を支える。見出し「Retries and backoff」）

> When failures are caused by overload, retries that increase load can make matters significantly worse. They can even delay recovery by keeping the load high long after the original issue is resolved.

- 照合：一字一句一致、見出しも一致（199字）

### 05-Q3（観点：なぜ）— 機械照合：通過

**問い**：リトライの間隔を指数的に延ばす指数バックオフで、待ち時間に上限を設けるのはなぜか。また、上限を設けたことで新たに生じる問題と、その対処は何か。

**模範解答の要点**：

1. 指数的に延びる待ち時間はすぐに非常に長くなるので、リトライが長引きすぎないように上限で止める。
2. 上限に達すると、すべてのクライアントが上限の間隔でリトライし続ける状態になる。
3. 対処として、クライアントがリトライする回数を制限し、その結果の失敗を呼び出しの流れのより手前で扱う。

**根拠**：

根拠1（要点 1 を支える。見出し「Retries and backoff」）

> Exponential backoff can lead to very long backoff times, because exponential functions grow quickly. To avoid retrying for too long, implementations typically cap their backoff to a maximum value.

- 照合：一字一句一致、見出しも一致（196字）

根拠2（要点 2 を支える。見出し「Retries and backoff」）

> Now all of the clients are retrying constantly at the capped rate.

- 照合：一字一句一致、見出しも一致（66字）

根拠3（要点 3 を支える。見出し「Retries and backoff」）

> In almost all cases, our solution is to limit the number of times that the client retries, and handle the resulting failure earlier in the service-oriented architecture.

- 照合：一字一句一致、見出しも一致（169字）

### 05-Q4（観点：比べると）— 機械照合：通過

**問い**：サービス呼び出しが何層にも重なる分散システムで、各層がそれぞれ独立にリトライする方式と、最上位の層だけでリトライする方式を比べると、それぞれ何が問題になるか。

**模範解答の要点**：

1. 各層が独立にリトライすると、リトライ回数が層ごとに掛け算で増え、最下層への負荷が膨れ上がって回復しにくくなる。
2. 最上位の層だけでリトライすると、それまでの呼び出しで済んでいた処理が無駄になり、効率が落ちる。
3. コストの低い操作については、スタックの中の1か所だけでリトライするのが基本方針になる。

**根拠**：

根拠1（要点 1 を支える。見出し「Retries and backoff」）

> If each layer retries independently, the load on the database will increase 243x, making it unlikely to ever recover. This is because the retries at each layer multiply -- first three tries, then nine tries, and so on.

- 照合：一字一句一致、見出しも一致（218字）

根拠2（要点 2 を支える。見出し「Retries and backoff」）

> On the contrary, retrying at the highest layer of the stack may waste work from previous calls, which reduces efficiency.

- 照合：一字一句一致、見出しも一致（121字）

根拠3（要点 3 を支える。見出し「Retries and backoff」）

> In general, for low-cost control-plane and data-plane operations, our best practice is to retry at a single point in the stack.

- 照合：一字一句一致、見出しも一致（127字）

### 05-Q5（観点：なぜ）— 機械照合：通過

**問い**：過負荷や競合が原因の失敗に対して、リトライの間隔を空けるバックオフだけでは期待したほど効果が出ないのはなぜか。ジッターはそれをどう補うか。

**模範解答の要点**：

1. 失敗した呼び出しがそろって同じ時点まで待つと、リトライが同時に届いて再び競合や過負荷を起こす。
2. ジッターは待ち時間にランダムなずれを加えて、リトライを時間的に分散させる。

**根拠**：

根拠1（要点 1 を支える。見出し「Jitter」）

> If all the failed calls back off to the same time, they cause contention or overload again when they are retried.

- 照合：一字一句一致、見出しも一致（113字）

根拠2（要点 2 を支える。見出し「Jitter」）

> Jitter adds some amount of randomness to the backoff to spread the retries around in time.

- 照合：一字一句一致、見出しも一致（90字）

## 生成しなかった問い

- タイムアウト値の決め方（許容する誤タイムアウト率と下流サービスのレイテンシのパーセンタイル）：0.1% や p99.9 といった設定値を答えさせる問いになりやすく、方針1に反するため。
- SO_RCVTIMEO や DNS・TLS ハンドシェイクなど、タイムアウト実装上の落とし穴：本文では欠点の中身が説明されておらず、根拠のある要点を作れない細部であるため。
- サーキットブレーカーとトークンバケットによるローカルなリトライ制限の比較：比較の問いにはできるが、リトライの補足的な論点であり、細部で問いの数を増やすことになるため見送った。
- 副作用のある API のリトライと冪等性：本文の説明が短く、問いにすると「冪等性」という用語を答えさせる形になりやすいため。
- 定期ジョブのジッターを毎回ランダムにせず、ホストごとに同じ値にする理由：理由を問う形にはできるが、ジッターの中心的な仕組みではなく運用上の細部と判断したため。

## 生成した LLM の自己申告

- 読む範囲の適切さ：タイムアウト、リトライとバックオフ、ジッターという3つの中心があり、1つの読む範囲としてはやや広いが、各節が独立しているので節ごとに問いを作ることはできた。
- 迷った点：リトライの節に論点が多く、どこまでが中心でどこからが細部かの線引きに迷った。また「何が起きるか」と対処をまとめて問うと、問いの文が答えの構造を示唆しやすく、方針8との両立が難しかった。

