// results/raw/NN.json の問いを .cache/NN.txt の本文と照合し、記録用の Markdown を書き出す。
// 生成物: results/verification.json, results/NN-slug.md, results/summary.md
// 評価は evaluation.md に手で書く（このスクリプトは evaluation.md に触らない）。
// 使い方: node report.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const materials = JSON.parse(read("materials.json"));
const fetchReport = new Map(JSON.parse(read("results/fetch-report.json")).map((r) => [r.id, r]));

const ANGLES = { why: "なぜ", condition: "条件が変わると", compare: "比べると" };

// 空白をすべて落とし、互換文字・引用符・ダッシュの揺れをそろえる。元の位置への対応表も返す。
function normalizeWithMap(s) {
  let out = "";
  const map = [];
  let i = 0;
  for (const ch of s) {
    const n = ch
      .normalize("NFKC")
      .replace(/[‘’‚′]/g, "'")
      .replace(/[“”„″]/g, '"')
      .replace(/[‐‑‒–—―−]/g, "-")
      .replace(/\s/g, "");
    for (const c of n) {
      out += c;
      map.push(i);
    }
    i += ch.length;
  }
  return { out, map };
}

function headingAt(text, pos) {
  let current = "";
  let offset = 0;
  for (const line of text.split("\n")) {
    if (offset > pos) break;
    const m = /^#{1,6} (.*)$/.exec(line);
    if (m) current = m[1].trim();
    offset += line.length + 1;
  }
  return current;
}

function checkQuote(text, norm, ev) {
  const quote = ev.quote ?? "";
  const result = { length: quote.length, crossesLine: quote.includes("\n") };
  let pos = text.indexOf(quote);
  if (quote && pos >= 0) {
    result.match = "exact";
  } else {
    const q = normalizeWithMap(quote).out;
    const at = q ? norm.out.indexOf(q) : -1;
    if (at >= 0) {
      result.match = "normalized";
      pos = norm.map[at];
    } else {
      result.match = "not_found";
      // どこまで一致していたかの目安（先頭からの最長一致）
      let lo = 0;
      let hi = q.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (norm.out.includes(q.slice(0, mid))) lo = mid;
        else hi = mid - 1;
      }
      result.matchedPrefix = `${lo}/${q.length}`;
      pos = -1;
    }
  }
  if (pos >= 0) {
    const actual = headingAt(text, pos);
    const a = normalizeWithMap(actual).out;
    const b = normalizeWithMap((ev.heading ?? "").replace(/^#+\s*/, "")).out;
    result.actualHeading = actual;
    result.headingOk = a === b || (a && b && (a.includes(b) || b.includes(a)));
  }
  return result;
}

function verifyMaterial(m) {
  const rawPath = path.join(root, "results", "raw", `${m.id}.json`);
  if (!fs.existsSync(rawPath)) return null;
  const text = read(`.cache/${m.id}.txt`);
  const norm = normalizeWithMap(text);
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  } catch (e) {
    return { id: m.id, parseError: e.message };
  }
  const questions = (raw.questions ?? []).map((q) => {
    const problems = [];
    const n = q.key_points?.length ?? 0;
    if (n < 2 || n > 3) problems.push(`要点が${n}個（2〜3個の指定から外れている）`);
    if (!ANGLES[q.angle]) problems.push(`観点が指定外: ${q.angle}`);
    const evidence = (q.evidence ?? []).map((ev) => ({ ...ev, check: checkQuote(text, norm, ev) }));
    if (evidence.length === 0) problems.push("根拠がない");
    for (const [i, ev] of evidence.entries()) {
      if (ev.check.match === "not_found") problems.push(`根拠${i + 1}が本文に見つからない（先頭から ${ev.check.matchedPrefix} 文字まで一致）`);
      if (ev.check.crossesLine) problems.push(`根拠${i + 1}が改行をまたいでいる`);
      for (const s of ev.supports ?? []) if (s < 1 || s > n) problems.push(`根拠${i + 1}が存在しない要点${s}を指している`);
    }
    const covered = new Set(evidence.filter((ev) => ev.check.match !== "not_found").flatMap((ev) => ev.supports ?? []));
    for (let k = 1; k <= n; k++) if (!covered.has(k)) problems.push(`要点${k}を支える根拠がない`);
    const rejected = problems.some((p) => /見つからない|支える根拠がない|根拠がない/.test(p));
    return { ...q, evidence, problems, verdict: rejected ? "破棄" : "通過" };
  });
  return { id: m.id, questions, notGenerated: raw.not_generated ?? [], selfReport: raw.self_report ?? {} };
}

const matchLabel = { exact: "一字一句一致", normalized: "空白や記号をそろえると一致", not_found: "本文に見つからない" };
const bq = (s) => s.split("\n").map((l) => `> ${l}`).join("\n");

function renderMaterial(m, f, v) {
  const L = [];
  L.push(`# ${m.id} ${f.title ?? m.slug}`, "");
  L.push("このファイルは `tools/report.mjs` が書き出したものです。評価は `evaluation.md` に書きます。", "");
  L.push("## 資料", "");
  L.push(`- 種類：${m.kind}（${m.lang === "ja" ? "日本語" : "英語"}、${m.site}）`);
  L.push(`- URL：${m.url}`);
  if (f.finalUrl && f.finalUrl !== m.url) L.push(`- 転送後の URL：${f.finalUrl}`);
  L.push(`- 取得日時：${f.fetchedAt}`);
  L.push(`- 読む範囲：${m.range ? `見出し「${m.range.from}」から「${m.range.until ?? "末尾"}」の手前まで` : "ページ全体"}（${f.unitChars}字。ページ全体は${f.fullChars}字）`);
  L.push(`- 読む範囲の本文の SHA-256：\`${f.unitSha256}\``, "");
  L.push("## 本文の取得", "");
  L.push(`- 方法：Node の fetch で HTML を取り、Readability（@mozilla/readability）で本文を抜き出して、見出し・段落・コード・表をテキストに直した`);
  L.push(`- HTML ${f.htmlBytes} バイト、取得 ${f.elapsedMs} ミリ秒、見出し ${f.headings.length} 個、図 ${f.counts.images} 枚、コード ${f.counts.codeBlocks} 個、表 ${f.counts.tables} 個、数式 ${f.counts.math} 個（図・コード・表・数式はページ全体での数）`);
  for (const w of f.warnings ?? []) L.push(`- 警告：${w}`);
  L.push("", "手間取った点、気づいた点：", "");
  for (const n of m.fetchNotes ?? ["特になし"]) L.push(`- ${n}`);
  L.push("");

  L.push("## 生成された問い", "");
  if (!v) L.push("（まだ生成していない）", "");
  else if (v.parseError) L.push(`生成結果が JSON として読めなかった：${v.parseError}`, "");
  else {
    for (const q of v.questions) {
      L.push(`### ${q.id}（観点：${ANGLES[q.angle] ?? q.angle}）— 機械照合：${q.verdict}`, "");
      L.push(`**問い**：${q.question}`, "");
      L.push("**模範解答の要点**：", "");
      q.key_points.forEach((k, i) => L.push(`${i + 1}. ${k}`));
      L.push("", "**根拠**：", "");
      q.evidence.forEach((ev, i) => {
        L.push(`根拠${i + 1}（要点 ${(ev.supports ?? []).join("・")} を支える。見出し「${ev.heading}」）`, "");
        L.push(bq(ev.quote), "");
        const c = ev.check;
        const head = c.match === "not_found" ? "" : c.headingOk ? "、見出しも一致" : `、見出しは不一致（実際は「${c.actualHeading}」）`;
        L.push(`- 照合：${matchLabel[c.match]}${head}（${c.length}字）`, "");
      });
      if (q.problems.length) {
        L.push("機械照合で見つかった問題：", "");
        for (const p of q.problems) L.push(`- ${p}`);
        L.push("");
      }
    }
    L.push("## 生成しなかった問い", "");
    if (v.notGenerated.length === 0) L.push("なし", "");
    else {
      for (const n of v.notGenerated) L.push(`- ${n.topic}：${n.reason}`);
      L.push("");
    }
    L.push("## 生成した LLM の自己申告", "");
    L.push(`- 読む範囲の適切さ：${v.selfReport.unit_fit ?? "（なし）"}`);
    L.push(`- 迷った点：${v.selfReport.difficulties ?? "（なし）"}`, "");
  }
  return L.join("\n");
}

const verification = [];
const rows = [];
for (const m of materials) {
  const f = fetchReport.get(m.id);
  const v = verifyMaterial(m);
  if (v) verification.push(v);
  fs.writeFileSync(path.join(root, "results", `${m.id}-${m.slug}.md`), renderMaterial(m, f, v) + "\n");
  const qs = v?.questions ?? [];
  const evs = qs.flatMap((q) => q.evidence);
  const count = (k) => evs.filter((e) => e.check.match === k).length;
  rows.push(
    `| [${m.id}](${m.id}-${m.slug}.md) | ${m.kind} | ${m.lang} | ${f.unitChars} | ${qs.length} | ${qs.filter((q) => q.verdict === "通過").length} | ${qs.filter((q) => q.verdict === "破棄").length} | ${evs.length} | ${count("exact")} | ${count("normalized")} | ${count("not_found")} | ${evs.filter((e) => e.check.match !== "not_found" && !e.check.headingOk).length} | ${qs.filter((q) => q.key_points.length < 2 || q.key_points.length > 3).length} |`
  );
}
fs.writeFileSync(path.join(root, "results", "verification.json"), JSON.stringify(verification, null, 2) + "\n");
const summary = [
  "# 機械照合の集計",
  "",
  "`tools/report.mjs` が書き出したものです。問いの質の評価ではなく、根拠の引用が本文に実在するかなど、機械的に確かめられる点だけを数えています。",
  "",
  "| 資料 | 種類 | 言語 | 読む範囲の字数 | 問い | 通過 | 破棄 | 根拠の引用 | 一字一句一致 | そろえると一致 | 見つからない | 見出しの不一致 | 要点が2〜3個でない問い |",
  "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
  ...rows,
  "",
];
fs.writeFileSync(path.join(root, "results", "summary.md"), summary.join("\n"));
console.log(summary.join("\n"));
