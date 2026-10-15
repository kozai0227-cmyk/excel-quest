/**
 * Web 版だけに 置く、検索で 見つけて もらう ための ページを ビルドの ときに 作る（Vite の 部品）。
 *
 * - /learn/            … 関数・操作の 解説の 一覧
 * - /learn/<スラッグ>/ … 教会の「関数の 相談」と 同じ 解説（src/data/funcGuides.ts）を 1ページずつ
 * - /sitemap.xml       … Google に 知らせる ページの 一覧
 *
 * アプリ版（npm run ios）には 要らないので、EQ_APP=1 の ときは 作らない。
 * 「Excel」「Microsoft」は 他社の 商標なので 書かない（「表計算ソフト」と 書く）
 */
import { readFileSync } from 'node:fs'
import type { Plugin } from 'vite'
import { SKILLS } from '../src/data/skills'
import { FUNC_GUIDES, type FuncGuide } from '../src/data/funcGuides'
import { APP_STORE_ID, APP_STORE_URL } from '../src/game/appStore'

export const SITE = 'https://equal-quest.vercel.app'
const APP_NAME = 'イコール・クエスト'

/** 町 → 章（解説ページの「ゲームで 学べる 章」） */
const CHAPTER_OF_TOWN: Record<string, { no: number; title: string }> = {
  セルノ: { no: 1, title: '第1章 はじまりの村セルノ' },
  カルキュレ: { no: 1, title: '第1章 計算の町カルキュレ' },
  サンショウ: { no: 2, title: '第2章 鏡の町サンショウ' },
  イフポート: { no: 3, title: '第3章 条件の港町イフポート' },
  ルックアップ: { no: 4, title: '第4章 検索の城下町ルックアップ' },
  ピボリア: { no: 5, title: '第5章 集計の王都ピボリア' },
  テキストリア: { no: 6, title: '第6章 文字の宿場町テキストリア' },
  コヨミノ: { no: 7, title: '第7章 暦の里コヨミノ' },
  ホープ: { no: 8, title: '最終章 最果ての砦ホープ' },
}
const CHAPTER_HEADINGS: Record<number, string> = {
  1: '第1章　セル・オートフィル・四則演算・SUM／AVERAGE',
  2: '第2章　相対参照・絶対参照（$）・ROUND',
  3: '第3章　IF・AND／OR・COUNTIF／SUMIF',
  4: '第4章　VLOOKUP・XLOOKUP・IFERROR',
  5: '第5章　SUMIFS・COUNTIFS・集計表',
  6: '第6章　文字列（&・LEFT／MID・LEN・TRIM・FIND）',
  7: '第7章　日付の計算・WEEKDAY・EDATE・DATEDIF',
  8: '最終章　エラーの読み方と直し方・総まとめ',
}

/** 検索で 探されやすい 言い方の 題（ID ごと）と、URL の スラッグ */
const PAGES: Record<string, { title: string; slug?: string }> = {
  input: { title: 'セルへの入力のしかた（Enter と Tab の使い分け）' },
  edit: { title: 'セルの修正・上書きのしかた（F2キー）' },
  copy: { title: 'コピー＆貼り付けのしかた（Ctrl+C／Ctrl+V）' },
  undo: { title: '元に戻す・やり直しのしかた（Ctrl+Z／Ctrl+Y）' },
  autofill: { title: 'オートフィルの使い方（連番・数式のコピー）' },
  bold: { title: '太字のしかた（Ctrl+B）' },
  arith: { title: '四則演算の数式の書き方（+ - * /）' },
  SUM: { title: 'SUM関数の使い方（合計を求める）' },
  AVERAGE: { title: 'AVERAGE関数の使い方（平均を求める）' },
  MAXMIN: { title: 'MAX関数・MIN関数の使い方（最大値・最小値）' },
  COUNT: { title: 'COUNT関数・COUNTA関数の使い方（個数を数える）' },
  report: { title: '縦と横の合計がある集計表の作り方' },
  relref: { title: '相対参照とは？数式のコピーで参照がずれるしくみ' },
  absref: { title: '絶対参照（$）とは？使い方と例' },
  f4: { title: 'F4キーで $ を付け外しする方法' },
  share: { title: '構成比（割合）の求め方' },
  mixref: { title: '複合参照とは？九九の表で学ぶ使い方' },
  round: { title: 'ROUND関数の使い方（四捨五入）' },
  compare: { title: '比較演算子（>= <= <> など）の使い方' },
  if: { title: 'IF関数の使い方（条件で答えを変える）' },
  ifcalc: { title: 'IF関数の答えに計算式を使う方法' },
  nestif: { title: 'IF関数の入れ子（ネスト）の使い方' },
  andor: { title: 'AND関数・OR関数の使い方（条件を組み合わせる）' },
  countif: { title: 'COUNTIF関数・SUMIF関数の使い方' },
  vlookup: { title: 'VLOOKUP関数の使い方（表から探して取り出す）' },
  colindex: { title: 'VLOOKUP関数の列番号と範囲の固定' },
  approx: { title: 'VLOOKUP関数の近似一致（TRUE）の使い方' },
  iferror: { title: 'IFERROR関数の使い方（エラーのときの値を決める）' },
  xlookup: { title: 'XLOOKUP関数の使い方' },
  notfound: { title: 'XLOOKUP関数で見つからないときの値を決める方法' },
  countifs: { title: 'COUNTIFS関数の使い方（複数の条件で数える）' },
  sumifs: { title: 'SUMIFS関数の使い方（複数の条件で合計する）' },
  ifscompare: { title: 'SUMIFS・COUNTIFSで「以上」「以下」の条件を使う方法' },
  averageif: { title: 'AVERAGEIF関数・MAXIFS関数の使い方' },
  summary: { title: 'SUMIFS関数で集計表を作る方法' },
  crosstab: { title: 'SUMIFS関数でクロス集計表を作る方法' },
  concat: { title: '&（アンパサンド）で文字列をつなぐ方法', slug: 'ampersand' },
  leftright: { title: 'LEFT関数・RIGHT関数の使い方（文字を取り出す）' },
  mid: { title: 'MID関数の使い方（まん中の文字を取り出す）' },
  len: { title: 'LEN関数の使い方（文字数を数える）' },
  clean: { title: 'TRIM関数・SUBSTITUTE関数の使い方（空白の削除・置きかえ）', slug: 'trim-substitute' },
  find: { title: 'FIND関数の使い方（文字の位置を調べる）' },
  dateadd: { title: '日付の足し算（○日後の日付を求める）' },
  datediff: { title: '日付の引き算（日数を求める）' },
  dateparts: { title: 'YEAR関数・MONTH関数・DAY関数の使い方' },
  weekday: { title: 'WEEKDAY関数の使い方（曜日を求める）' },
  edate: { title: 'EDATE関数・EOMONTH関数の使い方（○か月後・月末）' },
  datedif: { title: 'DATEDIF関数の使い方（年数・月数を求める）' },
  diverr: { title: '#DIV/0! エラーの原因と直し方', slug: 'div0-error' },
  valueerr: { title: '#VALUE! エラーの原因と直し方', slug: 'value-error' },
  nameerr: { title: '#NAME? エラーの原因と直し方', slug: 'name-error' },
  referr: { title: '#REF! エラーの原因と直し方', slug: 'ref-error' },
  combine: { title: 'SUMIFSとIFを組み合わせて自動で判定する方法' },
  message: { title: '計算結果と文字をつないで文章にする方法' },
}

const slugOf = (id: string) => PAGES[id]?.slug ?? id.toLowerCase()
const pageUrl = (id: string) => `${SITE}/learn/${slugOf(id)}/`

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * ゲームの 文は 読みやすさの ために 言葉の あいだに 空白を 入れて いるので、Web では ふつうの 書き方に もどす
 * （日本語の 前後の 半角空白を 消す。英数字どうしの あいだの 空白は 残す）
 */
const JA = /[　-ヿ一-鿿＀-￯]/
const AN = /[A-Za-z0-9$#!?)\]]/
export function plain(s: string) {
  return s.replace(/(.) (?=(.))/g, (m, a: string, b: string) => {
    const ja = (c: string) => JA.test(c)
    return (ja(a) && (ja(b) || AN.test(b))) || (AN.test(a) && ja(b)) ? a : m
  })
}

/**
 * 文の 中の 数式（= で 始まる 部分）を <code> に する。
 * かっこの 中と " の 中は 空白や 日本語が あっても 数式の 一部（=VLOOKUP(探す値, 範囲, 列番号, FALSE) など）
 */
function withCode(text: string) {
  let out = ''
  let i = 0
  while (i < text.length) {
    const start = text.indexOf('=', i)
    // 「= で 始める」「=（等しい）」の ような 説明の = は 数式に しない
    if (start < 0 || !/[A-Za-z0-9$("-]/.test(text[start + 1] ?? '')) {
      if (start < 0) break
      out += esc(text.slice(i, start + 1))
      i = start + 1
      continue
    }
    let j = start + 1
    let depth = 0
    let quote = false
    for (; j < text.length; j++) {
      const c = text[j]
      if (quote) {
        if (c === '"') quote = false
        continue
      }
      if (c === '"') quote = true
      else if (c === '(') depth++
      else if (c === ')') {
        if (depth === 0) break
        depth--
      } else if (depth === 0 && !/[A-Za-z0-9$:.!#&+\-*/<>=_%^,]/.test(c)) break
    }
    // 終わりの「,」「.」は 文の 区切り
    while (j > start + 1 && /[,.]/.test(text[j - 1]) && depth === 0) j--
    out += esc(text.slice(i, start)) + `<code>${esc(text.slice(start, j))}</code>`
    i = j
  }
  return out + esc(text.slice(i))
}

const chapterOf = (id: string) => CHAPTER_OF_TOWN[SKILLS[id].town]

const ids = Object.keys(SKILLS).filter((id) => FUNC_GUIDES[id] && PAGES[id])

function head(o: { title: string; desc: string; url: string; type: string; extra?: string }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.desc)}" />
<link rel="canonical" href="${o.url}" />
<meta property="og:type" content="${o.type}" />
<meta property="og:site_name" content="${APP_NAME}" />
<meta property="og:title" content="${esc(o.title)}" />
<meta property="og:description" content="${esc(o.desc)}" />
<meta property="og:url" content="${o.url}" />
<meta property="og:image" content="${SITE}/og.png" />
<meta property="og:locale" content="ja_JP" />
<meta name="twitter:card" content="summary_large_image" />
${APP_STORE_ID ? `<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}" />\n` : ''}<link rel="icon" type="image/png" href="/icon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="stylesheet" href="/learn/learn.css" />
${o.extra ?? ''}</head>
<body>
<header class="bar"><a class="brand" href="/">＝ ${APP_NAME}</a><a href="/learn/">関数・操作の解説</a></header>
<main>
`
}

/** ゲームへの 案内。ブラウザ版は 第2章までの 体験版なので、第3章から 先の 内容は App Store を 先に 出す */
const playBox = (lead: string, appFirst = false) => {
  const web = `<a class="btn${appFirst ? '' : ' primary'}" href="/">ブラウザで遊ぶ（無料・第2章まで）</a>`
  const app = `<a class="btn${appFirst ? ' primary' : ''}" href="${APP_STORE_URL}">App Store で見る</a>`
  return `<section class="play">
<h2>ゲームで練習しよう</h2>
<p>${lead}</p>
<p class="btns">${appFirst ? app + web : web + app}</p>
</section>
`
}

const foot = `</main>
<footer><a href="/">${APP_NAME}</a> ・ <a href="/learn/">解説の一覧</a> ・ <a href="/support.html">サポート</a> ・ <a href="/privacy.html">プライバシーポリシー</a></footer>
</body>
</html>
`

const breadcrumb = (items: [string, string][]) =>
  `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 1, name, item })),
  })}</script>
`

function learnPage(id: string) {
  const g: FuncGuide = FUNC_GUIDES[id]
  const s = SKILLS[id]
  const ch = chapterOf(id)
  const title = PAGES[id].title
  const use = plain(g.use)
  const desc = plain(`${title.replace(/（.*?）$/, '')}を、例つきで やさしく解説。${use}に使います。書き方：${g.form}`).slice(0, 120)
  const url = pageUrl(id)
  const related = ids.filter((x) => x !== id && chapterOf(x).no === ch.no)
  const examples = g.ex
    .map((line) => {
      const [left, right] = plain(line).split('　→')
      return `<li><span class="ex-l">${withCode(left)}</span>${right ? `<span class="ex-r">→ ${withCode(right.trim())}</span>` : ''}</li>`
    })
    .join('\n')
  return (
    head({ title: `${title}｜${APP_NAME}`, desc, url, type: 'article', extra: breadcrumb([[APP_NAME, `${SITE}/`], ['関数・操作の解説', `${SITE}/learn/`], [s.name, url]]) }) +
    `<nav class="crumb"><a href="/">${APP_NAME}</a> › <a href="/learn/">関数・操作の解説</a> › ${esc(plain(s.name))}</nav>
<h1>${esc(title)}</h1>
<p class="lead">${esc(use)}${id.endsWith('err') ? 'の原因と直し方です。' : 'に使います。'}</p>
<h2>書き方</h2>
<p class="form">${withCode(plain(g.form))}</p>
<h2>例</h2>
<ul class="ex">
${examples}
</ul>
<h2>ポイント</h2>
<p>${withCode(plain(g.tip))}</p>
<h2>まとめ</h2>
<p>${withCode(plain(s.desc))}</p>
` +
    playBox(
      `『${APP_NAME}』は、町の人の悩みを表計算で解決しながら、関数や数式が身につくレトロRPGです。「${esc(plain(s.name))}」は <b>${ch.title}</b> で学べます。` +
        (ch.no > 2
          ? '第3章から先は iPhone アプリ版（全章解放・買い切り）で遊べます。第1章・第2章は無料で、ブラウザでも体験できます。'
          : '数式はボタンと表のタップで組み立てられるので、スマホでも練習できます。'),
      ch.no > 2,
    ) +
    (related.length
      ? `<h2>同じ章で学べること</h2>
<ul class="links">
${related.map((x) => `<li><a href="/learn/${slugOf(x)}/">${esc(PAGES[x].title)}</a></li>`).join('\n')}
</ul>
`
      : '') +
    foot
  )
}

function indexPage() {
  const url = `${SITE}/learn/`
  const groups = [1, 2, 3, 4, 5, 6, 7, 8].map((no) => {
    const list = ids.filter((id) => chapterOf(id).no === no)
    return `<h2>${CHAPTER_HEADINGS[no]}</h2>
<ul class="links">
${list.map((id) => `<li><a href="/learn/${slugOf(id)}/">${esc(PAGES[id].title)}</a></li>`).join('\n')}
</ul>`
  })
  return (
    head({
      title: `表計算の関数・操作の解説一覧（SUM・IF・VLOOKUP・SUMIFS・日付・エラー）｜${APP_NAME}`,
      desc: 'SUM・IF・VLOOKUP・XLOOKUP・SUMIFS・COUNTIFS・文字列・日付の関数から、絶対参照やエラーの直し方まで。表計算の基本を例つきでやさしく解説します。',
      url,
      type: 'website',
      extra: breadcrumb([[APP_NAME, `${SITE}/`], ['関数・操作の解説', url]]),
    }) +
    `<nav class="crumb"><a href="/">${APP_NAME}</a> › 関数・操作の解説</nav>
<h1>表計算の関数・操作の解説一覧</h1>
<p class="lead">セルの入力から、SUM・IF・VLOOKUP・SUMIFS、文字列や日付の関数、エラーの直し方まで。ゲーム『${APP_NAME}』で学べる内容を、例つきでまとめました。</p>
` +
    playBox(`町の人の「表計算の悩み」を解決しながら進むレトロRPGです。第1章から順番に、関数や数式が自然に身につきます。第1章・第2章は無料（ブラウザでも遊べます）、第3章から先は iPhone アプリ版で遊べます。`) +
    groups.join('\n') +
    '\n' +
    foot
  )
}

function sitemap(today: string) {
  const urls = [`${SITE}/`, `${SITE}/learn/`, ...ids.map(pageUrl), `${SITE}/support.html`]
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`
}

export function webPages(): Plugin {
  return {
    name: 'equal-quest-web-pages',
    apply: 'build',
    // Safari の「App Store で 開く」バー（番号が 決まったら）
    transformIndexHtml: () => (APP_STORE_ID && process.env.EQ_APP !== '1' ? [{ tag: 'meta', attrs: { name: 'apple-itunes-app', content: `app-id=${APP_STORE_ID}` }, injectTo: 'head' }] : []),
    generateBundle() {
      if (process.env.EQ_APP === '1') return
      const emit = (fileName: string, source: string) => this.emitFile({ type: 'asset', fileName, source })
      emit('learn/learn.css', readFileSync(new URL('./learn.css', import.meta.url), 'utf8'))
      emit('learn/index.html', indexPage())
      for (const id of ids) emit(`learn/${slugOf(id)}/index.html`, learnPage(id))
      emit('sitemap.xml', sitemap(new Date().toISOString().slice(0, 10)))
    },
  }
}
