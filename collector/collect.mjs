// 情報源（collector/sources.json）から新着情報を取得し、data/collected/ に保存する。
//
// 各情報源について:
//   1. feed が指定されていれば、その RSS / Atom を読む
//   2. なければページを取得し、<link rel="alternate"> の RSS / Atom を自動検出して読む
//   3. フィードが見つからなければ、ページ内のリンク（同一サイト内）を抽出する
// 前回までに取得済みの URL と比較し、新しく見つかったものを新着として記録する。
//
// 使い方: node collector/collect.mjs [sources.json のパス]
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourcesPath = process.argv[2] ?? join(root, 'collector/sources.json');
const outDir = join(root, 'data/collected');
const reportDir = join(outDir, 'reports');

const USER_AGENT = 'localknowledge-collector (+https://github.com/n0bisuke/localknowledge)';
const TIMEOUT_MS = 30_000;

/** 文字コードを判定してデコードする（自治体サイトには Shift_JIS も多い） */
async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'user-agent': USER_AGENT },
    redirect: 'follow',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const head = new TextDecoder('latin1').decode(buf.slice(0, 2048));
  const charset =
    res.headers.get('content-type')?.match(/charset=["']?([\w-]+)/i)?.[1] ??
    head.match(/<meta[^>]+charset=["']?([\w-]+)/i)?.[1] ??
    head.match(/<\?xml[^>]+encoding=["']([\w-]+)/i)?.[1] ??
    'utf-8';
  let text;
  try {
    text = new TextDecoder(charset.toLowerCase()).decode(buf);
  } catch {
    text = new TextDecoder('utf-8').decode(buf);
  }
  return { text, finalUrl: res.url || url };
}

const clean = (s) => (s ?? '').replace(/\s+/g, ' ').trim();

/** 文字列から日付を取り出す（2026年1月2日 / 2026/01/02 / 2026-01-02 / 令和8年1月2日） */
function extractDate(text) {
  if (!text) return undefined;
  const pad = (n) => String(n).padStart(2, '0');
  let m = text.match(/(20\d{2})\s*[年/.\-]\s*(\d{1,2})\s*[月/.\-]\s*(\d{1,2})/);
  if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = text.match(/令和\s*(\d{1,2}|元)\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
  if (m) {
    const y = (m[1] === '元' ? 1 : Number(m[1])) + 2018;
    return `${y}-${pad(m[2])}-${pad(m[3])}`;
  }
  return undefined;
}

function toIsoDate(s) {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime())
    ? extractDate(s)
    : d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }); // YYYY-MM-DD（JST）
}

/** RSS 2.0 / RSS 1.0 (RDF) / Atom をパースする */
function parseFeed(xml, baseUrl) {
  const $ = cheerio.load(xml, { xmlMode: true });
  const items = [];
  $('item').each((_, el) => {
    const $el = $(el);
    const link = clean($el.children('link').text()) || $el.attr('rdf:about');
    const date =
      $el.children('pubDate').text() || $el.children('dc\\:date').text() || $el.children('date').text();
    const publisher = clean($el.children('source').text()) || undefined; // Google ニュース等の配信元
    let title = clean($el.children('title').text());
    if (publisher && title.endsWith(` - ${publisher}`)) title = title.slice(0, -(publisher.length + 3));
    items.push({ title, url: link, date: toIsoDate(clean(date)), publisher });
  });
  $('entry').each((_, el) => {
    const $el = $(el);
    const $link = $el.children('link[rel="alternate"]').first().length
      ? $el.children('link[rel="alternate"]').first()
      : $el.children('link').first();
    const date = $el.children('published').text() || $el.children('updated').text();
    items.push({ title: clean($el.children('title').text()), url: $link.attr('href'), date: toIsoDate(clean(date)) });
  });
  return items
    .filter((i) => i.url && i.title)
    .map((i) => ({ ...i, url: new URL(i.url, baseUrl).href }));
}

function discoverFeed($, baseUrl) {
  const href = $('link[rel="alternate"]')
    .filter((_, el) => /(rss|atom)\+xml/i.test($(el).attr('type') ?? ''))
    .first()
    .attr('href');
  return href ? new URL(href, baseUrl).href : undefined;
}

const SKIP_EXT = /\.(jpe?g|png|gif|svg|webp|zip|css|js)(\?|$)/i;

/** ページ内のサイト内リンクを抽出する */
function extractLinks($, baseUrl, source) {
  const base = new URL(baseUrl);
  const include = (source.include ?? []).map((r) => new RegExp(r));
  const exclude = (source.exclude ?? []).map((r) => new RegExp(r));
  const minLength = source.minTitleLength ?? 6;
  const scope = source.selector ? $(source.selector) : $('body');
  const seen = new Set();
  const items = [];

  scope.find('a[href]').each((_, el) => {
    const $a = $(el);
    let url;
    try {
      url = new URL($a.attr('href'), baseUrl);
    } catch {
      return;
    }
    if (!/^https?:$/.test(url.protocol) || url.host !== base.host) return;
    url.hash = '';
    const href = url.href;
    if (href === base.href || SKIP_EXT.test(url.pathname) || seen.has(href)) return;
    if (include.length && !include.some((r) => r.test(href))) return;
    if (exclude.some((r) => r.test(href))) return;

    const title = clean($a.attr('title') || $a.text());
    if (title.length < minLength) return;
    // 日付はリンク文字列 → 親要素（li / dd / tr など）のテキストの順で探す
    const context = clean($a.closest('li, dd, dt, tr, p, div').text());
    seen.add(href);
    items.push({ title, url: href, date: extractDate(title) ?? extractDate(context) });
  });
  return items;
}

/** Wikipedia の記事概要と最新版を取得する。版が変わるたびに新着として記録される */
async function collectWikipedia(source) {
  const lang = source.lang ?? 'ja';
  const api = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  api.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    prop: 'extracts|info',
    exintro: '1',
    explaintext: '1',
    inprop: 'url',
    redirects: '1',
    titles: source.wikipedia,
  }).toString();
  const { text } = await fetchText(api.href);
  const page = JSON.parse(text).query?.pages?.[0];
  if (!page || page.missing) throw new Error(`Wikipedia に記事がありません: ${source.wikipedia}`);
  return {
    method: 'wikipedia',
    summary: { text: clean(page.extract), url: page.fullurl, license: 'CC BY-SA 4.0' },
    items: [
      {
        title: `Wikipedia「${page.title}」（版 ${page.lastrevid}）`,
        url: `https://${lang}.wikipedia.org/w/index.php?oldid=${page.lastrevid}`,
        date: toIsoDate(page.touched),
      },
    ],
  };
}

async function collect(source) {
  if (source.wikipedia) return collectWikipedia(source);
  if (source.feed) {
    const { text, finalUrl } = await fetchText(source.feed);
    return { method: 'feed', feedUrl: source.feed, items: parseFeed(text, finalUrl) };
  }
  const { text, finalUrl } = await fetchText(source.url);
  const $ = cheerio.load(text);
  const feedUrl = discoverFeed($, finalUrl);
  if (feedUrl) {
    try {
      const feed = await fetchText(feedUrl);
      const items = parseFeed(feed.text, feed.finalUrl);
      if (items.length > 0) return { method: 'feed', feedUrl, items };
    } catch (e) {
      console.warn(`  フィードの取得に失敗したためリンク抽出に切り替えます: ${e.message}`);
    }
  }
  return { method: 'links', items: extractLinks($, finalUrl, source) };
}

function loadJson(path, fallback) {
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : fallback;
}

const { sources } = loadJson(sourcesPath, { sources: [] });
const now = new Date();
const today = new Date(now.getTime() + 9 * 3600_000).toISOString().slice(0, 10); // JST
mkdirSync(reportDir, { recursive: true });

const results = [];
for (const source of sources) {
  console.log(`[${source.id}] ${source.name}`);
  const file = join(outDir, `${source.id}.json`);
  const prev = loadJson(file, { items: [] });
  const known = new Set(prev.items.map((i) => i.url));
  try {
    const { method, feedUrl, summary, items } = await collect(source);
    const isFirstRun = prev.items.length === 0;
    const fresh = items
      .filter((i) => !known.has(i.url))
      .map((i) => ({ ...i, firstSeen: today }));
    const all = [...fresh, ...prev.items];
    writeFileSync(
      file,
      JSON.stringify(
        {
          source: {
            id: source.id,
            name: source.name,
            kind: source.kind ?? 'other',
            prefecture: source.prefecture,
            area: source.area,
            url: source.url,
          },
          method,
          ...(feedUrl && { feedUrl }),
          ...(summary && { summary }),
          lastFetchedAt: now.toISOString(),
          items: all,
        },
        null,
        2,
      ) + '\n',
    );
    console.log(`  方式: ${method}${feedUrl ? ` (${feedUrl})` : ''} / 取得 ${items.length} 件 / 新着 ${fresh.length} 件`);
    results.push({ source, method, fresh, isFirstRun });
  } catch (e) {
    const message = e.cause ? `${e.message} (${e.cause.code ?? e.cause.message})` : e.message;
    console.error(`  取得失敗: ${message}`);
    results.push({ source, error: message, fresh: [] });
  }
}

// 新着レポート（Markdown）を作成
const totalFresh = results.reduce((n, r) => n + r.fresh.length, 0);
const lines = [`# 新着情報 ${today}`, ''];
for (const r of results) {
  lines.push(`## ${r.source.name}（${r.source.area}）`, '');
  if (r.error) {
    lines.push(`取得に失敗しました: ${r.error}`, '');
    continue;
  }
  if (r.isFirstRun) lines.push('初回取得のため、現在掲載されているものをすべて記録しています。', '');
  if (r.fresh.length === 0) lines.push('新着なし', '');
  for (const i of r.fresh)
    lines.push(`- ${i.date ? `${i.date} ` : ''}[${i.title}](${i.url})${i.publisher ? `（${i.publisher}）` : ''}`);
  if (r.fresh.length) lines.push('');
}
const report = lines.join('\n');

if (totalFresh > 0) {
  const reportPath = join(reportDir, `${today}.md`);
  // 同じ日に複数回実行した場合は追記する
  writeFileSync(reportPath, existsSync(reportPath) ? `${readFileSync(reportPath, 'utf8')}\n${report}` : report);
}
if (process.env.RUNNER_TEMP) writeFileSync(join(process.env.RUNNER_TEMP, 'collect-report.md'), report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `new_count=${totalFresh}\n`);

console.log(`\n新着合計: ${totalFresh} 件`);
if (results.length > 0 && results.every((r) => r.error)) process.exit(1);
