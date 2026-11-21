# 04 How to do distributed locking — Martin Kleppmann’s blog

このファイルは `tools/report.mjs` が書き出したものです。評価は `evaluation.md` に書きます。

## 資料

- 種類：技術記事（英語、個人ブログ）
- URL：https://martin.kleppmann.com/2016/02/08/how-to-do-distributed-locking.html
- 取得日時：2026-11-16T12:50:03.826Z
- 読む範囲：ページ全体（23451字。ページ全体は23451字）
- 読む範囲の本文の SHA-256：`28ea380b708d9e38d633ea2f834018fa2e817e56f4b631257eae9335ff0c19d6`

## 本文の取得

- 方法：Node の fetch で HTML を取り、Readability（@mozilla/readability）で本文を抜き出して、見出し・段落・コード・表をテキストに直した
- HTML 42791 バイト、取得 557 ミリ秒、見出し 8 個、図 2 枚、コード 1 個、表 0 個、数式 0 個（図・コード・表・数式はページ全体での数）

手間取った点、気づいた点：

- 静的な HTML で、取得と抽出はそのまま通った
- 末尾の参考文献一覧と、メール購読の案内が本文として残る
- タイトルにサイト名が付く（「— Martin Kleppmann’s blog」）

## 生成された問い

### 04-Q1（観点：なぜ）— 機械照合：通過

**問い**：タイムアウト付きの分散ロック（リース）を取得してから共有ストレージのファイルを読み、変更して書き戻すクライアントは、ロックサービス自体が完全に正しく動いていても、データを壊すことがあるのはなぜか。また、書き戻す直前にロックの期限を確認する処理を足しても防げないのはなぜか。

**模範解答の要点**：

1. ロックを持ったままクライアントが長く停止すると、リースが切れたことに気づかないまま書き込みを続けてしまう。
2. 停止は期限の確認と書き込みの間でも起こり得るので、直前の確認では防げない。
3. クライアントが止まらなくても、書き込み要求がネットワーク上で遅れ、リースが切れた後にストレージへ届くことがある。

**根拠**：

根拠1（要点 1 を支える。見出し「Protecting a resource with a lock」）

> However, if the GC pause lasts longer than the lease expiry period, and the client doesn’t realise that it has expired, it may go ahead and make some unsafe change.

- 照合：一字一句一致、見出しも一致（164字）

根拠2（要点 2 を支える。見出し「Protecting a resource with a lock」）

> Remember that GC can pause a running thread at any point, including the point that is maximally inconvenient for you (between the last check and the write operation).

- 照合：一字一句一致、見出しも一致（166字）

根拠3（要点 3 を支える。見出し「Protecting a resource with a lock」）

> This means that an application process may send a write request, and it may reach the storage server a minute later when the lease has already expired.

- 照合：一字一句一致、見出しも一致（151字）

### 04-Q2（観点：なぜ）— 機械照合：通過

**問い**：分散ロックで守った資源への書き込みにフェンシングトークンを使うと、リースが切れたクライアントから遅れて届いた書き込みを防げるのはなぜか。その仕組みが成り立つために、ロックサービスとストレージ側にはそれぞれ何が求められるか。

**模範解答の要点**：

1. ロックを取得するたびに大きくなる番号を受け取り、ストレージへの書き込み要求に毎回その番号を添える。
2. ストレージ側が、すでに処理した番号より小さい番号の書き込みを拒否する役割を担う。
3. 前提として、ロックサービスが厳密に単調増加する番号を発行できなければならない。

**根拠**：

根拠1（要点 1 を支える。見出し「Making the lock safe with fencing」）

> The fix for this problem is actually pretty simple: you need to include a fencing token with every write request to the storage service. In this context, a fencing token is simply a number that increases (e.g. incremented by the lock service) every time a client acquires the lock.

- 照合：一字一句一致、見出しも一致（281字）

根拠2（要点 2 を支える。見出し「Making the lock safe with fencing」）

> However, the storage server remembers that it has already processed a write with a higher token number (34), and so it rejects the request with token 33.

- 照合：一字一句一致、見出しも一致（153字）

根拠3（要点 3 を支える。見出し「Making the lock safe with fencing」）

> And provided that the lock service generates strictly monotonically increasing tokens, this makes the lock safe.

- 照合：一字一句一致、見出しも一致（112字）

### 04-Q3（観点：比べると）— 機械照合：通過

**問い**：プロセスの停止、ネットワークの遅延、時計の狂いが起きたとき、非同期モデルを前提に設計された合意アルゴリズム（Raft、Paxos など）と Redis の Redlock とでは、保証されるものがどう違うか（Martin Kleppmann による 2016 年の Redlock 批判の議論に基づいて答える）。

**模範解答の要点**：

1. 非同期モデルのアルゴリズムは、タイミングについて何も仮定せずに安全性を保ち、タイムアウトに左右されるのは処理が進むかどうかだけである。
2. Redlock は、キーの期限切れまでの時間がほぼ正確で、ネットワーク遅延やプロセス停止が期限より十分短いという仮定に、安全性そのものが依存している。
3. その仮定が破れると Redlock は、あるクライアントのリースが切れる前に別のクライアントへリースを与えてしまうことがある。

**根拠**：

根拠1（要点 1 を支える。見出し「Using time to solve consensus」）

> For algorithms in the asynchronous model this is not a big problem: these algorithms generally ensure that their safety properties always hold, without making any timing assumptions [12]. Only liveness properties depend on timeouts or some other failure detector.

- 照合：一字一句一致、見出しも一致（263字）

根拠2（要点 2 を支える。見出し「Using time to solve consensus」）

> Its safety depends on a lot of timing assumptions: it assumes that all Redis nodes hold keys for approximately the right length of time before expiring; that the network delay is small compared to the expiry duration; and that process pauses are much shorter than the expiry duration.

- 照合：一字一句一致、見出しも一致（284字）

根拠3（要点 3 を支える。見出し「The synchrony assumptions of Redlock」）

> As soon as those timing assumptions are broken, Redlock may violate its safety properties, e.g. granting a lease to one client before another has expired.

- 照合：一字一句一致、見出しも一致（154字）

### 04-Q4（観点：比べると）— 機械照合：通過

**問い**：Martin Kleppmann による 2016 年の Redlock 批判に沿って考えると、分散ロックの目的が効率化（同じ作業の重複を避ける）である場合と、正しさの保証である場合とで、単一の Redis インスタンスによるロックと Redlock（5 台の Redis での多数決）はそれぞれ何を得て何を失うか。

**模範解答の要点**：

1. 効率化が目的なら、ロックが失敗しても重複作業のわずかな損で済むので、単一インスタンスが時々ロックを失っても問題にならない。
2. 効率化が目的の場合に Redlock を使うと、5 台の運用と多数決の費用と複雑さを払うだけで、見合う利得がない。
3. 正しさが目的の場合、Redlock は安全性が足りず、合意システムを使ったうえで資源へのアクセスにフェンシングトークンを強制する必要がある。

**根拠**：

根拠1（要点 1 を支える。見出し「What are you using that lock for?」）

> If the lock fails and two nodes end up doing the same piece of work, the result is a minor increase in cost (you end up paying 5 cents more to AWS than you otherwise would have) or a minor inconvenience (e.g. a user ends up getting the same email notification twice).

- 照合：一字一句一致、見出しも一致（267字）

根拠2（要点 1 を支える。見出し「What are you using that lock for?」）

> But if you’re only using the locks as an efficiency optimization, and the crashes don’t happen too often, that’s no big deal.

- 照合：一字一句一致、見出しも一致（125字）

根拠3（要点 2 を支える。見出し「What are you using that lock for?」）

> I will argue that if you are using locks merely for efficiency purposes, it is unnecessary to incur the cost and complexity of Redlock, running 5 Redis servers and checking for a majority to acquire your lock.

- 照合：一字一句一致、見出しも一致（209字）

根拠4（要点 2・3 を支える。見出し「Conclusion」）

> I think the Redlock algorithm is a poor choice because it is “neither fish nor fowl”: it is unnecessarily heavyweight and expensive for efficiency-optimization locks, but it is not sufficiently safe for situations in which correctness depends on the lock.

- 照合：一字一句一致、見出しも一致（255字）

根拠5（要点 3 を支える。見出し「Conclusion」）

> On the other hand, if you need locks for correctness, please don’t use Redlock. Instead, please use a proper consensus system such as ZooKeeper, probably via one of the Curator recipes that implements a lock.

- 照合：一字一句一致、見出しも一致（208字）

根拠6（要点 3 を支える。見出し「Conclusion」）

> And please enforce use of fencing tokens on all resource accesses under the lock.

- 照合：一字一句一致、見出しも一致（81字）

## 生成しなかった問い

- Redlock がフェンシングトークンを生成できない理由（乱数値では単調性がない、1 台のカウンタでは障害に弱い、など）：04-Q2 の成立条件（単調増加する番号の発行）と重なり、独立した問いにすると細部を問うことになるため。
- 5 台のノード A〜E と 2 つのクライアントで、時計のジャンプや GC 停止によって二重にロックが取られる具体的な手順：04-Q3 で問うたタイミング仮定への依存を例示する場面であり、手順を再現させる問いは細部の暗記になるため。
- Redis がキーの期限切れに使う時刻取得の関数と、同期モデルの 3 つの性質の列挙：用語や名前を答えさせる問いになり、方針 1 に反するため。
- 時計を一切使わないと合意が不可能になること、ロック取得が合意を必要とすること：本文では括弧書きで文献を示して触れているだけで理由が説明されておらず、本文だけを根拠に要点を書けないため。

## 生成した LLM の自己申告

- 読む範囲の適切さ：記事 1 本を丸ごと読む範囲としており、ロックの目的の区別、停止と遅延による破綻、フェンシング、タイミング仮定という中心が 4 つあるため、問いも 4 問になった。分量としては読み切れるが、中心が複数ある範囲である。
- 迷った点：本文に Redlock の対象バージョンが書かれていないため、方針 6 は公開年（2016 年）と論者名を問いの文に入れることで代用した。04-Q4 は選択肢となる方式名を問いに出さないと何の比較か分からず、方針 8（答えの手がかりを含めない）との兼ね合いに迷った。

