/**
 * Web 版の トップページ（紹介ページ）。ゲーム本体は /play/ に 置く。
 * 検索から 来た 人に「どんな アプリか」を 伝えて、ブラウザ版か App Store へ 案内する。
 * 「Excel」「Microsoft」は 他社の 商標なので 書かない
 */
import { APP_STORE_ID, APP_STORE_URL } from '../src/game/appStore.ts'

const SITE = 'https://equal-quest.vercel.app'
const TITLE = 'イコール・クエスト｜遊んで関数が身につく表計算RPG'
const DESC =
  'SUM・IF・VLOOKUP・SUMIFSから日付・文字列・エラーの直し方まで。町の人の悩みを表計算で解決しながら、関数と数式が身につくレトロRPG。第2章まで無料、ブラウザですぐ遊べます。iPhoneアプリ版もあり。広告なし。'

/** 章ごとの 学ぶこと（解説ページへの リンクつき） */
const CHAPTERS: { no: string; town: string; topics: [string, string?][] }[] = [
  { no: '第1章', town: 'はじまりの村セルノ・計算の町カルキュレ', topics: [['セルの入力', 'input'], ['オートフィル', 'autofill'], ['四則演算', 'arith'], ['SUM', 'sum'], ['AVERAGE', 'average'], ['MAX／MIN', 'maxmin']] },
  { no: '第2章', town: '鏡の町サンショウ', topics: [['相対参照', 'relref'], ['絶対参照（$）', 'absref'], ['複合参照', 'mixref'], ['ROUND', 'round']] },
  { no: '第3章', town: '条件の港町イフポート', topics: [['IF', 'if'], ['AND／OR', 'andor'], ['COUNTIF・SUMIF', 'countif']] },
  { no: '第4章', town: '検索の城下町ルックアップ', topics: [['VLOOKUP', 'vlookup'], ['XLOOKUP', 'xlookup'], ['IFERROR', 'iferror']] },
  { no: '第5章', town: '集計の王都ピボリア', topics: [['SUMIFS', 'sumifs'], ['COUNTIFS', 'countifs'], ['クロス集計', 'crosstab']] },
  { no: '第6章', town: '文字の宿場町テキストリア', topics: [['&で連結', 'ampersand'], ['LEFT・RIGHT', 'leftright'], ['MID', 'mid'], ['LEN', 'len'], ['FIND', 'find']] },
  { no: '第7章', town: '暦の里コヨミノ', topics: [['日付の計算', 'dateadd'], ['WEEKDAY', 'weekday'], ['EDATE・EOMONTH', 'edate'], ['DATEDIF', 'datedif']] },
  { no: '最終章', town: '最果ての砦ホープ', topics: [['#DIV/0!', 'div0-error'], ['#VALUE!', 'value-error'], ['#NAME?', 'name-error'], ['#REF!', 'ref-error']] },
]

const FEATURES: { img: string; title: string; body: string }[] = [
  {
    img: 'town',
    title: '町の人の「表の悩み」を解決',
    body: '依頼は、本物の表計算と同じように表を直して解決します。数式を組み立てて、答えが合えばクリア。仕事でそのまま使える操作が身につきます。',
  },
  {
    img: 'battle',
    title: '戦闘は表計算クイズ',
    body: 'モンスターとの戦いは、関数の知識と数式の問題。答えるたびに数値が変わるので、丸暗記では勝てません。素早く答えると「即答ボーナス」も。',
  },
  {
    img: 'formula',
    title: 'スマホでも数式が作れる',
    body: '数式はボタンと表のタップで組み立て。セルを長押ししてなぞれば範囲も入ります。F4ボタンで「$」の付け外しも練習できます。',
  },
  {
    img: 'review',
    title: '苦手をつぶせる「ふくしゅうの書」',
    body: '章ごとの復習、全章まとめ、まちがえた問題の類題を集めた「苦手克服コース」。時間制限なしで、毎回 答えと解説が出ます。',
  },
]

const FAQ: [string, string][] = [
  ['無料で遊べますか？', '第1章・第2章は無料です（ブラウザ版・アプリ版とも）。第3章から最終章までは、iPhoneアプリ版の「全章解放」（買い切りのアプリ内課金）で遊べます。広告はありません。'],
  ['表計算ソフトを持っていなくても大丈夫？', 'はい。表を直す操作も数式も、ゲームの中で練習できます。ここで覚えた関数や数式は、一般的な表計算ソフトで広く使われているものです。'],
  ['ブラウザ版とアプリ版の違いは？', 'ブラウザ版は第2章までの体験版です。アプリ版（iPhone）は全8章とふくしゅうの書のすべての章が遊べ、オフラインでも動きます。ブラウザ版のセーブデータはアプリ版に引き継げません。'],
  ['どんな人に向いていますか？', '表計算を基礎から学びたい新社会人・学生、関数を「なんとなく」使っている人、レトロRPGが好きな人におすすめです。'],
  ['個人情報は集めますか？', 'いいえ。アカウント登録は不要で、セーブデータは端末の中だけに保存されます。'],
]

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function landingPage() {
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: 'イコール・クエスト',
    alternateName: 'Equal Quest',
    description: DESC,
    url: `${SITE}/`,
    image: `${SITE}/og.png`,
    genre: ['RPG', '教育'],
    inLanguage: 'ja',
    gamePlatform: ['Web ブラウザ', 'iPhone'],
    applicationCategory: 'GameApplication',
    operatingSystem: 'iOS, Web',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'JPY' },
    sameAs: [APP_STORE_URL],
  }
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  }
  const buttons = (where: string) => `<p class="cta" data-where="${where}">
<a class="btn primary play" href="/play/">ブラウザで遊ぶ<small>第2章まで無料</small></a>
<a class="btn store" href="${APP_STORE_URL}">App Store で見る<small>iPhone 版・全8章</small></a>
</p>`
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${TITLE}</title>
<meta name="description" content="${esc(DESC)}" />
<link rel="canonical" href="${SITE}/" />
<meta name="google-site-verification" content="2k9b4SQLKXFk_rTVLkfE5fCPvWFtwv18NKUand2-dEs" />
<meta name="theme-color" content="#0b1430" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="イコール・クエスト" />
<meta property="og:title" content="${TITLE}" />
<meta property="og:description" content="町の人の悩みを表計算で解決しながら、SUMからVLOOKUP・SUMIFS・エラー対処まで身につくレトロRPG。" />
<meta property="og:url" content="${SITE}/" />
<meta property="og:image" content="${SITE}/og.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:locale" content="ja_JP" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="apple-itunes-app" content="app-id=${APP_STORE_ID}" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="icon" type="image/png" href="/icon-192.png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="stylesheet" href="/site/landing.css" />
<script>
  // ホーム画面に 追加して 開いた とき（前から 追加していた 人も）は、すぐ ゲームへ
  if (navigator.standalone || matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches) location.replace('/play/')
</script>
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
</head>
<body>
<header class="bar">
<a class="brand" href="/">＝ イコール・クエスト</a>
<nav><a href="/play/">遊ぶ</a><a href="/learn/">関数の解説</a><a href="/support.html">サポート</a></nav>
</header>

<section class="hero">
<img class="hero-img" src="/og.png" width="1200" height="630" alt="イコール・クエストのタイトル画面。スーツの主人公と、四角いスライムのセルイム" />
<div class="hero-text">
<h1>遊んで、関数が身につく。<br />表計算RPG<span class="nw">『イコール・クエスト』</span></h1>
<p class="lead">手作業に追われる新人社員が、表計算の魔法で世界を救う！<br />SUMからVLOOKUP・SUMIFS・日付・文字列・エラーの直し方まで、町の人の悩みを解決しながら、仕事で使える力が身につくレトロRPGです。</p>
${buttons('hero')}
<p class="badges"><span>広告なし</span><span>登録不要</span><span>第2章まで無料</span><span>全8章・81の依頼と謎</span></p>
</div>
</section>

<main>
<section class="story">
<div class="story-img"><img src="/site/story.jpg" width="600" height="1304" loading="lazy" alt="オフィスで先輩に声をかけられる主人公" /></div>
<div>
<h2>「お前の時間が、もったいない。」</h2>
<p>先輩にそう言われた夜。集計ファイルの <code>#REF!</code> に吸いこまれた新人社員が目をさますと、そこは表計算が「魔法」として使われる大陸だった――。</p>
<p>魔王レフエラーの呪いで、人々は手作業に追われている。町の人の悩みを表計算で解決し、8つの町に「効率化」の光を取り戻そう。</p>
</div>
</section>

<section>
<h2>ゲームの特徴</h2>
<div class="features">
${FEATURES.map(
  (f) => `<article class="feature">
<img src="/site/${f.img}.jpg" width="600" height="1304" loading="lazy" alt="${esc(f.title)}の画面" />
<h3>${f.title}</h3>
<p>${f.body}</p>
</article>`,
).join('\n')}
</div>
</section>

<section>
<h2>全8章で学べること</h2>
<p class="note">関数の名前を押すと、書き方と例の解説ページが開きます。</p>
<ol class="chapters">
${CHAPTERS.map(
  (c) => `<li><div class="ch-head"><b>${c.no}</b> ${c.town}</div>
<p>${c.topics.map(([name, slug]) => (slug ? `<a href="/learn/${slug}/">${esc(name)}</a>` : esc(name))).join('')}</p></li>`,
).join('\n')}
</ol>
<p class="more"><a href="/learn/">関数・操作の解説をすべて見る →</a></p>
</section>

<section class="price">
<h2>料金</h2>
<div class="plans">
<div class="plan"><h3>第1章・第2章</h3><p class="yen">無料</p><p>ブラウザ版・iPhone アプリ版のどちらでも遊べます。</p></div>
<div class="plan"><h3>第3章〜最終章</h3><p class="yen">買い切り</p><p>iPhone アプリ版の「全章解放」で、ふくしゅうの書の全章も遊べます。追加の支払いはありません。</p></div>
</div>
</section>

<section>
<h2>よくある質問</h2>
<dl class="faq">
${FAQ.map(([q, a]) => `<dt>${q}</dt><dd>${a}</dd>`).join('\n')}
</dl>
</section>

<section class="last">
<h2>さっそく遊んでみよう</h2>
${buttons('bottom')}
</section>
</main>

<footer>
<p><a href="/play/">ブラウザで遊ぶ</a> ・ <a href="${APP_STORE_URL}">App Store</a> ・ <a href="/learn/">関数・操作の解説</a> ・ <a href="/support.html">サポート</a> ・ <a href="/privacy.html">プライバシーポリシー</a></p>
<p class="copy">© 2026 イコール・クエスト</p>
</footer>
<script>
  // 前に 遊んだ ことが ある 人には「つづきから」と 出す
  try {
    if (localStorage.getItem('excel-quest-save-v1'))
      document.querySelectorAll('.btn.play').forEach((a) => (a.firstChild.textContent = 'つづきから遊ぶ'))
  } catch (e) {}
</script>
</body>
</html>
`
}
