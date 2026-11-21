// materials.json の資料を取得し、本文を抜き出して .cache/ に置く。
// 取得の経過（ステータス、転送先、文字数、見出し、図や数式の数）は results/fetch-report.json に書く。
// 使い方: node fetch.mjs [id ...]   （id を省くと全件）
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { JSDOM, VirtualConsole } from "jsdom";
import { Readability } from "@mozilla/readability";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheDir = path.join(root, ".cache");
const reportPath = path.join(root, "results", "fetch-report.json");
// 利用者やプロジェクトを特定できる情報は載せない
const USER_AGENT = "Mozilla/5.0 (compatible; fetch-test/0.1)";

const BLOCK = new Set([
  "p", "div", "section", "article", "blockquote", "ul", "ol", "dl", "dt", "dd",
  "table", "thead", "tbody", "figure", "figcaption", "details", "summary", "aside", "header", "footer", "main",
]);

function serialize(node, counts, inPre = false) {
  if (node.nodeType === 3) return inPre ? node.textContent : node.textContent.replace(/\s+/g, " ");
  if (node.nodeType !== 1) return "";
  const tag = node.tagName.toLowerCase();
  const kids = (pre = inPre) => [...node.childNodes].map((c) => serialize(c, counts, pre)).join("");

  if (tag === "script" || tag === "style" || tag === "noscript" || tag === "svg") return "";
  if (tag === "math") {
    counts.math++;
    const tex = node.getAttribute("alttext");
    return tex ? ` $${tex}$ ` : " [数式] ";
  }
  if (tag === "img") {
    counts.images++;
    const alt = (node.getAttribute("alt") || "").trim();
    return alt ? ` [図: ${alt}] ` : " [図] ";
  }
  if (tag === "pre") {
    counts.codeBlocks++;
    return `\n\n\`\`\`\n${kids(true).replace(/\n+$/, "")}\n\`\`\`\n\n`;
  }
  if (/^h[1-6]$/.test(tag)) {
    const text = kids().replace(/\s+/g, " ").trim();
    if (!text) return "";
    counts.headings.push({ level: Number(tag[1]), text });
    return `\n\n${"#".repeat(Number(tag[1]))} ${text}\n\n`;
  }
  if (tag === "br") return "\n";
  if (tag === "li") return `\n- ${kids().trim()}`;
  if (tag === "tr") {
    const cells = [...node.children].map((c) => serialize(c, counts, inPre).replace(/\s+/g, " ").trim());
    return `\n| ${cells.join(" | ")} |`;
  }
  if (tag === "table") counts.tables++;
  if (BLOCK.has(tag)) return `\n\n${kids()}\n\n`;
  return kids();
}

function tidy(text) {
  return text
    .split("\n")
    .map((line) => (line.startsWith("```") ? line : line.replace(/[ \t]+/g, " ").trimEnd()))
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// range: { from: "見出しに含まれる文字列", until: "ここで止める見出しに含まれる文字列（省略可）" }
function cutRange(text, range) {
  if (!range) return { text, note: null };
  const lines = text.split("\n");
  const isHeading = (l) => /^#{1,6} /.test(l);
  const start = lines.findIndex((l) => isHeading(l) && l.includes(range.from));
  if (start < 0) return { text, note: `範囲の開始見出し「${range.from}」が見つからず、全体を使った` };
  let end = lines.length;
  if (range.until) {
    const i = lines.findIndex((l, n) => n > start && isHeading(l) && l.includes(range.until));
    if (i < 0) return { text: lines.slice(start).join("\n").trim(), note: `範囲の終了見出し「${range.until}」が見つからず、末尾まで使った` };
    end = i;
  }
  return { text: lines.slice(start, end).join("\n").trim(), note: null };
}

async function fetchOne(m) {
  const warnings = [];
  const started = Date.now();
  const res = await fetch(m.url, { headers: { "user-agent": USER_AGENT, accept: "text/html" }, redirect: "follow" });
  const html = await res.text();
  const elapsedMs = Date.now() - started;
  fs.writeFileSync(path.join(cacheDir, `${m.id}.html`), html);

  const finalUrl = res.url;
  if (new URL(finalUrl).host !== new URL(m.url).host) warnings.push(`別のホストへ転送された: ${new URL(finalUrl).host}`);
  if (!res.ok) warnings.push(`HTTP ${res.status}`);

  const dom = new JSDOM(html, { url: finalUrl, virtualConsole: new VirtualConsole() });
  const article = new Readability(dom.window.document, { keepClasses: false }).parse();
  if (!article) {
    warnings.push("Readability が本文を見つけられなかった");
    return { id: m.id, url: m.url, finalUrl, status: res.status, htmlBytes: Buffer.byteLength(html), elapsedMs, warnings };
  }

  const counts = { math: 0, images: 0, codeBlocks: 0, tables: 0, headings: [] };
  const body = new JSDOM(`<body>${article.content}</body>`).window.document.body;
  const fullText = tidy(serialize(body, counts));
  const { text: unitText, note } = cutRange(fullText, m.range);
  if (note) warnings.push(note);
  if (unitText.length < 1500) warnings.push(`本文が短い（${unitText.length}文字）。抽出に失敗しているかもしれない`);

  fs.writeFileSync(path.join(cacheDir, `${m.id}.full.txt`), fullText);
  fs.writeFileSync(path.join(cacheDir, `${m.id}.txt`), unitText);

  return {
    id: m.id,
    url: m.url,
    finalUrl,
    status: res.status,
    contentType: res.headers.get("content-type"),
    fetchedAt: new Date().toISOString(),
    elapsedMs,
    htmlBytes: Buffer.byteLength(html),
    title: article.title,
    siteName: article.siteName ?? null,
    publishedTime: article.publishedTime ?? null,
    fullChars: fullText.length,
    range: m.range ?? null,
    unitChars: unitText.length,
    unitSha256: crypto.createHash("sha256").update(unitText).digest("hex"),
    counts: { math: counts.math, images: counts.images, codeBlocks: counts.codeBlocks, tables: counts.tables },
    headings: counts.headings,
    warnings,
  };
}

const materials = JSON.parse(fs.readFileSync(path.join(root, "materials.json"), "utf8"));
const only = process.argv.slice(2);
const targets = only.length ? materials.filter((m) => only.includes(m.id)) : materials;
fs.mkdirSync(cacheDir, { recursive: true });

const previous = fs.existsSync(reportPath) ? JSON.parse(fs.readFileSync(reportPath, "utf8")) : [];
const byId = new Map(previous.map((r) => [r.id, r]));
for (const m of targets) {
  try {
    const r = await fetchOne(m);
    byId.set(m.id, r);
    console.log(`${m.id} ${r.status} html=${r.htmlBytes}B 全体=${r.fullChars ?? "-"}字 単位=${r.unitChars ?? "-"}字 見出し=${r.headings?.length ?? "-"} 数式=${r.counts?.math ?? "-"} 図=${r.counts?.images ?? "-"} コード=${r.counts?.codeBlocks ?? "-"} 表=${r.counts?.tables ?? "-"}`);
    for (const w of r.warnings) console.log(`   ! ${w}`);
  } catch (e) {
    byId.set(m.id, { id: m.id, url: m.url, warnings: [`取得に失敗: ${e.cause?.code ?? e.message}`] });
    console.log(`${m.id} 取得に失敗: ${e.cause?.code ?? e.message}`);
  }
}
const report = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
