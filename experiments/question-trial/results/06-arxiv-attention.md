# 06 Attention Is All You Need

このファイルは `tools/report.mjs` が書き出したものです。評価は `evaluation.md` に書きます。

## 資料

- 種類：論文（英語、arXiv（HTML版））
- URL：https://arxiv.org/html/1706.03762v7
- 取得日時：2026-11-16T12:50:22.304Z
- 読む範囲：見出し「3 Model Architecture」から「5 Training」の手前まで（13984字。ページ全体は39427字）
- 読む範囲の本文の SHA-256：`d4296254833c77499ec1b1b277b77973994bfefd8176e73b8d1c31d1ab029192`

## 本文の取得

- 方法：Node の fetch で HTML を取り、Readability（@mozilla/readability）で本文を抜き出して、見出し・段落・コード・表をテキストに直した
- HTML 188707 バイト、取得 501 ミリ秒、見出し 30 個、図 3 枚、コード 0 個、表 7 個、数式 116 個（図・コード・表・数式はページ全体での数）

手間取った点、気づいた点：

- 数式116個は MathML で、そのままテキスト化すると記号が重複して崩れる。math 要素の alttext 属性（LaTeX）を取り出して対応した
- 番号付きの数式は表のレイアウトで組まれていて、抽出すると表の行として出てくる
- ページ全体は3.9万字。3章と4章を見出しで切り出して1.4万字にした（開始と終了の見出しを手で指定）
- 図3枚は中身が落ちる
- Table 1（層の種類ごとの計算量と経路長の比較）は、Readability が表の本体を落とし、キャプションだけが残った。4章の比較はこの表に依存している

## 生成された問い

### 06-Q1（観点：なぜ）— 機械照合：通過

**問い**：Transformer の注意機構（Scaled Dot-Product Attention）では、クエリとキーの内積を softmax に渡す前に、キーの次元数の平方根で割っている。なぜこの縮小が必要なのか。

**模範解答の要点**：

1. キーの次元が大きいほど、内積の絶対値が大きくなりやすい。
2. 内積が大きいと softmax が勾配のごく小さい領域に入ってしまうと著者は推測している。
3. 縮小しない内積注意は、次元が大きいとき加法注意より性能が劣ると報告されている。

**根拠**：

根拠1（要点 1・2 を支える。見出し「3.2.1 Scaled Dot-Product Attention」）

> We suspect that for large values of $d_{k}$ , the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients

- 照合：一字一句一致、見出しも一致（168字）

根拠2（要点 3 を支える。見出し「3.2.1 Scaled Dot-Product Attention」）

> While for small values of $d_{k}$ the two mechanisms perform similarly, additive attention outperforms dot product attention without scaling for larger values of $d_{k}$ [3].

- 照合：一字一句一致、見出しも一致（174字）

### 06-Q2（観点：比べると）— 機械照合：通過

**問い**：Transformer は、モデル全体の次元で注意を1回計算する代わりに、次元を小さくした複数のヘッドで注意を並列に計算している。単一ヘッドの注意と比べて何を得ているか。また、計算コストはどう変わるか。

**模範解答の要点**：

1. 異なる表現部分空間の情報に、異なる位置で同時に注目できるようになる。
2. 単一ヘッドでは平均化が起きて、そうした注目の使い分けが妨げられる。
3. ヘッドごとの次元を減らしているので、合計の計算コストは全次元の単一ヘッドとほぼ変わらない。

**根拠**：

根拠1（要点 1・2 を支える。見出し「3.2.2 Multi-Head Attention」）

> Multi-head attention allows the model to jointly attend to information from different representation subspaces at different positions. With a single attention head, averaging inhibits this.

- 照合：一字一句一致、見出しも一致（189字）

根拠2（要点 3 を支える。見出し「3.2.2 Multi-Head Attention」）

> Due to the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality.

- 照合：一字一句一致、見出しも一致（141字）

### 06-Q3（観点：比べると）— 機械照合：通過

**問い**：系列を同じ長さの系列に写す層として自己注意層を使うと、再帰層と比べて何が有利になるか。また、計算量の面でその有利さが成り立つのはどんな条件のときか。

**模範解答の要点**：

1. 全位置を定数回の逐次操作で結べるので、系列長に比例した逐次操作が要る再帰層より並列化しやすい。
2. 位置どうしを信号が行き来する経路が短くなり、長距離の依存関係を学習しやすい。
3. 層あたりの計算は、系列長が表現の次元数より小さいときに再帰層より速い。

**根拠**：

根拠1（要点 1・2 を支える。見出し「4 Why Self-Attention」）

> As noted in Table 1, a self-attention layer connects all positions with a constant number of sequentially executed operations, whereas a recurrent layer requires $O(n)$ sequential operations.

- 照合：一字一句一致、見出しも一致（191字）

根拠2（要点 2 を支える。見出し「4 Why Self-Attention」）

> The shorter these paths between any combination of positions in the input and output sequences, the easier it is to learn long-range dependencies [12].

- 照合：一字一句一致、見出しも一致（151字）

根拠3（要点 3 を支える。見出し「4 Why Self-Attention」）

> In terms of computational complexity, self-attention layers are faster than recurrent layers when the sequence length $n$ is smaller than the representation dimensionality $d$ , which is most often the case with sentence representations used by state-of-the-art models in machine translations, such as word-piece [38] and byte-pair [31] representations.

- 照合：一字一句一致、見出しも一致（353字）

### 06-Q4（観点：なぜ）— 機械照合：通過

**問い**：Transformer で、入力の埋め込みに位置の情報を足し合わせる必要があるのはなぜか。また、その位置情報に、学習する埋め込みではなく正弦波・余弦波による固定の関数を選んだ理由は何か。

**模範解答の要点**：

1. 再帰も畳み込みも持たないので、位置情報を与えないと系列の順序を利用できない。
2. 一定の距離だけ離れた位置の符号が元の位置の符号の線形関数で表せるので、相対位置に基づく注目を学習しやすいと著者は仮定した。
3. 学習時に出会ったものより長い系列にも外挿できる可能性がある。

**根拠**：

根拠1（要点 1 を支える。見出し「3.5 Positional Encoding」）

> Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence.

- 照合：一字一句一致、見出しも一致（226字）

根拠2（要点 2 を支える。見出し「3.5 Positional Encoding」）

> We chose this function because we hypothesized it would allow the model to easily learn to attend by relative positions, since for any fixed offset $k$ , $PE_{pos+k}$ can be represented as a linear function of $PE_{pos}$ .

- 照合：一字一句一致、見出しも一致（222字）

根拠3（要点 3 を支える。見出し「3.5 Positional Encoding」）

> We chose the sinusoidal version because it may allow the model to extrapolate to sequence lengths longer than the ones encountered during training.

- 照合：一字一句一致、見出しも一致（147字）

### 06-Q5（観点：条件が変わると）— 機械照合：通過

**問い**：Transformer のデコーダの自己注意で、各位置が自分より後ろの位置にも注目できるようにしてしまうと、何が損なわれるか。Transformer はそれをどのように防いでいるか。

**模範解答の要点**：

1. すでに生成した出力だけを使って次を生成するという自己回帰の性質が保てなくなる。
2. 許されない接続に当たる softmax の入力値を負の無限大にして、注目の重みが付かないようにしている。
3. このマスクと、出力埋め込みを1位置ずらすことを合わせて、ある位置の予測がそれより前の既知の出力だけに依存するようにしている。

**根拠**：

根拠1（要点 1 を支える。見出し「3.2.3 Applications of Attention in our Model」）

> We need to prevent leftward information flow in the decoder to preserve the auto-regressive property.

- 照合：一字一句一致、見出しも一致（101字）

根拠2（要点 2 を支える。見出し「3.2.3 Applications of Attention in our Model」）

> We implement this inside of scaled dot-product attention by masking out (setting to $-\infty$ ) all values in the input of the softmax which correspond to illegal connections.

- 照合：一字一句一致、見出しも一致（175字）

根拠3（要点 1・3 を支える。見出し「Decoder:」）

> This masking, combined with fact that the output embeddings are offset by one position, ensures that the predictions for position $i$ can depend only on the known outputs at positions less than $i$ .

- 照合：一字一句一致、見出しも一致（199字）

## 生成しなかった問い

- 非常に長い系列で自己注意を近傍だけに制限した場合の得失：本文では今後の検討課題として触れられているだけで、モデルに採用された仕組みではなく、範囲の中心から外れる細部と判断した。
- 自己注意層と畳み込み層の計算量・経路長の比較：比較の全体は中身が抜き出されていない Table 1 に依存しており、本文だけでは計算量の式を答えさせる細かい問いになるため。
- 残差接続のために全サブ層の出力次元をそろえていること、層数やヘッド数などの値：設定値を答えさせる問いになり、理由も本文では一言しか述べられていないため。
- 埋め込み層と softmax 前の線形変換での重み共有、位置ごとのフィードフォワード網の構成：本文には構成の記述だけがあり、なぜそうするかの理由や他方式との比較が書かれていないため、根拠のある問いにできない。

## 生成した LLM の自己申告

- 読む範囲の適切さ：3章と4章を合わせた範囲は中心となる仕組みが多く（注意のスケーリング、マルチヘッド、マスク、位置符号化、他の層との比較）、1つの単位としては長すぎるので問いが5問に増えた。3.2 の注意、3.5 の位置符号化、4章の比較くらいに分けたほうが絞りやすい。
- 迷った点：仕組みを特定しないと問いが成り立たないため、問いの文に仕組みの説明（平方根で割る、複数ヘッドに分ける、など）を入れざるを得ず、答えの手がかりを含めない方針との線引きに迷った。4章の比較は Table 1 が抜けているので、本文の文で言い切れる範囲に限った。

