import { formatValue, makeGrid, parseAddr, usesFn, type Grid, type Value } from '../game/formula'
import type { ItemId } from '../game/types'

export interface CheckCtx {
  v(a: string): Value
  raw(a: string): string
  bold(a: string): boolean
  actions: Set<string>
}

export interface QuestDef {
  id: string
  /** 'puzzle' は洞窟の扉の謎解き（依頼ではない） */
  kind?: 'quest' | 'puzzle'
  town: string
  npc: string
  title: string
  intro: string[]
  task: string[]
  grid: () => Grid
  /** 「元に戻す」クエスト用：開始時点で既に積まれている履歴 */
  history?: () => Grid[]
  colWidths?: number[]
  hints: string[]
  /** 未達成なら理由を返す。達成なら null */
  check(ctx: CheckCtx): string | null
  reward: { exp: number; gold: number; skill?: string; item?: ItemId }
  thanks: string[]
}

export function makeCtx(grid: Grid, values: Value[][], actions: Set<string>): CheckCtx {
  const at = (a: string) => parseAddr(a)
  return {
    v: (a) => {
      const { r, c } = at(a)
      return values[r]?.[c] ?? null
    },
    raw: (a) => {
      const { r, c } = at(a)
      return grid[r]?.[c]?.raw ?? ''
    },
    bold: (a) => {
      const { r, c } = at(a)
      return !!grid[r]?.[c]?.bold
    },
    actions,
  }
}

const isN = (v: Value, n: number) => typeof v === 'number' && Math.abs(v - n) < 1e-9

const BAD_OP = '「≧ ≦ ≠」は 数式では 使えない。以上は >=、以下は <=、等しくないは <> と 書こう。'

/** 数値の期待値チェック。数式必須なら mustUse を指定 */
/** vague=true は 謎解き用（解き方の名前を 出さない） */
function expectNum(ctx: CheckCtx, a: string, n: number, mustUse?: string, label = a, vague = false): string | null {
  const v = ctx.v(a)
  const raw = ctx.raw(a)
  if (raw === '') return `${label} がまだ空っぽだ。`
  if (/[≧≦≠]/.test(raw)) return BAD_OP
  if (typeof v === 'object' && v !== null) return `${label} が エラー（${v.error}）になっている。数式を見直そう。`
  if (!isN(v, n)) return `${label} の値（${v}）が正しくないようだ。`
  if (mustUse === 'formula' && !raw.startsWith('='))
    return vague
      ? `${label} の値は 合っているが……扉は 反応しない。数字を そのまま 書いただけでは ダメなようだ。`
      : `${label} は値は合っているけど、数式ではなく直接入力されている。数式で計算しよう。`
  if (mustUse && mustUse !== 'formula' && !usesFn(raw, mustUse))
    return vague
      ? `${label} の値は 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。`
      : `${label} は値は合っている！ でも ${mustUse} 関数を使って求めてみよう。`
  return null
}
/** 謎解き用の判定（ヒントなし） */
const pz = (c: CheckCtx, a: string, n: number, mustUse?: string) => expectNum(c, a, n, mustUse, a, true)

const first = (...xs: (string | null)[]) => xs.find((x) => x !== null) ?? null

// ---------------------------------------------------------------- セルノ
const SALES = [1200, 980, 1540, 1320, 870, 2010, 1780, 1100, 1450, 1630]
const SCORES: [string, number][] = [
  ['プルお', 72],
  ['タケ吉', 85],
  ['ゴレム', 60],
  ['キメリ', 94],
  ['ベホマ', 78],
  ['ピカ坊', 100],
  ['ヒラリン', 66],
  ['ぶちスラ', 81],
]
const FISH: [string, number][] = [
  ['月', 23],
  ['火', 41],
  ['水', 17],
  ['木', 35],
  ['金', 52],
  ['土', 28],
  ['日', 39],
]
const GUESTS: (number | string)[] = [5, 8, '休み', 6, '', 9, '休み', 4, 7, 3]
const TAX = [
  ['店', '1月', '2月', '3月', '合計'],
  ['武器屋', 320, 410, 380, ''],
  ['パン屋', 150, 170, 160, ''],
  ['宿屋', 240, 220, 300, ''],
  ['合計', '', '', '', ''],
]
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export const QUESTS: Record<string, QuestDef> = {
  celuno_input: {
    id: 'celuno_input',
    town: 'celuno',
    npc: '羊飼いのメェル',
    title: 'ヒツジの記録',
    intro: [
      'メェ〜……あっ、ごめんなさい。ヒツジと しゃべりすぎて、口ぐせが うつっちゃって。',
      '羊飼いのメェルです。毎日 ヒツジの数を「表」に記録してるんだけど、呪いのせいで 今日の分が 書き込めないの。',
      '今日数えたのは 朝12頭、昼8頭、夕方15頭。かわりに 入力してくれる？ ……メェ。',
    ],
    task: ['B2 に 12、B3 に 8、B4 に 15 を入力しよう', 'セルをクリック → 数字を打つ → Enter で確定（下のセルへ移動）'],
    grid: () =>
      makeGrid(6, 4, [['時間帯', 'ヒツジの数'], ['朝'], ['昼'], ['夕方']]),
    colWidths: [80, 110],
    hints: [
      '入力したいセルを クリックして選ぼう。',
      '数字を打ったら Enter で確定。自動で1つ下のセルに移るよ。',
      'B2をクリック → 12 → Enter → 8 → Enter → 15 → Enter',
    ],
    check: (c) => first(expectNum(c, 'B2', 12), expectNum(c, 'B3', 8), expectNum(c, 'B4', 15)),
    reward: { exp: 20, gold: 20, skill: 'input' },
    thanks: ['わぁ、ありがとメェ〜！ ……あ、また言っちゃった。', '表に入れておけば、あとで合計も 平均も 一瞬で出せるんだって。ヒツジたちも 喜んでるよ。'],
  },

  celuno_fix: {
    id: 'celuno_fix',
    town: 'celuno',
    npc: '道具屋のリコ',
    title: '値札の修正',
    intro: [
      'いらっしゃいませーっ！ ……って、お客さんじゃないの？ でも ちょうどいいわ！',
      'うちの値札表、呪いで めちゃくちゃなの！ やくそうが 80ゴールドって、ぼったくりじゃない！',
      'しかも「どうのつるぎ」が「どうのつるき」になってるし！ 正しくは やくそう 8ゴールド、名前は どうのつるぎ。直してくれる？',
    ],
    task: ['B3 の 80 を 8 に直そう（選んでそのまま入力＝上書き）', 'A4 を「どうのつるぎ」に直そう（F2 かダブルクリックで一部だけ修正）'],
    grid: () =>
      makeGrid(7, 3, [
        ['しなもの', 'ねだん'],
        ['こんぼう', 30],
        ['やくそう', 80],
        ['どうのつるき', 100],
        ['たびびとのふく', 70],
      ]),
    colWidths: [140, 80],
    hints: [
      'セルを選んで そのまま入力すると、中身がまるごと上書きされるよ。',
      '文字の一部だけ直したいときは、F2キー（またはダブルクリック）で編集モードに入ろう。',
      'A4 をダブルクリック → 最後の「き」を消して「ぎ」 → Enter',
    ],
    check: (c) =>
      first(
        expectNum(c, 'B3', 8),
        c.raw('A4').trim() === 'どうのつるぎ' ? null : 'A4 がまだ「どうのつるぎ」になっていない。',
      ),
    reward: { exp: 20, gold: 20, skill: 'edit' },
    thanks: ['カンペキ！ これで「信用第一のリコ商店」に 元どおりね！', '今度 お店に来たら、ちょっとだけ おまけしちゃうかも？ ふふっ。'],
  },

  celuno_copy: {
    id: 'celuno_copy',
    town: 'celuno',
    npc: '見張りのガード',
    title: '当番表の書き写し',
    intro: [
      'はっ！ 見張りのガードで あります！',
      '来週分の 見張り当番表を 書き写す任務を 命じられたので あります。しかし 一字一句 手で写すのは……正直、骨が折れるで あります！',
      '左の表（A1:B4）を、そっくりそのまま D1 から始まる場所に 写してほしいで あります！',
    ],
    task: ['A1 から B4 までドラッグして範囲選択', 'Ctrl+C（Macは ⌘+C）でコピー', 'D1 を選んで Ctrl+V（⌘+V）で貼り付け'],
    grid: () =>
      makeGrid(6, 5, [
        ['曜日', '当番'],
        ['月', 'ガード'],
        ['火', 'ラルク'],
        ['水', 'ミナ'],
      ]),
    colWidths: [60, 80, 30, 60, 80],
    hints: [
      'マウスで A1 から B4 までドラッグすると、四角く選べる。',
      '選んだまま Ctrl+C。点線で囲まれたらコピー完了。',
      'D1 をクリックして Ctrl+V。左上をD1に合わせて貼り付けられる。',
    ],
    check: (c) => {
      for (const [src, dst] of [
        ['A1', 'D1'], ['B1', 'E1'], ['A2', 'D2'], ['B2', 'E2'],
        ['A3', 'D3'], ['B3', 'E3'], ['A4', 'D4'], ['B4', 'E4'],
      ])
        if (c.raw(src) !== c.raw(dst)) return `${dst} が ${src} と同じになっていない。`
      if (!c.actions.has('paste')) return '書き写せてはいるが……手で打ったで ありますな？ Ctrl+C → Ctrl+V で 頼むで あります！'
      return null
    },
    reward: { exp: 25, gold: 25, skill: 'copy' },
    thanks: ['おおっ……一瞬で！ これが コピー＆貼り付けの魔法で ありますか！', '任務完了で あります！ 北の結界の 見張りに 戻るで あります！'],
  },

  celuno_undo: {
    id: 'celuno_undo',
    town: 'celuno',
    npc: '書記のペン',
    title: '消えた税の記録',
    intro: [
      'た、た、たいへんです！ む、村の 税の記録を……うっかり 消してしまいましたぁ！',
      'ちょ、長老さまに 知られたら……ぼ、ぼく、クビです……！',
      'た、旅の方！ なんとか 元に戻せませんか！？',
    ],
    task: ['Ctrl+Z（Macは ⌘+Z）で、直前の操作を元に戻そう'],
    grid: () =>
      makeGrid(7, 2, [['名前', '税（G）'], ['メェル'], ['リコ'], ['ガード'], ['ペン']]),
    history: () => [
      makeGrid(7, 2, [
        ['名前', '税（G）'],
        ['メェル', 12],
        ['リコ', 30],
        ['ガード', 25],
        ['ペン', 8],
      ]),
    ],
    colWidths: [100, 90],
    hints: [
      '表計算ソフトには「さっきの操作を取り消す」魔法がある。',
      'キーボードの Ctrl を押しながら Z。Macなら ⌘ + Z。',
      'ツールバーの ↶ ボタンでも 元に戻せるよ。',
    ],
    check: (c) =>
      first(
        expectNum(c, 'B2', 12),
        expectNum(c, 'B3', 30),
        expectNum(c, 'B4', 25),
        expectNum(c, 'B5', 8),
        c.actions.has('undo') ? null : '数字は合っていますが……Ctrl+Z を使えば一瞬ですよ！',
      ),
    reward: { exp: 20, gold: 20, skill: 'undo', item: 'sandglass' },
    thanks: ['も、戻った……！ い、命拾いしました……！', 'お、お礼に この「Ctrl+Zのすなどけい」を どうぞ。戦いで ミスを 1回だけ なかったことに できますよ。'],
  },

  celuno_fill: {
    id: 'celuno_fill',
    town: 'celuno',
    npc: '暦のおばば トキ',
    title: '来年の暦',
    intro: [
      'ふぉっふぉ。わしは この村の 暦（こよみ）係じゃ。',
      '来年の暦表を作りたいのじゃが、1月から12月まで書くのも、番号をふるのも 骨が折れてのう。',
      '「オートフィル」という魔法があれば 一瞬なんじゃが……おぬし、使えるかの？',
    ],
    task: [
      'A2:A3 を選んで、右下の■（フィルハンドル）を A13 までドラッグ → 1〜12 の連番に',
      'B2 を選んで、■を B13 までドラッグ → 1月〜12月に',
    ],
    grid: () => makeGrid(15, 3, [['No', '月', '行事'], [1, '1月', '新年祭'], [2]]),
    colWidths: [50, 70, 110],
    hints: [
      '選んだ範囲の右下にある 小さな■が「フィルハンドル」じゃ。',
      '数字は 2つ並べて選んでからドラッグすると、差の分だけ増える連番になる。1つだけだと ただのコピーじゃ。',
      '「1月」のような文字は、1つ選んで ドラッグするだけで 2月、3月…と続いていくぞい。',
    ],
    check: (c) => {
      for (let i = 1; i <= 12; i++) {
        const e = expectNum(c, `A${i + 1}`, i)
        if (e) return e
        if (c.raw(`B${i + 1}`) !== `${i}月`) return `B${i + 1} が「${i}月」になっていない。`
      }
      if (!c.actions.has('fill')) return 'できておるが……手で打ったのう？ フィルハンドルを使ってみるのじゃ。'
      return null
    },
    reward: { exp: 30, gold: 30, skill: 'autofill' },
    thanks: ['ほっほう！ 見事な暦じゃ。', '面倒な作業ほど、表計算に まかせるのが 賢い者のやり方じゃよ。'],
  },

  celuno_bold: {
    id: 'celuno_bold',
    town: 'celuno',
    npc: '看板職人ボルド',
    title: '見出しを目立たせろ',
    intro: [
      'おう、あんちゃん。オレぁ 看板職人の ボルドってんだ。',
      '看板用の 品書きを 作ったんだがよ、「どこが見出しか わからねえ」って 言われちまってな。',
      '見出しの行（A1:C1）を 太字にして、ビシッと 目立たせてくんな！',
    ],
    task: ['A1:C1 を範囲選択', 'Ctrl+B（⌘+B）か、ツールバーの［B］で太字に'],
    grid: () =>
      makeGrid(6, 3, [
        ['品名', '値段', '在庫'],
        ['やくそう', 8, 20],
        ['どくけしそう', 10, 15],
        ['ワープのはね', 25, 5],
      ]),
    colWidths: [130, 70, 70],
    hints: ['A1 から C1 まで ドラッグして選ぼう。', 'Ctrl を押しながら B（Bold＝太字）。もう一度押すと元に戻る。'],
    check: (c) =>
      ['A1', 'B1', 'C1'].every((a) => c.bold(a)) ? null : '見出し（A1:C1）が まだ全部 太字になっていない。',
    reward: { exp: 20, gold: 20, skill: 'bold' },
    thanks: ['てやんでえ、見違えたぜ！', '見た目も 立派な「伝わる力」よ。あんちゃん、いい仕事するじゃねえか。'],
  },

  // ---------------------------------------------------------------- カルキュレ
  calc_arith: {
    id: 'calc_arith',
    town: 'calculet',
    npc: '武器屋ガンテツ',
    title: '注文書の小計',
    intro: [
      'へいらっしゃい！……と言いてえところだが、注文書の計算が 合わねえんだ。',
      '単価×数量で 小計を出したいんだが、手で計算したら 全部まちがえちまってな。',
      'D列に「=B2*C2」みてえな 数式を入れて、D5まで 出してくれ！',
    ],
    task: ['D2 に =B2*C2 と入力（掛け算は *）', 'D2 を選んで、フィルハンドルで D5 までオートフィル'],
    grid: () =>
      makeGrid(7, 4, [
        ['品名', '単価', '数量', '小計'],
        ['どうのつるぎ', 100, 3],
        ['かわのたて', 70, 2],
        ['てつのかぶと', 180, 1],
        ['せいなるナイフ', 200, 4],
      ]),
    colWidths: [130, 70, 60, 80],
    hints: [
      '数式は「=」から始めるのが ルールだ。',
      '掛け算は × じゃなくて *（アスタリスク）。割り算は /。',
      'D2 に =B2*C2 → Enter。D2を選んで 右下の■を D5 まで引っぱると、B3*C3… と自動でずれてくれる。',
    ],
    check: (c) =>
      first(
        expectNum(c, 'D2', 300, 'formula'),
        expectNum(c, 'D3', 140, 'formula'),
        expectNum(c, 'D4', 180, 'formula'),
        expectNum(c, 'D5', 800, 'formula'),
      ),
    reward: { exp: 30, gold: 30, skill: 'arith' },
    thanks: ['すげえ！ 数字を変えても 小計が勝手に変わるじゃねえか！', 'これが「数式」ってやつか。もう そろばんは いらねえな。'],
  },

  calc_sum: {
    id: 'calc_sum',
    town: 'calculet',
    npc: 'パン屋のマーサ',
    title: '売上の合計',
    intro: [
      'いらっしゃい。……ごめんね、ちょっと 疲れてて。',
      '毎晩 10日分の売上を そろばんで足してたら、腰を痛めちゃってねぇ。',
      'B12 に 売上の合計を 出してくれないかい？',
    ],
    task: ['B12 に =SUM(B2:B11) を入れて合計を出そう', '「=SUM(」まで打ったら、B2:B11 をドラッグで指定してもOK'],
    grid: () =>
      makeGrid(13, 2, [['日付', '売上（G）'], ...SALES.map((s, i) => [`${i + 1}日`, s]), ['合計']]),
    colWidths: [70, 100],
    hints: [
      '「=SUM(」と打ってから、合計したい範囲を マウスでドラッグすると 自動で入るよ。',
      '範囲は「始まりのセル:終わりのセル」と書くの。例：B2:B11',
      'B12 に =SUM(B2:B11) → Enter',
    ],
    check: (c) => expectNum(c, 'B12', sum(SALES), 'SUM'),
    reward: { exp: 30, gold: 30, skill: 'SUM' },
    thanks: ['まあ！ 一瞬で合計が！', 'これなら 来月も 数字を入れるだけで いいのね。お礼に 焼きたてのパンを どうぞ。'],
  },

  calc_average: {
    id: 'calc_average',
    town: 'calculet',
    npc: '先生ミネルバ',
    title: 'テストの平均点',
    intro: [
      'ごきげんよう。わたくし、この町の モンスター学校で 教えております ミネルバですわ。',
      'テストの平均点を 出したいのですけれど、足して 人数で割って……と やっているうちに 計算ミスばかり。',
      'B10 に 平均点を 出していただけるかしら？',
    ],
    task: ['B10 に AVERAGE関数で 平均点を出そう（=AVERAGE(範囲)）'],
    grid: () => makeGrid(11, 2, [['生徒', '点数'], ...SCORES, ['平均']]),
    colWidths: [100, 70],
    hints: [
      '平均を出す関数は AVERAGE（アベレージ）。',
      '範囲は 点数の入っている B2:B9。',
      'B10 に =AVERAGE(B2:B9)',
    ],
    check: (c) => expectNum(c, 'B10', sum(SCORES.map((s) => s[1])) / SCORES.length, 'AVERAGE'),
    reward: { exp: 30, gold: 30, skill: 'AVERAGE' },
    thanks: ['79.5点……なるほど、ですわ。', '生徒が増えても 範囲を広げるだけ。人数で割る必要も ありませんのね。素晴らしいですわ。'],
  },

  calc_maxmin: {
    id: 'calc_maxmin',
    town: 'calculet',
    npc: '漁師ナミオ',
    title: '釣果の記録',
    intro: [
      'おう、旅の人。オラは 漁師の ナミオだべ。',
      '今週 いちばん釣れた日と、いちばん釣れなかった日の 数を 知りてえんだ。',
      '目で探してたら 日が暮れちまうべ。なんとか ならねえか？',
    ],
    task: ['E2 に MAX関数で 一番多い釣果を', 'E3 に MIN関数で 一番少ない釣果を'],
    grid: () =>
      makeGrid(10, 5, [
        ['曜日', '釣果（匹）'],
        [FISH[0][0], FISH[0][1], '', '最大'],
        [FISH[1][0], FISH[1][1], '', '最小'],
        ...FISH.slice(2),
      ]),
    colWidths: [60, 90, 30, 60, 70],
    hints: ['最大は MAX、最小は MIN。', '範囲は B2:B8。', 'E2 に =MAX(B2:B8)、E3 に =MIN(B2:B8)'],
    check: (c) => first(expectNum(c, 'E2', 52, 'MAX'), expectNum(c, 'E3', 17, 'MIN')),
    reward: { exp: 30, gold: 30, skill: 'MAXMIN' },
    thanks: ['金曜が52匹、水曜が17匹だべか！', '来週は 水曜に 休むとするべ。がっはっは！'],
  },

  calc_count: {
    id: 'calc_count',
    town: 'calculet',
    npc: '帳簿番カウン',
    title: '営業日数を数えよ',
    intro: [
      '宿屋の帳簿番、カウンと申します。',
      'この表の「営業した日数」……つまり 宿泊客の数字が 入っている日を 数えたいのです。',
      '「休み」や 空白は 数えたくありません。B12 に お願いできますか？',
    ],
    task: ['B12 に COUNT関数で、数値が入っているセルの数を出そう'],
    grid: () =>
      makeGrid(13, 2, [['日付', '宿泊客'], ...GUESTS.map((g, i) => [`${i + 1}日`, g]), ['営業日数']]),
    colWidths: [80, 80],
    hints: [
      'COUNT は「数値が入っているセル」だけを 数える関数です。',
      'ちなみに、空白以外を すべて数えるのは COUNTA です。',
      'B12 に =COUNT(B2:B11)',
    ],
    check: (c) => expectNum(c, 'B12', 7, 'COUNT'),
    reward: { exp: 30, gold: 30, skill: 'COUNT' },
    thanks: ['7日……ぴったりです！', '「休み」の文字を 自動で無視してくれるとは。COUNT、恐るべし。'],
  },

  calc_report: {
    id: 'calc_report',
    town: 'calculet',
    npc: '町長カルク',
    title: '町の月報',
    intro: [
      'ワガハイが 町長の カルクで あーる！',
      'この町は 昔から 何でも手計算でな……月報づくりで 役人が 毎月 倒れておるので あーる。',
      '3つの店の 3か月分の売上表で ある。店ごとの合計（E列）と、月ごとの合計（5行目）を 出すので あーる！',
    ],
    task: [
      'E2 に =SUM(B2:D2) を入れて、E4 までオートフィル',
      'B5 に =SUM(B2:B4) を入れて、E5 まで右にオートフィル',
    ],
    grid: () => makeGrid(6, 5, TAX, ['A1', 'B1', 'C1', 'D1', 'E1']),
    colWidths: [80, 70, 70, 70, 80],
    hints: [
      '合計の数式を1つ作ったら、あとは オートフィルで コピーするのが 集計の極意じゃ。',
      '横の合計は =SUM(B2:D2)。縦の合計は =SUM(B2:B4)。',
      'フィルハンドルは 下にも 右にも 引っぱれるぞ。',
    ],
    check: (c) =>
      first(
        expectNum(c, 'E2', 1110, 'formula'),
        expectNum(c, 'E3', 480, 'formula'),
        expectNum(c, 'E4', 760, 'formula'),
        expectNum(c, 'B5', 710, 'formula'),
        expectNum(c, 'C5', 800, 'formula'),
        expectNum(c, 'D5', 840, 'formula'),
        expectNum(c, 'E5', 2350, 'formula'),
      ),
    reward: { exp: 40, gold: 40, skill: 'report' },
    thanks: ['おお……月報が 一瞬で……！ 見事で あーる！', '数字を入れかえるだけで 来月も使える。役人たちも 家に帰れるので あーる。', '北の塔の結界も、これで 弱まるはずで あーる。'],
  },
}

// ---------------------------------------------------------------- 洞窟の扉（謎解き）
const DAYS = ['月', '火', '水', '木', '金', '土', '日']
const MARK = [
  ['■', '', '■'],
  ['', '■', ''],
  ['■', '', '■'],
]

Object.assign(QUESTS, {
  cave_days: {
    id: 'cave_days',
    kind: 'puzzle',
    town: 'cave',
    npc: '曜日の扉',
    title: '曜日の扉',
    intro: [
      '石の扉に、升目の刻まれた 石版が はめこまれている。',
      '「月」「火」……と 刻まれているが、その先が 欠けている。',
      '石版の文字を「日」まで 並べれば、扉が 開きそうだ。',
    ],
    task: ['石版の升目に、曜日を「日」まで 並べよ', '※ 1つずつ 手で 打ち込んでも、石版は 反応しないようだ'],
    grid: () => makeGrid(3, 8, [['月', '火']]),
    colWidths: [50, 50, 50, 50, 50, 50, 50, 50],
    hints: [],
    check: (c) => {
      for (let i = 0; i < 7; i++) {
        const a = String.fromCharCode(65 + i) + '1'
        if (c.raw(a) !== DAYS[i]) return `${a} が「${DAYS[i]}」になっていない。`
      }
      if (!c.actions.has('fill')) return '文字は そろったが……石版が 反応しない。並べ方に 何か 決まりが あるようだ。'
      return null
    },
    reward: { exp: 15, gold: 0 },
    thanks: ['石版の升目が 緑色に 光った！'],
  },
  cave_mirror: {
    id: 'cave_mirror',
    kind: 'puzzle',
    town: 'cave',
    npc: '鏡の扉',
    title: '鏡の扉',
    intro: [
      'この扉の石版は、左半分に 模様が 刻まれ、右半分は まっさらだ。',
      '「左の模様を、そのまま 右に 写せ」と 刻まれている。',
    ],
    task: ['左の模様（A1:C3）を、右の台座（E1:G3）に そっくり 写せ', '※ 手で 描き写しても、石版は 反応しないようだ'],
    grid: () => makeGrid(4, 7, MARK),
    colWidths: [44, 44, 44, 24, 44, 44, 44],
    hints: [],
    check: (c) => {
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3; k++) {
          const src = String.fromCharCode(65 + k) + (r + 1)
          const dst = String.fromCharCode(69 + k) + (r + 1)
          if (c.raw(src) !== c.raw(dst)) return `${dst} が ${src} と 同じ模様に なっていない。`
        }
      if (!c.actions.has('paste')) return '模様は 同じだが……扉は 動かない。写し方に 何か 決まりが あるようだ。'
      return null
    },
    reward: { exp: 15, gold: 0 },
    thanks: ['左右の模様が 重なり、石版が 光った！'],
  },
  cave_words: {
    id: 'cave_words',
    kind: 'puzzle',
    town: 'cave',
    npc: '言霊の扉',
    title: '言霊の扉',
    intro: [
      '最後の扉には、呪文が 刻まれている。',
      'しかし 呪いで 文字が 乱れ、どこが 大事な 言葉なのかも わからない。',
      '「呪文を 正しく 直し、大事な言葉を 太字にせよ」……と 読める。',
    ],
    task: ['乱れた呪文（A3）を、扉への 命令の形に 正しく 直せ', '呪文（A2:A3）を 力強い 文字（太字）で 刻め'],
    grid: () => makeGrid(4, 2, [['呪文', 'メモ'], ['とびらよ', '呼びかけ'], ['ひらく', '命令のはず']]),
    colWidths: [110, 110],
    hints: [],
    check: (c) =>
      c.raw('A3').trim() !== 'ひらけ'
        ? 'A3 の呪文が まだ 命令の形に なっていない。'
        : !c.bold('A2') || !c.bold('A3')
          ? '呪文（A2:A3）が まだ 太字に なっていない。'
          : null,
    reward: { exp: 20, gold: 0 },
    thanks: ['「とびらよ ひらけ」――呪文が 力強く 輝いた！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 計算の塔の扉（謎解き）
const STONES = [12, 7, 23, 15, 9, 31, 18]
const GOLEM_SCORES: [string, number | string][] = [
  ['ゴレム', 64],
  ['ゴレス', 88],
  ['ゴレタ', '欠席'],
  ['ゴレコ', 72],
  ['ゴレノ', 96],
  ['ゴレミ', 80],
]

Object.assign(QUESTS, {
  tower_price: {
    id: 'tower_price',
    kind: 'puzzle',
    town: 'tower',
    npc: '値札の扉',
    title: '値札の扉',
    intro: ['扉の石版に、道具の 値段表が 刻まれている。', '「小計」の欄だけが 空白だ。', '「単価 × 数量」を 数式で 埋めよ――と 読める。'],
    task: ['「小計」の欄（D2:D4）を、単価と数量から 計算で 埋めよ', '※ 数字を 直接 書いても、扉は 開かないようだ'],
    grid: () =>
      makeGrid(6, 4, [
        ['品名', '単価', '数量', '小計'],
        ['やくそう', 8, 12],
        ['どくけしそう', 10, 6],
        ['ワープのはね', 25, 3],
      ]),
    colWidths: [130, 60, 60, 70],
    hints: [],
    check: (c) => first(pz(c, 'D2', 96, 'formula'), pz(c, 'D3', 60, 'formula'), pz(c, 'D4', 75, 'formula')),
    reward: { exp: 25, gold: 0 },
    thanks: ['小計の欄に 数字が 浮かび上がった！'],
  },
  tower_sum: {
    id: 'tower_sum',
    kind: 'puzzle',
    town: 'tower',
    npc: '天秤の扉',
    title: '天秤の扉',
    intro: ['扉には 天秤の 絵と、石の 重さの 表が 刻まれている。', '「すべての 石の 重さの 合計を 示せ」――と 読める。'],
    task: ['すべての 石の 重さの 合計を、B9 に 示せ', '※ 1つずつ 足し算を 書き並べても、天秤は 動かないようだ'],
    grid: () => makeGrid(10, 2, [['石', '重さ（kg）'], ...STONES.map((w, i) => [`石${i + 1}`, w]), ['合計']]),
    colWidths: [80, 100],
    hints: [],
    check: (c) => pz(c, 'B9', STONES.reduce((a, b) => a + b, 0), 'SUM'),
    reward: { exp: 25, gold: 0 },
    thanks: ['天秤が ぴたりと つりあった！'],
  },
  tower_stats: {
    id: 'tower_stats',
    kind: 'puzzle',
    town: 'tower',
    npc: '成績の扉',
    title: '成績の扉',
    intro: [
      '最後の扉には、ゴーレムが 筆算で 書きなぐった 成績表が 刻まれている。',
      '「平均・最高点・受験者数を 示せ」――と 読める。',
      '欠席した者は 受験者に 数えぬ、と 小さく 書かれている。',
    ],
    task: ['E2 に 平均点、E3 に 最高点、E4 に 受験者数を 示せ', '※ 欠席した者は 受験者に 数えない'],
    grid: () =>
      makeGrid(8, 5, [
        ['名前', '点数', '', '項目', '答え'],
        [GOLEM_SCORES[0][0], GOLEM_SCORES[0][1], '', '平均'],
        [GOLEM_SCORES[1][0], GOLEM_SCORES[1][1], '', '最高点'],
        [GOLEM_SCORES[2][0], GOLEM_SCORES[2][1], '', '受験者数'],
        ...GOLEM_SCORES.slice(3),
      ]),
    colWidths: [80, 60, 24, 80, 70],
    hints: [],
    check: (c) => first(pz(c, 'E2', 80, 'AVERAGE'), pz(c, 'E3', 96, 'MAX'), pz(c, 'E4', 5, 'COUNT')),
    reward: { exp: 30, gold: 0 },
    thanks: ['成績表が まばゆく 光り、筆算の 落書きが 消えていく！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第2章 サンショウ（参照）
/**
 * 数式を コピーして 使い回す 問題用の判定。
 * dollar=true なら、すべてのセルに $（絶対参照）が 使われていることも 確かめる。
 */
function expectCopy(c: CheckCtx, cells: [string, number][], o: { dollar?: boolean; fn?: string; vague?: boolean } = {}) {
  for (const [a, n] of cells) {
    const r = expectNum(c, a, n, o.fn ?? 'formula', a, o.vague)
    if (r) return r
    if (o.dollar && !c.raw(a).includes('$'))
      return o.vague
        ? `${a} の 値は 合っているが……扉は 反応しない。「ずれない 印」が 足りないようだ。`
        : `${a} は 値は 合っている！ でも $ が 付いていない。1つの 数式に $ を 付けて、コピーで 使い回そう。`
  }
  return null
}

const FRUITS: [string, number, number][] = [
  ['リンゴ', 120, 15],
  ['ミカン', 80, 24],
  ['ブドウ', 350, 6],
  ['モモ', 250, 9],
  ['ナシ', 140, 11],
]
const GOLD: [string, number][] = [
  ['ハンテン', 100],
  ['フローラ', 45],
  ['ヌイ', 80],
  ['カケル', 25],
  ['ウツシ', 150],
]
const CLOTHES: [string, number][] = [
  ['ぎんのドレス', 3000],
  ['鏡のマント', 4500],
  ['礼服', 12000],
  ['ハンカチ', 800],
  ['ベスト', 2500],
]
const FLOWERS: [string, number][] = [
  ['バラ', 400],
  ['チューリップ', 250],
  ['ヒマワリ', 150],
  ['ユリ', 100],
  ['カスミソウ', 100],
]
const BUDGET: [string, number][] = [
  ['湖の清掃', 4321],
  ['街灯の修理', 2468],
  ['神殿の鏡みがき', 987],
  ['花壇の植え替え', 1573],
  ['寺子屋の教材', 3056],
]
const rows = (n: number, from = 2) => Array.from({ length: n }, (_, i) => i + from)

Object.assign(QUESTS, {
  sansho_rel: {
    id: 'sansho_rel',
    town: 'sansho',
    npc: '八百屋ハンテン',
    title: 'くだものの売上',
    intro: [
      'へいらっしゃい！ 八百屋の ハンテンだ！ ……って、それどころじゃ ねえんだ、兄ちゃん。',
      '売上の 数式を D2 に 1個 作ってよ、下に 写したつもりが、呪いで 全部 リンゴの 計算に なっちまった！',
      'D3 を 見てみな。「=B2*C2」のまんまだ。ミカンは 3行目だってのによ、べらんめえ！',
    ],
    task: ['D3:D6 の 数式が、それぞれの 行を 計算するように 直そう', 'D2 の 数式を、D3:D6 に コピーし直すのが 近道'],
    grid: () =>
      makeGrid(8, 4, [
        ['品名', '単価', '数量', '売上'],
        ...FRUITS.map(([n, p, q]) => [n, p, q, '=B2*C2']),
      ], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [90, 60, 60, 80],
    hints: [
      'D3 の 数式は 本当は =B3*C3、D4 は =B4*C4 に なるべきだ。',
      'ふつうに コピーすれば、参照は 下へ 1行ずつ 勝手に ずれてくれる。これが「相対参照」だ！',
      'D2 を 選んで 右下の ■ を D6 まで 引っぱる。または D2 を Ctrl+C → D3:D6 を 選んで Ctrl+V。',
    ],
    check: (c) => expectCopy(c, FRUITS.map(([, p, q], i) => [`D${i + 2}`, p * q])),
    reward: { exp: 50, gold: 50, skill: 'relref' },
    thanks: [
      'おおっ！ ミカンも ブドウも、ちゃんと 自分の 行を 計算してらぁ！',
      '数式を コピーすると、参照も いっしょに ずれる……「相対参照」ってのか。',
      'ずれるのは 呪いじゃなくて、便利な しくみ だったんだな！ ありがとよ！',
    ],
  },

  sansho_abs: {
    id: 'sansho_abs',
    town: 'sansho',
    npc: '両替商ドルマ',
    title: '両替レート表',
    intro: [
      'ようこそ、ドルマ両替所へ。わたくし 両替商の ドルマで ございます、ドル。',
      '1ゴールドは 12シルバー。レートは F1 に 置いて、C2 に「=B2*F1」と 書き、下へ コピーいたしました。',
      'ところが……2人目から 全員「0シルバー」。お客様に 殴られかけまして ございます、ドル……。',
    ],
    task: ['C3:C6 が 0 に なる 原因を 見つけて、全員の 両替額を 正しく 出そう', 'C2 の 数式を 直して、C6 まで コピー'],
    grid: () =>
      makeGrid(8, 6, [
        ['お客', 'ゴールド', 'シルバー', '', 'レート', 12],
        ...GOLD.map(([n, g], i) => [n, g, `=B${i + 2}*F${i + 1}`]),
      ], ['A1', 'B1', 'C1', 'E1']),
    colWidths: [90, 80, 80, 24, 60, 50],
    hints: [
      'C3 の 数式を 見てごらんなさいませ。=B3*F2……レートの F1 まで 下に ずれて、空っぽの F2 を 見ております。',
      'ずれて ほしくない 参照には「$」を 付けます。$F$1 と 書けば、コピーしても F1 のまま で ございます。',
      'C2 を =B2*$F$1 に 直して、C6 まで オートフィル。これで 全員 正しく 両替できます、ドル！',
    ],
    check: (c) => expectCopy(c, GOLD.map(([, g], i) => [`C${i + 2}`, g * 12]), { dollar: true }),
    reward: { exp: 55, gold: 60, skill: 'absref' },
    thanks: [
      'おお……！ 全員の 両替額が ぴたりと 合いました で ございます！',
      '$ を 付けた 参照は、どこへ コピーしても 動かない。「絶対参照」と 申すのですね。',
      'これで お客様に 殴られずに 済みます、ドル。心より 感謝 申し上げます、ドル！',
    ],
  },

  sansho_f4: {
    id: 'sansho_f4',
    town: 'sansho',
    npc: '仕立て屋ヌイ',
    title: 'セール価格の値札',
    intro: [
      'いらっしゃいませ。仕立て屋の ヌイですわ。',
      '明日から 全品 20% 引きの セールですの。割引率は F1 に 書いておきましたわ。',
      'でも「$」を 打つのが 苦手で……指が つりそうですの。もっと 楽に 付ける 方法は ないかしら？',
    ],
    task: ['C2:C6 に セール価格（定価 ×（1 − 割引率））を 出そう', 'C2 で 数式を 入力中、F1 の 後ろで F4 キーを 押すと $F$1 になる（Mac は fn+F4）'],
    grid: () =>
      makeGrid(8, 6, [['品名', '定価', 'セール価格', '', '割引率', 0.2], ...CLOTHES.map(([n, p]) => [n, p])], ['A1', 'B1', 'C1', 'E1']),
    colWidths: [110, 70, 90, 24, 60, 50],
    hints: [
      'C2 に =B2*(1-F1) と 打って……まだ Enter は 押さないで くださいまし。',
      'カーソルが F1 の すぐ 後ろに ある 状態で F4 を 押すと、$F$1 に 変わりますの。押すたびに $F$1 → F$1 → $F1 → F1 と 切り替わりますわ。',
      'C2 が =B2*(1-$F$1) に なったら、C6 まで オートフィルですわ。',
    ],
    check: (c) => expectCopy(c, CLOTHES.map(([, p], i) => [`C${i + 2}`, p * 0.8]), { dollar: true }),
    reward: { exp: 55, gold: 60, skill: 'f4' },
    thanks: [
      'まあ！ F4 を 押すだけで $ が 付くなんて……指が 楽ちんですわ！',
      '値札も ぜんぶ 正しく なりましたわ。セールは 大成功 まちがいなしですの。',
      'お礼に、これからも 身だしなみは ヌイに おまかせくださいまし。',
    ],
  },

  sansho_share: {
    id: 'sansho_share',
    town: 'sansho',
    npc: '花屋フローラ',
    title: '花の人気ランキング',
    intro: [
      'こんにちは〜♪ 花屋の フローラなの！',
      'どの お花が 売上の 何割を しめているか、「構成比」を 出したいの♪',
      'でも C2 に =B2/B7 って 書いて コピーしたら、下が ぜんぶ エラーに なっちゃって……しくしく。',
    ],
    task: ['C2:C6 に、それぞれの 花の 構成比（売上 ÷ 合計）を 出そう', '合計は B7 に 入っている'],
    grid: () =>
      makeGrid(9, 3, [['花', '売上', '構成比'], ...FLOWERS.map(([n, v]) => [n, v]), ['合計', '=SUM(B2:B6)']], ['A1', 'B1', 'C1', 'A7']),
    colWidths: [110, 70, 80],
    hints: [
      '=B2/B7 を 下に コピーすると、C3 は =B3/B8 に なるの。B8 は 空っぽだから 0 で 割って エラーなの。',
      '合計の B7 は どこに コピーしても 動いてほしくない…… $ で 固定するの♪',
      'C2 に =B2/$B$7 → C6 まで オートフィル！ （B$7 でも OK なの）',
    ],
    check: (c) => expectCopy(c, FLOWERS.map(([, v], i) => [`C${i + 2}`, v / 1000]), { dollar: true }),
    reward: { exp: 55, gold: 60, skill: 'share' },
    thanks: [
      'わぁ〜い♪ バラが 0.4 で 4割、チューリップが 2割5分 なの！',
      '「構成比」って、合計を 固定するのが コツ なのね♪',
      'お礼に、お店の 前の お花、いつでも 見に来てね！',
    ],
  },

  sansho_mix: {
    id: 'sansho_mix',
    town: 'sansho',
    npc: 'カケル先生',
    title: '九九の表',
    intro: [
      'よく来てくれた。わしは 寺子屋の カケルじゃ。',
      '子どもらに 九九の表を 作らせておるのだが、1マスずつ 手で 計算しておって……日が 暮れてしまう。',
      '「左の数 × 上の数」を たった1つの 数式で 表ぜんぶに 広げる 方法が あると 聞いた。お主、わかるかの？',
    ],
    task: ['B2:F6 に「左の数（A列）× 上の数（1行目）」を 出そう', 'B2 に 1つ 数式を 作って、表 ぜんぶに コピーするのが 目標'],
    grid: () =>
      makeGrid(8, 6, [['×', 5, 6, 7, 8, 9], [5], [6], [7], [8], [9]], ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'A2', 'A3', 'A4', 'A5', 'A6']),
    colWidths: [50, 50, 50, 50, 50, 50],
    hints: [
      '=A2*B1 を 右へ コピーすると A が B に ずれてしまう。下へ コピーすると 1 が 2 に ずれてしまう。',
      '「左の数」は いつも A列 → 列だけ 固定して $A2。「上の数」は いつも 1行目 → 行だけ 固定して B$1。',
      'B2 に =$A2*B$1。B2 を Ctrl+C → B2:F6 を 選んで Ctrl+V で 一気に 完成じゃ（右→下と オートフィルでも よい）。',
    ],
    check: (c) => {
      const cells: [string, number][] = []
      for (const r of rows(5)) for (let k = 0; k < 5; k++) cells.push([`${'BCDEF'[k]}${r}`, (r + 3) * (k + 5)])
      return expectCopy(c, cells, { dollar: true })
    },
    reward: { exp: 60, gold: 70, skill: 'mixref' },
    thanks: [
      'なんと……たった1つの 数式で、25マスが 一瞬で 埋まったぞ！',
      '列だけ・行だけを 固定する……「複合参照」とは 見事な 技じゃ。',
      'さっそく 子どもらに 教えてやろう。九九の表なら 81マスでも 一瞬じゃな！',
    ],
  },

  sansho_round: {
    id: 'sansho_round',
    town: 'sansho',
    npc: '町長カガミ',
    title: '町の予算表',
    intro: [
      'サンショウの 町長、カガミです。町の 悩みを 次々と 解決してくださって いるそうですね。',
      '最後に お願いが あります。町の 予算表に 税（F1）を 足した「税込額」を 出したいのです。',
      'ただ、1円 未満の 端数が 出てしまって……監査では 整数に 四捨五入するよう 言われているのです。',
    ],
    task: [
      'C2:C6 に 税込額（金額 ×（1 + 税率））を、四捨五入して 整数で 出そう',
      'C7 に 税込額の 合計を 出そう',
    ],
    grid: () =>
      makeGrid(9, 6, [['事業', '金額', '税込額', '', '税率', 0.1], ...BUDGET.map(([n, v]) => [n, v]), ['合計']], ['A1', 'B1', 'C1', 'E1', 'A7']),
    colWidths: [130, 70, 80, 24, 50, 50],
    hints: [
      '四捨五入は ROUND 関数。=ROUND(数値, 0) で 小数第1位を 四捨五入して 整数に なります。',
      '税率の F1 は $ で 固定しましょう。=ROUND(B2*(1+$F$1),0) を C6 まで コピーです。',
      '合計は C7 に =SUM(C2:C6) です。',
    ],
    check: (c) => {
      const vals = BUDGET.map(([, v]) => Math.round(v * 1.1))
      return first(
        expectCopy(c, vals.map((v, i) => [`C${i + 2}`, v]), { dollar: true, fn: 'ROUND' }),
        expectNum(c, 'C7', vals.reduce((a, b) => a + b, 0), 'SUM'),
      )
    },
    reward: { exp: 70, gold: 80, skill: 'round' },
    thanks: [
      '端数も きれいに そろって、合計も ぴたり……。これなら 監査も 通ります。',
      '町の 悩みを すべて 解決して くださって、本当に ありがとうございます。',
      '北の 鏡の神殿の 結界も、これで とけるはず……。どうか、ミラージュを 止めてください。',
    ],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 鏡の神殿の扉（謎解き）
const TEMPLE_GOODS: [string, number][] = [
  ['鏡の かけら', 500],
  ['銀の しずく', 1250],
  ['月の 砂', 800],
  ['星の 粉', 2000],
]
const TEMPLE_LIGHT: [string, number][] = [
  ['東の 鏡', 120],
  ['西の 鏡', 180],
  ['南の 鏡', 60],
  ['北の 鏡', 240],
]

Object.assign(QUESTS, {
  temple_tax: {
    id: 'temple_tax',
    kind: 'puzzle',
    town: 'temple',
    npc: '供物の扉',
    title: '供物の扉',
    intro: ['扉の 石版に、供物の 値段表が 刻まれている。', '「供物には 税を 加えて 納めよ」――と 読める。', '石版の 右上には「税」の 文字と 数字が 1つ。'],
    task: ['「納める額」（C2:C5）を、値段と 税から 計算で 埋めよ', '※ 1つの 式を すべてに 映せ、とも 書かれている'],
    grid: () => makeGrid(7, 6, [['供物', '値段', '納める額', '', '税', 0.08], ...TEMPLE_GOODS.map(([n, v]) => [n, v])]),
    colWidths: [110, 70, 80, 24, 40, 50],
    hints: [],
    check: (c) => expectCopy(c, TEMPLE_GOODS.map(([, v], i) => [`C${i + 2}`, v * 1.08]), { dollar: true, vague: true }),
    reward: { exp: 40, gold: 0 },
    thanks: ['納める額が 浮かび上がり、扉の 鏡が 静かに 光った！'],
  },
  temple_share: {
    id: 'temple_share',
    kind: 'puzzle',
    town: 'temple',
    npc: '光の扉',
    title: '光の扉',
    intro: ['扉には 4枚の 鏡と、それぞれが 集めた 光の 量が 刻まれている。', '「各々の 鏡が、すべての 光の 何割を 担うか 示せ」――と 読める。'],
    task: ['C2:C5 に、それぞれの 鏡が 全体の 何割の 光を 担うかを 示せ（割合で）', '※ 1つの 式を すべてに 映せ'],
    grid: () => makeGrid(8, 3, [['鏡', '光', '割合'], ...TEMPLE_LIGHT.map(([n, v]) => [n, v]), ['すべて', '=SUM(B2:B5)']]),
    colWidths: [90, 60, 70],
    hints: [],
    check: (c) => expectCopy(c, TEMPLE_LIGHT.map(([, v], i) => [`C${i + 2}`, v / 600]), { dollar: true, vague: true }),
    reward: { exp: 40, gold: 0 },
    thanks: ['4枚の 鏡が 順番に 輝き、光が 扉の 中心に 集まった！'],
  },
  temple_times: {
    id: 'temple_times',
    kind: 'puzzle',
    town: 'temple',
    npc: '交差の扉',
    title: '交差の扉',
    intro: ['大鏡の間へ 続く 最後の扉。', '縦と 横に 数字が 並び、交わる マスは すべて 空白だ。', '「縦と 横の 交わりを、ただ 1つの 式で 満たせ」――と 読める。'],
    task: ['B2:E5 の すべての マスに、左端の数 × 上端の数 を 示せ', '※ ただ 1つの 式を 映して 満たせ'],
    grid: () => makeGrid(7, 5, [['', 2, 4, 6, 8], [3], [5], [7], [9]]),
    colWidths: [50, 50, 50, 50, 50],
    hints: [],
    check: (c) => {
      const cells: [string, number][] = []
      for (const [i, a] of [3, 5, 7, 9].entries()) for (const [k, b] of [2, 4, 6, 8].entries()) cells.push([`${'BCDE'[k]}${i + 2}`, a * b])
      return expectCopy(c, cells, { dollar: true, vague: true })
    },
    reward: { exp: 50, gold: 0 },
    thanks: ['すべての マスが 光で 満たされ、大鏡の間への 扉が 開いていく……！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第3章 イフポート（条件）
/** IF などで「文字」や TRUE/FALSE が 出るセルの 判定 */
function expectVal(c: CheckCtx, a: string, want: string | boolean, fn?: string, vague = false): string | null {
  const v = c.v(a)
  const raw = c.raw(a)
  if (raw === '') return `${a} が まだ 空っぽだ。`
  if (/[≧≦≠]/.test(raw)) return BAD_OP
  if (typeof v === 'object' && v !== null)
    return vague ? `${a} が エラー（${v.error}）に なっている。` : `${a} が エラー（${v.error}）に なっている。文字は "大漁" のように " で 囲んだかな？`
  if (v !== want)
    return vague
      ? `${a} の 答え（${formatValue(v) || '空'}）が 正しくないようだ。`
      : `${a} が「${formatValue(v) || '空'}」に なっている。ここは「${formatValue(want)}」に なるはずだ。条件を 見直そう。`
  if (!raw.startsWith('='))
    return vague
      ? `${a} の 答えは 合っているが……扉は 反応しない。手で 書いただけでは ダメなようだ。`
      : `${a} は 合っているけど、手で 入力されている。数式で 判定させよう。`
  if (fn && !usesFn(raw, fn))
    return vague ? `${a} の 答えは 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。` : `${a} は 合っている！ でも ${fn} を 使って 判定してみよう。`
  return null
}
const eachVal = (c: CheckCtx, cells: [string, string | boolean][], fn?: string, vague = false) => first(...cells.map(([a, w]) => expectVal(c, a, w, fn, vague)))

const TIDE: [string, number][] = [
  ['6時', 120],
  ['9時', 185],
  ['12時', 210],
  ['15時', 180],
  ['18時', 150],
]
const BOATS: [string, number][] = [
  ['第一アミ丸', 72],
  ['第二アミ丸', 35],
  ['カモメ号', 50],
  ['イルカ号', 49],
  ['クジラ号', 88],
]
const ORDERS: [string, number][] = [
  ['宿屋', 4500],
  ['武器屋', 2800],
  ['パン屋', 3000],
  ['漁師', 1200],
  ['教会', 3600],
]
const CADETS: [string, number][] = [
  ['マスト', 92],
  ['イカリ', 75],
  ['ホバシラ', 60],
  ['カジ', 58],
  ['ラシン', 80],
]
const WEATHER: [string, number, number][] = [
  ['月', 5, 1],
  ['火', 12, 1],
  ['水', 8, 2],
  ['木', 16, 2],
  ['金', 3, 3],
  ['土', 9, 1],
]
const ARRIVALS: [string, string, number][] = [
  ['カモメ号', '魚', 40],
  ['イルカ号', '貝', 25],
  ['クジラ号', '魚', 65],
  ['サンマ丸', '海藻', 30],
  ['タイ丸', 'カニ', 55],
  ['アジ丸', '魚', 20],
  ['ホタテ丸', '貝', 70],
  ['ワカメ丸', '海藻', 50],
]
const grade = (n: number) => (n >= 80 ? 'A' : n >= 60 ? 'B' : 'C')

Object.assign(QUESTS, {
  port_compare: {
    id: 'port_compare',
    town: 'ifport',
    npc: '灯台守トモシ',
    title: '潮位の見張り',
    intro: [
      'ほっほ……わしは 灯台守の トモシじゃ。',
      '潮位が 警戒ライン（F1）以上に なったら、船に 知らせねば ならん。',
      'じゃが 最近 目が かすんでのう……「以上」か どうか、表で 自動で わかるように できんかの？',
    ],
    task: ['C2:C6 に「潮位が 警戒ライン（F1）以上か」を 出そう（TRUE / FALSE）', '比べるだけの 数式 =B2>=$F$1 で OK。C6 まで コピー'],
    grid: () => makeGrid(8, 6, [['時刻', '潮位(cm)', '危険？', '', '警戒ライン', 180], ...TIDE.map(([t, v]) => [t, v])], ['A1', 'B1', 'C1', 'E1']),
    colWidths: [60, 80, 70, 24, 90, 50],
    hints: [
      '「以上」は >=。=B2>=F1 と 書くと、正しければ TRUE、違えば FALSE に なるんじゃ。',
      'ただし 下へ コピーすると F1 が F2 に ずれてしまう……サンショウで 覚えた $ の 出番じゃな。',
      'C2 に =B2>=$F$1 → C6 まで オートフィル。ちょうど 180 の ときも「以上」じゃから TRUE じゃよ。',
    ],
    check: (c) => eachVal(c, TIDE.map(([, v], i) => [`C${i + 2}`, v >= 180])),
    reward: { exp: 80, gold: 90, skill: 'compare' },
    thanks: [
      'おお、TRUE の 時間だけ 見れば よいのか！ これなら 目が かすんでも 見逃さんわい。',
      '>= が「以上」、> が「より大きい」……ちょうど 180 の ときに 差が 出るんじゃな。',
      '灯台の 明かりも、これで 迷わず 灯せるわい。ありがとうよ。',
    ],
  },

  port_if: {
    id: 'port_if',
    town: 'ifport',
    npc: '漁師アミ',
    title: '大漁か不漁か',
    intro: [
      'あっ、旅の人！ あたし 漁師の アミ！',
      '船ごとの 漁獲量で「50kg以上なら 大漁、それ以外は 不漁」って 記録を つけてるんだけど……',
      '幽霊船が 来てから、1隻ずつ「うーん、大漁……かな？」って 悩んじゃって 進まないの！ 手伝って！',
    ],
    task: ['C2:C6 に、漁獲量が 50以上なら「大漁」、それ以外は「不漁」と 出そう', '=IF(条件, 正しいとき, 違うとき) を 使う'],
    grid: () => makeGrid(8, 3, [['船', '漁獲量(kg)', '結果'], ...BOATS.map(([n, v]) => [n, v])], ['A1', 'B1', 'C1']),
    colWidths: [110, 90, 70],
    hints: [
      'IF は =IF(条件, 正しいときの答え, 違うときの答え) って 形なんだって！',
      '答えが 文字の ときは " で 囲むの。"大漁" "不漁" みたいに。',
      'C2 に =IF(B2>=50,"大漁","不漁") → C6 まで オートフィル！ 50kg ちょうどは 大漁だよ！',
    ],
    check: (c) => eachVal(c, BOATS.map(([, v], i) => [`C${i + 2}`, v >= 50 ? '大漁' : '不漁']), 'IF'),
    reward: { exp: 85, gold: 95, skill: 'if' },
    thanks: [
      'すごーい！ ルールを 1回 書いたら、全部の 船が 一瞬で 判定されちゃった！',
      'もう「大漁……かな？」って 悩まなくて いいんだ！',
      'IF って「もしも」の 魔法なんだね。お礼に、今度 いちばん おいしい 魚 あげるね！',
    ],
  },

  port_ifcalc: {
    id: 'port_ifcalc',
    town: 'ifport',
    npc: '運送屋ハコブ',
    title: '送料の計算',
    intro: [
      'おう、ハコブ運送へ ようこそ！',
      'うちは 3000G以上の 注文なら 送料 タダ、それ未満なら 送料 500G だ。',
      'なのに 最近、1件ずつ「えーと、これは タダ……だっけ？」って 迷って 請求書が 出せねえんだ！',
    ],
    task: ['C2:C6 に 送料（金額が 3000以上なら 0、それ以外は 500）を 出そう', 'D2:D6 に 請求額（金額 ＋ 送料）を 出そう'],
    grid: () => makeGrid(8, 4, [['お客', '金額', '送料', '請求額'], ...ORDERS.map(([n, v]) => [n, v])], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [90, 70, 60, 80],
    hints: [
      'IF の 答えは 文字じゃなくて 数値でも いい。数値は " で 囲まねえ。',
      'C2 に =IF(B2>=3000,0,500)。3000 ちょうどは タダだぜ！',
      'D2 に =B2+C2。どっちも D6・C6 まで オートフィルだ！',
    ],
    check: (c) =>
      first(
        ...ORDERS.map(([, v], i) => expectNum(c, `C${i + 2}`, v >= 3000 ? 0 : 500, 'IF')),
        ...ORDERS.map(([, v], i) => expectNum(c, `D${i + 2}`, v + (v >= 3000 ? 0 : 500), 'formula')),
      ),
    reward: { exp: 85, gold: 100, skill: 'ifcalc' },
    thanks: [
      'よっしゃあ！ 送料も 請求額も 一発で 出たぜ！',
      '金額を 書きかえても、送料が 勝手に 0 と 500 を 切り替える……こいつぁ 便利だ！',
      'これで 今日の 荷物も ぜんぶ 出発できる。ありがとよ！',
    ],
  },

  port_nested: {
    id: 'port_nested',
    town: 'ifport',
    npc: 'ロープ教官',
    title: '航海士試験の評価',
    intro: [
      '本官は 航海士学校の ロープ教官で ある！',
      '試験の 評価は、80点以上が A、60点以上が B、それ未満が C と 決まっている。',
      'だが……IF は「正しい」「違う」の 2つにしか 分けられん。3つに 分ける 方法が わからんのだ……！',
    ],
    task: ['C2:C6 に 評価（80以上 → A、60以上 → B、それ未満 → C）を 出そう', 'IF の 中に、もう1つ IF を 入れる'],
    grid: () => makeGrid(8, 3, [['候補生', '点数', '評価'], ...CADETS.map(([n, v]) => [n, v])], ['A1', 'B1', 'C1']),
    colWidths: [90, 60, 60],
    hints: [
      'まず 80点以上か 判定し、A でなければ……「違うとき」の 場所で もう一度 判定する。',
      '=IF(B2>=80,"A", ここに もう1つの IF ) という 形に なる。',
      'C2 に =IF(B2>=80,"A",IF(B2>=60,"B","C")) → C6 まで オートフィル。カッコの 数に 注意だ！',
    ],
    check: (c) => eachVal(c, CADETS.map(([, v], i) => [`C${i + 2}`, grade(v)]), 'IF'),
    reward: { exp: 90, gold: 100, skill: 'nestif' },
    thanks: [
      '見事で ある！ IF の 中に IF……「入れ子」と いうのだな。',
      '60点ちょうどの ホバシラは B、58点の カジは C。1点も まちがいが ない！',
      '本官も 今日から 採点に 迷わん。敬礼！',
    ],
  },

  port_andor: {
    id: 'port_andor',
    town: 'ifport',
    npc: '天気予報士カザミ',
    title: '出航できる日',
    intro: [
      'あら、いらっしゃい。気象台の カザミよ。',
      '船が 出航できるのは「風速が 10未満」かつ「波が 2m未満」の 日だけ。',
      'それと「風速 15以上」または「波 3m以上」なら 警報を 出すの。2つの 条件を いっしょに 見るのって、むずかしくて……。',
    ],
    task: [
      'D2:D7 に、風速 10未満 かつ 波 2未満 なら「出航」、違えば「欠航」',
      'E2:E7 に、風速 15以上 または 波 3以上 なら「警報」、違えば「なし」',
    ],
    grid: () => makeGrid(9, 5, [['曜日', '風速(m)', '波(m)', '出航', '警報'], ...WEATHER.map(([d, w, h]) => [d, w, h])], ['A1', 'B1', 'C1', 'D1', 'E1']),
    colWidths: [50, 70, 60, 60, 60],
    hints: [
      '「かつ（両方）」は AND、「または（どちらか）」は OR。どちらも TRUE / FALSE を 返すわ。',
      'IF の 条件の 場所に 入れるの。=IF(AND(B2<10,C2<2),"出航","欠航")',
      '警報は =IF(OR(B2>=15,C2>=3),"警報","なし")。どちらも 7行目まで オートフィルね。',
    ],
    check: (c) =>
      first(
        eachVal(c, WEATHER.map(([, w, h], i) => [`D${i + 2}`, w < 10 && h < 2 ? '出航' : '欠航']), 'AND'),
        eachVal(c, WEATHER.map(([, w, h], i) => [`E${i + 2}`, w >= 15 || h >= 3 ? '警報' : 'なし']), 'OR'),
      ),
    reward: { exp: 95, gold: 110, skill: 'andor' },
    thanks: [
      'すてき！ 水曜日は 波が ちょうど 2m だから 欠航……ちゃんと 判定できてるわ。',
      'AND は「両方」、OR は「どちらか」。条件を 組み合わせれば、どんな ルールも 書けるのね。',
      'これで 毎朝の 予報が 一瞬で 出せるわ。ありがとう！',
    ],
  },

  port_countif: {
    id: 'port_countif',
    town: 'ifport',
    npc: '港長ミナト',
    title: '入港記録の集計',
    intro: [
      '港長の ミナトだ。町の 悩みを 次々 片づけて くれているそうだね。',
      '最後に、この 入港記録を 集計してほしい。',
      '「魚を 運んだ 船の数」「魚の 合計」「50箱以上 運んだ 船の数」……聞かれるたびに、職員が 1行ずつ 指で 数えているんだ。',
    ],
    task: ['F2 に「魚」を 運んだ 船の数', 'F3 に「魚」の 箱数の 合計', 'F4 に 50箱以上 運んだ 船の数'],
    grid: () =>
      makeGrid(10, 6, [
        ['船', '積荷', '箱数', '', '項目', '答え'],
        [...ARRIVALS[0], '', '魚の船の数'],
        [...ARRIVALS[1], '', '魚の合計'],
        [...ARRIVALS[2], '', '50箱以上の船'],
        ...ARRIVALS.slice(3),
      ], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [90, 60, 60, 24, 110, 60],
    hints: [
      '条件に 合う セルを 数えるのは COUNTIF。=COUNTIF(B2:B9,"魚")',
      '条件に 合う 行の 合計は SUMIF。=SUMIF(B2:B9,"魚",C2:C9)（条件の範囲、条件、合計する範囲 の 順）',
      '数の 条件は " で 囲んで 書く。=COUNTIF(C2:C9,">=50")',
    ],
    check: (c) =>
      first(
        expectNum(c, 'F2', ARRIVALS.filter(([, k]) => k === '魚').length, 'COUNTIF'),
        expectNum(c, 'F3', ARRIVALS.reduce((a, [, k, n]) => a + (k === '魚' ? n : 0), 0), 'SUMIF'),
        expectNum(c, 'F4', ARRIVALS.filter(([, , n]) => n >= 50).length, 'COUNTIF'),
      ),
    reward: { exp: 110, gold: 130, skill: 'countif' },
    thanks: [
      '見事だ。聞かれた 瞬間に 答えが 出る……もう 指で 数える 必要は ないな。',
      '町の 悩みを すべて 解決して くれて、本当に ありがとう。',
      '桟橋の 結界も とけたはずだ。どうか 幽霊船の 船長を 止めてくれ。港の 未来を たのむ。',
    ],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 幽霊船の扉（謎解き）
const CARGO: [string, number][] = [
  ['木箱', 120],
  ['タル', 80],
  ['網', 100],
  ['帆布', 99],
  ['大砲', 150],
]
const TREASURE_VAL: [string, number][] = [
  ['王冠', 1200],
  ['指輪', 500],
  ['首かざり', 999],
  ['銀貨', 300],
  ['宝剣', 1000],
  ['古い鍵', 450],
]
const CHESTS: [string, number][] = [
  ['金貨', 300],
  ['宝石', 500],
  ['金貨', 150],
  ['地図', 50],
  ['金貨', 250],
  ['宝石', 400],
]

Object.assign(QUESTS, {
  ship_if: {
    id: 'ship_if',
    kind: 'puzzle',
    town: 'ship',
    npc: '積荷の扉',
    title: '積荷の扉',
    intro: ['扉に、積荷の 重さの 表が 刻まれている。', '「重さ 100 以上の 荷は 重、それ以外は 軽 と 記せ」――と 読める。'],
    task: ['C2:C6 に、重さが 100以上なら「重」、それ以外は「軽」と 記せ', '※ 手で 書いても、扉は 開かないようだ'],
    grid: () => makeGrid(7, 3, [['積荷', '重さ', '区分'], ...CARGO.map(([n, v]) => [n, v])]),
    colWidths: [80, 60, 60],
    hints: [],
    check: (c) => eachVal(c, CARGO.map(([, v], i) => [`C${i + 2}`, v >= 100 ? '重' : '軽']), 'IF', true),
    reward: { exp: 60, gold: 0 },
    thanks: ['積荷の 文字が 青白く 光り、扉の 鎖が ほどけた！'],
  },
  ship_nested: {
    id: 'ship_nested',
    kind: 'puzzle',
    town: 'ship',
    npc: '階級の扉',
    title: '階級の扉',
    intro: ['扉には 宝の 名と 価値が 並んでいる。', '「価値 1000 以上は 金、500 以上は 銀、それ未満は 銅。すべての 宝に 階級を 刻め」――と 読める。'],
    task: ['C2:C7 に、価値が 1000以上なら「金」、500以上なら「銀」、それ未満は「銅」と 刻め'],
    grid: () => makeGrid(8, 3, [['宝', '価値', '階級'], ...TREASURE_VAL.map(([n, v]) => [n, v])]),
    colWidths: [90, 60, 60],
    hints: [],
    check: (c) => eachVal(c, TREASURE_VAL.map(([, v], i) => [`C${i + 2}`, v >= 1000 ? '金' : v >= 500 ? '銀' : '銅']), 'IF', true),
    reward: { exp: 60, gold: 0 },
    thanks: ['金・銀・銅の 光が 扉に 宿り、ゆっくりと 開いていく！'],
  },
  ship_countif: {
    id: 'ship_countif',
    kind: 'puzzle',
    town: 'ship',
    npc: '宝の扉',
    title: '宝の扉',
    intro: ['船長室へ 続く 最後の扉。', '宝箱の 中身と 価値の 一覧が 刻まれている。', '「金貨の 箱は いくつか。金貨の 価値は 合わせて いくらか」――と 読める。'],
    task: ['E2 に「金貨」の 箱の数を 示せ', 'E3 に「金貨」の 価値の 合計を 示せ'],
    grid: () =>
      makeGrid(8, 5, [
        ['中身', '価値', '', '問い', '答え'],
        [...CHESTS[0], '', '金貨の箱'],
        [...CHESTS[1], '', '金貨の価値'],
        ...CHESTS.slice(2),
      ]),
    colWidths: [70, 60, 24, 90, 60],
    hints: [],
    check: (c) =>
      first(
        pz(c, 'E2', CHESTS.filter(([k]) => k === '金貨').length, 'COUNTIF'),
        pz(c, 'E3', CHESTS.reduce((a, [k, v]) => a + (k === '金貨' ? v : 0), 0), 'SUMIF'),
      ),
    reward: { exp: 70, gold: 0 },
    thanks: ['金貨が じゃらじゃらと 鳴り響き、船長室の 扉が 開いた……！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第4章 ルックアップ（検索）
/** 関数を 使っているかだけを 確かめる（値の 判定は 別に 行う） */
const needFn = (c: CheckCtx, cells: string[], fn: string, vague = false) => {
  const a = cells.find((x) => !usesFn(c.raw(x), fn))
  if (!a) return null
  return vague ? `${a} の 答えは 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。` : `${a} は 合っている！ でも ${fn} を 使って 探してみよう。`
}

const ADDRESS: [number, string, string][] = [
  [101, 'サガス', '城 1番'],
  [102, 'ヒキダス', '城下 2番'],
  [103, 'シラベ', '港 3番'],
  [104, 'ミツケ', '森 4番'],
  [105, 'サーチ', '丘 5番'],
  [106, 'ケンサ', '川 6番'],
  [107, 'クエリ', '谷 7番'],
]
const PRICE_LIST: [number, string, number][] = [
  [11, 'やくそう', 8],
  [12, 'どくけしそう', 10],
  [13, 'ワープのはね', 25],
  [14, 'せいすい', 20],
  [15, 'まほうのせいすい', 300],
]
const ORDER_CODES = [14, 11, 15, 12]
const RANKS: [number, string][] = [
  [0, '見習い'],
  [60, '兵士'],
  [80, '騎士'],
  [95, '近衛'],
]
const SOLDIERS: [string, number][] = [
  ['ヤリ', 72],
  ['タテ', 95],
  ['ユミ', 58],
  ['オノ', 80],
  ['ツエ', 88],
]
const rankOf = (n: number) => [...RANKS].reverse().find(([t]) => n >= t)![1]
const CATALOG: [number, string][] = [
  [201, '表計算の書'],
  [202, '関数大全'],
  [203, '参照の秘術'],
  [204, '条件の海図'],
  [205, '検索の地図'],
]
const CARDS = [203, 208, 201, 205, 210]
const KNIGHTS: [string, string, number][] = [
  ['アーサ', '剣', 7],
  ['ベディ', '槍', 3],
  ['ガウェ', '弓', 12],
  ['ラン', '盾', 5],
  ['パーシ', '剣', 9],
  ['トリス', '弓', 1],
]
const STOCK: [string, number][] = [
  ['パン', 40],
  ['ワイン', 12],
  ['チーズ', 25],
  ['リンゴ', 60],
  ['ハチミツ', 8],
]
const WANTS = ['チーズ', 'ミルク', 'パン', 'ハチミツ', 'サカナ']
const stockOf = (k: string) => STOCK.find(([n]) => n === k)?.[1] ?? 'なし'

Object.assign(QUESTS, {
  lookup_vlookup: {
    id: 'lookup_vlookup',
    town: 'lookup',
    npc: '郵便屋ポスト',
    title: '宛名さがし',
    intro: [
      'あっ、旅の方！ 郵便屋の ポストです！',
      'この 手紙、宛先が「105番」としか 書いてなくて……住所録の 中から、105番の 人を 探さなきゃ いけないんです。',
      'いつもは 上から 1行ずつ 指で たどるんですけど、呪いのせいか、何回 探しても 見つからないんです……！',
    ],
    task: ['F2 に、E2 の 番号（105）の 人の 名前を 出そう', '=VLOOKUP(探す値, 範囲, 何列目, FALSE) を 使う'],
    grid: () => makeGrid(10, 6, [['番号', '名前', '住所', '', '探す番号', '名前'], [...ADDRESS[0], '', 105], ...ADDRESS.slice(1)], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [60, 80, 80, 24, 80, 80],
    hints: [
      'VLOOKUP は「表の 左端の 列で 探して、同じ行の 右の 列を 取り出す」関数です。',
      '範囲は 表 ぜんたい A2:C8。名前は 範囲の 左から 2列目。',
      'F2 に =VLOOKUP(E2,A2:C8,2,FALSE)。最後の FALSE は「ぴったり 同じ 値を 探す」という 意味です。',
    ],
    check: (c) => expectVal(c, 'F2', 'サーチ', 'VLOOKUP'),
    reward: { exp: 120, gold: 130, skill: 'vlookup' },
    thanks: [
      'サーチさん！ 丘の 5番地ですね！',
      '番号を 入れるだけで 名前が 出てくる……。これなら 何百人 いても 一瞬です！',
      'さっそく 届けてきます。ありがとうございました！',
    ],
  },

  lookup_col: {
    id: 'lookup_col',
    town: 'lookup',
    npc: '道具屋のカタログ',
    title: '注文書の転記',
    intro: [
      'いらっしゃい。道具屋の カタログよ。',
      'お城から 注文書が 届いたの。品番しか 書いてないから、右の 商品表を 見て 品名と 単価を 書き写すんだけど……',
      '1行ずつ 目で 探して 写していると、行を まちがえて しまうのよ。何か いい 方法は ないかしら？',
    ],
    task: ['B2:B5 に 品名、C2:C5 に 単価を、商品表（F2:H6）から 取り出そう', '1つ 作って 下へ コピー。商品表の 範囲は $ で 固定'],
    grid: () => makeGrid(8, 8, [['品番', '品名', '単価', '', '', '品番', '品名', '単価'], [ORDER_CODES[0], '', '', '', '', ...PRICE_LIST[0]], ...PRICE_LIST.slice(1).map((p, i) => [ORDER_CODES[i + 1] ?? '', '', '', '', '', ...p])], ['A1', 'B1', 'C1', 'F1', 'G1', 'H1']),
    colWidths: [50, 110, 60, 20, 20, 50, 110, 60],
    hints: [
      '品名は 商品表（F2:H6）の 2列目、単価は 3列目。',
      '下へ コピーしても 商品表が ずれないように、$F$2:$H$6 と 固定するのが コツよ。',
      'B2 に =VLOOKUP(A2,$F$2:$H$6,2,FALSE)、C2 に =VLOOKUP(A2,$F$2:$H$6,3,FALSE)。どちらも 5行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        ...ORDER_CODES.map((code, i) => expectVal(c, `B${i + 2}`, PRICE_LIST.find(([k]) => k === code)![1], 'VLOOKUP')),
        ...ORDER_CODES.map((code, i) => expectNum(c, `C${i + 2}`, PRICE_LIST.find(([k]) => k === code)![2], 'VLOOKUP')),
      ),
    reward: { exp: 130, gold: 140, skill: 'colindex' },
    thanks: [
      'まあ、品名も 単価も ぴったり！',
      '列番号を 変えるだけで、同じ 表から 別の 情報が 取り出せるのね。',
      '商品表を 固定するのも 忘れずに……サンショウの 人たちが 言ってた「$」って これのことね。',
    ],
  },

  lookup_approx: {
    id: 'lookup_approx',
    town: 'lookup',
    npc: '兵士長ハンテイ',
    title: '兵士の階級',
    intro: [
      '本官は 兵士長の ハンテイである！',
      '試験の 点数で 階級を 決める。0点から 見習い、60点から 兵士、80点から 騎士、95点から 近衛だ。',
      'だが「72点は……60以上で 80未満だから……」と 1人ずつ 考えていては 日が 暮れる！',
    ],
    task: ['C2:C6 に、点数に 応じた 階級を 出そう（階級表は E2:F5）', 'VLOOKUP の 4つ目を TRUE に すると「以下で いちばん 近い 値」を 探せる'],
    grid: () => makeGrid(8, 6, [['兵士', '点数', '階級', '', '点数', '階級'], ...SOLDIERS.map(([n, v], i) => [n, v, '', '', ...(RANKS[i] ?? [])])], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [60, 60, 70, 24, 60, 70],
    hints: [
      '4つ目を TRUE（近似一致）に すると、ぴったりの 値が なくても「探す値 以下で いちばん 大きい 値」の 行が 見つかる。',
      '72点なら 60の 行 → 兵士。階級表は 小さい順に 並べておくのが ルールだ。',
      'C2 に =VLOOKUP(B2,$E$2:$F$5,2,TRUE) → C6 まで オートフィル。',
    ],
    check: (c) => eachVal(c, SOLDIERS.map(([, v], i) => [`C${i + 2}`, rankOf(v)]), 'VLOOKUP'),
    reward: { exp: 140, gold: 150, skill: 'approx' },
    thanks: [
      '見事で ある！ 95点の タテは 近衛、58点の ユミは 見習いだ。',
      '「以上・未満」の 区切りを 表に しておけば、IF を 何個も 重ねなくて よいのだな。',
      '階級表を 書きかえれば 基準も すぐ 変えられる。敬礼！',
    ],
  },

  lookup_iferror: {
    id: 'lookup_iferror',
    town: 'lookup',
    npc: '司書ショコ',
    title: '貸出カードの整理',
    intro: [
      'こんにちは……。図書館の 司書、ショコです。',
      '貸出カードの 番号から 本の 名前を 出したいのですが、目録に ない 番号が まじっていて……',
      'そこだけ「#N/A」という 不気味な 文字が 出るんです。……これも 城の 書庫の 呪いでしょうか。',
    ],
    task: ['B2:B6 に、番号の 本の 名前を 出そう（目録は D2:E6）', '目録に ない 番号は「未登録」と 出す'],
    grid: () => makeGrid(8, 5, [['番号', '書名', '', '番号', '書名'], ...CARDS.map((n, i) => [n, '', '', ...(CATALOG[i] ?? [])])], ['A1', 'B1', 'D1', 'E1']),
    colWidths: [60, 100, 24, 60, 110],
    hints: [
      'VLOOKUP で 見つからないと #N/A エラーに なる。',
      'IFERROR(計算, エラーの ときの 値) で 包むと、エラーの ときだけ 別の 値を 出せる。',
      'B2 に =IFERROR(VLOOKUP(A2,$D$2:$E$6,2,FALSE),"未登録") → B6 まで オートフィル。',
    ],
    check: (c) =>
      first(
        eachVal(c, CARDS.map((n, i) => [`B${i + 2}`, CATALOG.find(([k]) => k === n)?.[1] ?? '未登録']), 'IFERROR'),
        needFn(c, CARDS.map((_, i) => `B${i + 2}`), 'VLOOKUP'),
      ),
    reward: { exp: 140, gold: 150, skill: 'iferror' },
    thanks: [
      '#N/A が 消えて「未登録」に……！ ほっとしました。',
      'エラーを こわがらずに、出たときの 答えを 先に 決めておく……。IFERROR、覚えておきます。',
      '目録に ない 本は、あとで 登録しておきますね。',
    ],
  },

  lookup_xlookup: {
    id: 'lookup_xlookup',
    town: 'lookup',
    npc: '騎士団の書記ロール',
    title: '騎士番号の名簿',
    intro: [
      '騎士団の 書記、ロールだ。',
      '名簿は 左から「名前・部隊・騎士番号」の 順。番号から 名前を 引きたいのだが……',
      'VLOOKUP は 探す列より 左を 取り出せない、と 聞いた。名簿を 並べかえる わけにも いかん。困った。',
    ],
    task: ['F2 に、騎士番号 5 の 騎士の 名前を 出そう', 'F3 に、騎士番号 12 の 騎士の 部隊を 出そう', 'XLOOKUP(探す値, 探す列, 取り出す列) を 使う'],
    grid: () => makeGrid(9, 6, [['名前', '部隊', '騎士番号', '', '騎士番号', '答え'], [...KNIGHTS[0], '', 5], [...KNIGHTS[1], '', 12], ...KNIGHTS.slice(2)], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [70, 50, 70, 24, 70, 70],
    hints: [
      'XLOOKUP は「探す列」と「取り出す列」を 別々に 指定する。だから 左の 列も 取り出せる。',
      '名前なら =XLOOKUP(E2,C2:C7,A2:A7)。探すのは C列、取り出すのは A列。',
      '部隊なら 取り出す列を B2:B7 に。F3 に =XLOOKUP(E3,C2:C7,B2:B7)。',
    ],
    check: (c) => first(expectVal(c, 'F2', 'ラン', 'XLOOKUP'), expectVal(c, 'F3', '弓', 'XLOOKUP')),
    reward: { exp: 150, gold: 160, skill: 'xlookup' },
    thanks: [
      '5番は ラン、12番は 弓部隊の ガウェ か。名簿を 並べかえずに 済んだ！',
      '探す列と 取り出す列を 別に 決められる……XLOOKUP、なんと 自由な 関数だ。',
      '騎士団の 記録も、これで 迷わず 引ける。感謝する。',
    ],
  },

  lookup_minister: {
    id: 'lookup_minister',
    town: 'lookup',
    npc: '大臣サガス',
    title: '城の在庫台帳',
    intro: [
      '大臣の サガスで ございます。城下の 悩みを 次々と 解決して くださって いるそうで。',
      '最後に お願いが。晩餐会の 注文表に、城の 在庫を 書き入れたいのです。',
      'ただ、在庫台帳に ない 品も 頼まれておりまして……「なし」と 出したうえで、取り寄せが 必要な 品の 数も 知りたいのです。',
    ],
    task: ['B2:B6 に 在庫数を 出そう（在庫台帳は F2:G6）。台帳に ない 品は「なし」', 'B8 に「なし」の 品の 数を 出そう'],
    grid: () => makeGrid(9, 7, [['品名', '在庫', '', '', '', '品名', '在庫'], ...WANTS.map((w, i) => [w, '', '', '', '', ...(STOCK[i] ?? [])]), [], ['取り寄せ']], ['A1', 'B1', 'F1', 'G1', 'A8']),
    colWidths: [80, 60, 20, 20, 20, 80, 60],
    hints: [
      'XLOOKUP の 4つ目に「見つからない ときの 値」を 書ける。IFERROR で 包まなくて いい。',
      'B2 に =XLOOKUP(A2,$F$2:$F$6,$G$2:$G$6,"なし") → B6 まで オートフィル。',
      'B8 は COUNTIF で「なし」を 数える。=COUNTIF(B2:B6,"なし")',
    ],
    check: (c) =>
      first(
        eachVal(c, WANTS.map((w, i) => [`B${i + 2}`, stockOf(w)] as [string, string | boolean]), 'XLOOKUP'),
        expectNum(c, 'B8', WANTS.filter((w) => stockOf(w) === 'なし').length, 'COUNTIF'),
      ),
    reward: { exp: 170, gold: 180, skill: 'notfound' },
    thanks: [
      'チーズ 25、パン 40、ハチミツ 8……。ミルクと サカナは 取り寄せ、ですな。',
      '見つからない ときの 答えまで 決めておける。これなら 台帳が どれだけ 大きくても 困りません。',
      '城下の 悩みは これで すべて……。どうか、城の 大書庫に 巣くう ミツカラーヌを 止めてください。',
    ],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 城の大書庫の扉（謎解き）
const SHELVES: [number, string, string][] = [
  [301, '星の書', '北'],
  [302, '風の書', '東'],
  [303, '水の書', '南'],
  [304, '火の書', '西'],
  [305, '土の書', '中'],
]
const AUTHORS: [number, string, string][] = [
  [401, '月の書', 'ルナ'],
  [402, '陽の書', 'ソル'],
  [403, '雲の書', 'クモ'],
  [404, '雷の書', 'ライ'],
  [405, '霧の書', 'キリ'],
]
const SEALED: [number, string][] = [
  [501, '始まりの書'],
  [502, '中の書'],
  [503, '終わりの書'],
  [504, '禁じられた書'],
]
const SEEK = [503, 509, 501, 504]

Object.assign(QUESTS, {
  lib_shelf: {
    id: 'lib_shelf',
    kind: 'puzzle',
    town: 'library',
    npc: '棚の扉',
    title: '棚の扉',
    intro: ['扉に 本の 目録が 刻まれている。', '「304番の 書は いずこの 棚に 眠る？ 目録から 引き 示せ」――と 読める。'],
    task: ['F2 に、E2 の 番号の 本が ある 棚を 示せ', '※ 目で 探して 書いても、扉は 開かないようだ'],
    grid: () => makeGrid(7, 6, [['番号', '書名', '棚', '', '番号', '棚'], [...SHELVES[0], '', 304], ...SHELVES.slice(1)]),
    colWidths: [60, 70, 50, 24, 60, 50],
    hints: [],
    check: (c) => expectVal(c, 'F2', '西', 'VLOOKUP', true),
    reward: { exp: 80, gold: 0 },
    thanks: ['「西」の 文字が 浮かび、書架が 左右に 開いた！'],
  },
  lib_left: {
    id: 'lib_left',
    kind: 'puzzle',
    town: 'library',
    npc: '著者の扉',
    title: '著者の扉',
    intro: ['扉には 本の 番号・書名・著者が 並んでいる。', '「ライが 著した 書の 番号を 示せ」――と 読める。', '番号は 著者より 左に ある……。'],
    task: ['F2 に、E2 の 著者が 書いた 本の 番号を 示せ'],
    grid: () => makeGrid(7, 6, [['番号', '書名', '著者', '', '著者', '番号'], [...AUTHORS[0], '', 'ライ'], ...AUTHORS.slice(1)]),
    colWidths: [60, 70, 60, 24, 60, 60],
    hints: [],
    check: (c) => expectNum(c, 'F2', 404, 'XLOOKUP', 'F2', true),
    reward: { exp: 80, gold: 0 },
    thanks: ['404 の 数字が 光り、扉の 錠が はずれた！'],
  },
  lib_missing: {
    id: 'lib_missing',
    kind: 'puzzle',
    town: 'library',
    npc: '封印の扉',
    title: '封印の扉',
    intro: ['書庫の 最奥へ 続く 扉。', '「求める 書の 名を 記せ。目録に なき 書には『なし』と 記せ」――と 読める。', '1つの 式を すべてに 映せ、とも 刻まれている。'],
    task: ['B2:B5 に 本の 名前を 示せ（目録は E2:F5）', '目録に ない 番号には「なし」と 記せ'],
    grid: () => makeGrid(7, 6, [['番号', '書名', '', '', '番号', '書名'], ...SEEK.map((n, i) => [n, '', '', '', ...SEALED[i]])]),
    colWidths: [60, 100, 20, 20, 60, 100],
    hints: [],
    check: (c) =>
      first(
        eachVal(c, SEEK.map((n, i) => [`B${i + 2}`, SEALED.find(([k]) => k === n)?.[1] ?? 'なし']), 'IFERROR', true),
        needFn(c, SEEK.map((_, i) => `B${i + 2}`), 'VLOOKUP', true),
      ),
    reward: { exp: 100, gold: 0 },
    thanks: ['封印の 鎖が 1本ずつ ほどけ、最奥の 扉が 開いた……！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第5章 ピボリア（複数条件の 集計）
const PATROL: [string, string][] = [
  ['北', '昼'],
  ['南', '夜'],
  ['北', '夜'],
  ['東', '昼'],
  ['北', '夜'],
  ['西', '夜'],
  ['北', '昼'],
  ['南', '昼'],
  ['北', '夜'],
  ['東', '夜'],
]
const MARKET: [string, string, number][] = [
  ['パン', '東店', 120],
  ['肉', '西店', 300],
  ['パン', '西店', 80],
  ['魚', '東店', 200],
  ['パン', '東店', 150],
  ['肉', '東店', 250],
  ['パン', '西店', 90],
  ['パン', '東店', 60],
]
const TAXES: [string, number][] = [
  ['東', 1200],
  ['西', 800],
  ['東', 600],
  ['東', 1500],
  ['南', 2000],
  ['東', 1000],
  ['西', 1300],
  ['東', 400],
]
const CLASSES: [string, number][] = [
  ['赤組', 70],
  ['白組', 85],
  ['赤組', 90],
  ['白組', 60],
  ['赤組', 80],
  ['白組', 95],
  ['赤組', 60],
]
const REGION_TAX: [string, number][] = [
  ['西', 100],
  ['東', 200],
  ['南', 500],
  ['北', 300],
  ['北', 400],
  ['東', 600],
  ['南', 300],
  ['北', 200],
  ['西', 600],
  ['東', 300],
]
const REGIONS = ['北', '南', '東', '西']
const HARVEST: [string, string, number][] = [
  ['北', '小麦', 30],
  ['南', '果物', 50],
  ['北', '果物', 20],
  ['南', '小麦', 40],
  ['北', '小麦', 10],
  ['南', '果物', 30],
  ['北', '果物', 50],
  ['南', '小麦', 25],
  ['北', '小麦', 20],
  ['南', '果物', 10],
]
const count2 = <T extends unknown[]>(rows: T[], f: (r: T) => boolean) => rows.filter(f).length
const sumIf = <T extends unknown[]>(rows: T[], f: (r: T) => boolean, v: (r: T) => number) => rows.filter(f).reduce((a, r) => a + v(r), 0)

Object.assign(QUESTS, {
  pivo_countifs: {
    id: 'pivo_countifs',
    town: 'pivoria',
    npc: '衛兵長カゾエ',
    title: '夜の見回り',
    intro: [
      '衛兵長の カゾエだ。王都の 見回りの 記録を まとめている。',
      '陛下に「北地区の 夜の 見回りは 何回か」と 聞かれたのだが……',
      '「北」で 数えると 昼も まざる。「夜」で 数えると 南も まざる。2つの 条件を 同時に 満たす 数が 出せんのだ！',
    ],
    task: ['E2 に、北地区の「夜」の 見回り回数を 出そう', 'E3 に、北地区の「昼」の 見回り回数を 出そう', '=COUNTIFS(範囲1, 条件1, 範囲2, 条件2) を 使う'],
    grid: () => makeGrid(12, 5, [['地区', '時間帯', '', '条件', '回数'], [...PATROL[0], '', '北・夜'], [...PATROL[1], '', '北・昼'], ...PATROL.slice(2)], ['A1', 'B1', 'D1', 'E1']),
    colWidths: [60, 70, 24, 70, 60],
    hints: [
      'COUNTIF は 条件が 1つ。COUNTIFS（最後に S）は 条件を いくつも 並べられる。',
      '「地区の 範囲と 条件」「時間帯の 範囲と 条件」を ペアで 書く。',
      'E2 に =COUNTIFS(A2:A11,"北",B2:B11,"夜")。E3 は "夜" を "昼" に。',
    ],
    check: (c) =>
      first(
        expectNum(c, 'E2', count2(PATROL, ([a, b]) => a === '北' && b === '夜'), 'COUNTIFS'),
        expectNum(c, 'E3', count2(PATROL, ([a, b]) => a === '北' && b === '昼'), 'COUNTIFS'),
      ),
    reward: { exp: 190, gold: 200, skill: 'countifs' },
    thanks: [
      '北の 夜は 3回、昼は 2回か。……すばらしい、陛下にも すぐ ご報告できる！',
      '条件を ペアで 並べるだけで、いくつでも しぼりこめるのだな。',
      '見回りの 穴も 一目で わかる。感謝するぞ、旅の者。',
    ],
  },

  pivo_sumifs: {
    id: 'pivo_sumifs',
    town: 'pivoria',
    npc: '市場頭アキナ',
    title: '市場の売上',
    intro: [
      'あら、いいところに！ 市場を 仕切っている アキナよ。',
      '王宮から「東店の パンの 売上だけ 合計して 出しなさい」って 言われたの。',
      'SUMIF だと 条件は 1つだけでしょう？「パン」で しぼると 西店の 分まで 入っちゃうのよ……。',
    ],
    task: ['F2 に、東店の パンの 売上の 合計を 出そう', '=SUMIFS(合計する範囲, 範囲1, 条件1, 範囲2, 条件2) を 使う'],
    grid: () => makeGrid(10, 6, [['品目', '店', '売上', '', '条件', '売上合計'], [...MARKET[0], '', 'パン・東店'], ...MARKET.slice(1)], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [60, 60, 60, 24, 90, 70],
    hints: [
      'SUMIFS は「合計する 範囲」を いちばん 最初に 書く。SUMIF（最後に 書く）と 順番が ちがうので 注意！',
      '合計するのは C2:C9。条件は「A列が パン」と「B列が 東店」。',
      'F2 に =SUMIFS(C2:C9,A2:A9,"パン",B2:B9,"東店")',
    ],
    check: (c) => expectNum(c, 'F2', sumIf(MARKET, ([a, b]) => a === 'パン' && b === '東店', (r) => r[2]), 'SUMIFS'),
    reward: { exp: 200, gold: 210, skill: 'sumifs' },
    thanks: [
      '東店の パンは 330G！ 120 と 150 と 60……ぴったりね。',
      '合計する 範囲が 先、あとは 条件の ペアを 並べるだけ。覚えたわ！',
      'これで 店ごと・品目ごとの 報告も こわくないわ。ありがとう！',
    ],
  },

  pivo_compare: {
    id: 'pivo_compare',
    town: 'pivoria',
    npc: '税務官ゼイム',
    title: '大口の納税',
    intro: [
      '……税務官の ゼイムです。',
      '東地区の「1000G 以上の 大口の 納税」だけを 調べよ、と 命じられました。',
      '地区の 条件と、金額の 条件。数えるのも 合計するのも、1件ずつ 目で 見ていては 間違えて しまいます……。',
    ],
    task: ['E2 に、東地区で 1000G 以上の 納税の 件数を 出そう', 'E3 に、その 合計金額を 出そう', '「1000以上」の 条件は ">=1000" と " で 囲む'],
    grid: () => makeGrid(10, 5, [['地区', '金額', '', '東・1000以上', ''], [...TAXES[0], '', '件数'], [...TAXES[1], '', '合計'], ...TAXES.slice(2)], ['A1', 'B1', 'D1']),
    colWidths: [60, 70, 24, 70, 70],
    hints: [
      '数値の 条件も 使える。「1000以上」は ">=1000"。イフポートで 覚えた 書き方と 同じ。',
      '件数は =COUNTIFS(A2:A9,"東",B2:B9,">=1000")',
      '合計は =SUMIFS(B2:B9,A2:A9,"東",B2:B9,">=1000")。合計する 範囲と 条件の 範囲が 同じ 列でも かまわない。',
    ],
    check: (c) =>
      first(
        expectNum(c, 'E2', count2(TAXES, ([a, v]) => a === '東' && v >= 1000), 'COUNTIFS'),
        expectNum(c, 'E3', sumIf(TAXES, ([a, v]) => a === '東' && v >= 1000, (r) => r[1]), 'SUMIFS'),
      ),
    reward: { exp: 210, gold: 220, skill: 'ifscompare' },
    thanks: [
      '3件で 3700G……。ちょうど 1000G の 納税も ちゃんと 入って いますね。「以上」ですから。',
      '条件に 比べる 記号を 入れれば、金額の しぼりこみも 一瞬……。',
      '帳簿を めくる 夜が、これで 少し 短く なりそうです。',
    ],
  },

  pivo_average: {
    id: 'pivo_average',
    town: 'pivoria',
    npc: '学者マナブ',
    title: '組ごとの成績',
    intro: [
      'やあ、王立学院の 学者、マナブだ。',
      '赤組と 白組で 試験を したのだが、「赤組の 平均点」と「白組の 最高点」を 出したい。',
      'AVERAGE や MAX だと 両方の 組が まざって しまう……。条件つきの 平均や 最大は ないものかね？',
    ],
    task: ['E2 に、赤組の 平均点を 出そう（AVERAGEIF）', 'E3 に、白組の 最高点を 出そう（MAXIFS）'],
    grid: () => makeGrid(9, 5, [['組', '点数', '', '', ''], [...CLASSES[0], '', '赤組 平均'], [...CLASSES[1], '', '白組 最高'], ...CLASSES.slice(2)], ['A1', 'B1']),
    colWidths: [60, 60, 24, 80, 60],
    hints: [
      '=AVERAGEIF(条件の範囲, 条件, 平均する範囲)。SUMIF と 同じ 並び。',
      '=MAXIFS(最大を 探す範囲, 条件の範囲, 条件)。こちらは SUMIFS と 同じ 並びで、探す範囲が 先。',
      'E2 に =AVERAGEIF(A2:A8,"赤組",B2:B8)、E3 に =MAXIFS(B2:B8,A2:A8,"白組")',
    ],
    check: (c) =>
      first(
        expectNum(c, 'E2', sumIf(CLASSES, ([k]) => k === '赤組', (r) => r[1]) / count2(CLASSES, ([k]) => k === '赤組'), 'AVERAGEIF'),
        expectNum(c, 'E3', Math.max(...CLASSES.filter(([k]) => k === '白組').map((r) => r[1])), 'MAXIFS'),
      ),
    reward: { exp: 210, gold: 220, skill: 'averageif' },
    thanks: [
      '赤組の 平均は 75点、白組の 最高は 95点か。見事だ！',
      '合計・個数・平均・最大……どれも 条件つきに できるのだな。MINIFS で 最低点も 出せる、と。',
      '引数の 並び順の ちがいも、論文に まとめて おこう。',
    ],
  },

  pivo_summary: {
    id: 'pivo_summary',
    town: 'pivoria',
    npc: '書記官ショウケイ',
    title: '地区別の集計表',
    intro: [
      '書記官の ショウケイと 申します。',
      '税の 記録から「地区ごとの 合計」の 表を 作りたいのです。北・南・東・西……',
      '地区ごとに 式を 書き直していては、地区が 増えるたびに 大仕事。1つの 式で すませる 方法は ありませんか？',
    ],
    task: ['F2:F5 に、E列の 地区ごとの 税の 合計を 出そう', '条件に 地区の セル（E2）を 使い、1つ 作って 下へ コピー。範囲は $ で 固定'],
    grid: () => makeGrid(12, 6, [['地区', '税', '', '', '地区', '合計'], ...REGION_TAX.map((r, i) => [...r, '', '', REGIONS[i] ?? ''])], ['A1', 'B1', 'E1', 'F1']),
    colWidths: [60, 60, 20, 20, 60, 70],
    hints: [
      '条件は "北" と 書くかわりに、北と 書いた セル（E2）を 指定できる。',
      '下へ コピーすると E2 → E3 → E4 と 地区が 変わる。でも 記録の 範囲は ずれては 困るので $ で 固定。',
      'F2 に =SUMIFS($B$2:$B$11,$A$2:$A$11,E2) → F5 まで オートフィル。',
    ],
    check: (c) => first(...REGIONS.map((k, i) => expectNum(c, `F${i + 2}`, sumIf(REGION_TAX, ([a]) => a === k, (r) => r[1]), 'SUMIFS'))),
    reward: { exp: 220, gold: 230, skill: 'summary' },
    thanks: [
      '北 900、南 800、東 1100、西 700……一瞬で 表が できました！',
      '地区の 名前を 変えれば 式は そのまま。地区が 増えても 1行 足すだけですね。',
      'これは まるで「ピボットテーブル」の 手作り版……あ、いえ、王宮の 古い 言い伝えです。',
    ],
  },

  pivo_crosstab: {
    id: 'pivo_crosstab',
    town: 'pivoria',
    npc: '宰相ヒョウマ',
    title: '王国の収穫表',
    intro: [
      '宰相の ヒョウマで ございます。陛下に 代わり、お礼と お願いを。',
      '王国の 収穫を「地区 × 作物」の 表に まとめて 陛下に お見せしたいのです。',
      '縦に 地区、横に 作物。……ですが 宝物庫の 魔物の 呪いで、記録は バラバラ。4マス それぞれに 式を 書いていては 日が 暮れます。',
    ],
    task: ['F2:G3 に、地区（E列）× 作物（1行目）ごとの 収穫量の 合計を 出そう', '1つの 式を 作って 4マスに コピー。地区は 列を、作物は 行を $ で 固定'],
    grid: () =>
      makeGrid(12, 7, [['地区', '作物', '量', '', '', '小麦', '果物'], [...HARVEST[0], '', '北'], [...HARVEST[1], '', '南'], ...HARVEST.slice(2)], ['A1', 'B1', 'C1', 'F1', 'G1', 'E2', 'E3']),
    colWidths: [50, 60, 50, 20, 50, 60, 60],
    hints: [
      '条件は 2つ。地区は E2（左の 見出し）、作物は F1（上の 見出し）。',
      '右へ コピーしても E列を 見続けるよう $E2、下へ コピーしても 1行目を 見続けるよう F$1。サンショウで 覚えた 複合参照だ。',
      'F2 に =SUMIFS($C$2:$C$11,$A$2:$A$11,$E2,$B$2:$B$11,F$1) → G3 まで コピー。',
    ],
    check: (c) =>
      first(
        ...(['北', '南'] as const).flatMap((area, i) =>
          (['小麦', '果物'] as const).map((crop, j) =>
            expectNum(c, `${'FG'[j]}${i + 2}`, sumIf(HARVEST, ([a, b]) => a === area && b === crop, (r) => r[2]), 'SUMIFS'),
          ),
        ),
      ),
    reward: { exp: 240, gold: 250, skill: 'crosstab' },
    thanks: [
      '北の 小麦 60、果物 70。南の 小麦 65、果物 90……！ 陛下も お喜びに なりましょう。',
      '縦と 横の 見出しを 条件に して、1つの 式で 表ぜんぶを 埋める……これぞ 集計の 極意。',
      'ですが 王都の 記録を バラバラに した 張本人は、王宮の 宝物庫に 居座る 魔物「バラバラン」。どうか、王国を 救って くだされ。',
    ],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 王宮の宝物庫の扉（謎解き）
const COINS: [string, string][] = [
  ['金貨', '古'],
  ['銀貨', '古'],
  ['金貨', '新'],
  ['金貨', '古'],
  ['銀貨', '新'],
  ['金貨', '古'],
  ['金貨', '新'],
]
const JEWELS: [string, number][] = [
  ['宝石', 12],
  ['金塊', 30],
  ['宝石', 6],
  ['宝石', 15],
  ['金塊', 8],
  ['宝石', 10],
  ['宝石', 4],
]
const VAULT: [string, string, number][] = [
  ['東', '冠', 2],
  ['西', '剣', 5],
  ['東', '剣', 3],
  ['西', '冠', 4],
  ['東', '冠', 1],
  ['西', '剣', 2],
  ['東', '剣', 6],
]

Object.assign(QUESTS, {
  trs_count: {
    id: 'trs_count',
    kind: 'puzzle',
    town: 'treasury',
    npc: '金貨の扉',
    title: '金貨の扉',
    intro: ['扉に 硬貨の 目録が 刻まれている。', '「古き 金貨は いくつ 眠る？ 数を 示せ」――と 読める。', '金貨で あり、しかも 古い もの……。'],
    task: ['E2 に、「金貨」で「古」の 硬貨の 数を 示せ'],
    grid: () => makeGrid(9, 5, [['種類', '年代', '', '古い金貨', ''], ...COINS], ['A1', 'B1']),
    colWidths: [60, 50, 24, 70, 60],
    hints: [],
    check: (c) => pz(c, 'E2', count2(COINS, ([a, b]) => a === '金貨' && b === '古'), 'COUNTIFS'),
    reward: { exp: 110, gold: 0 },
    thanks: ['「3」の 数字が 金色に 光り、扉が 開いた！'],
  },
  trs_sum: {
    id: 'trs_sum',
    kind: 'puzzle',
    town: 'treasury',
    npc: '重さの扉',
    title: '重さの扉',
    intro: ['天秤の 紋章が 刻まれた 扉。', '「重さ 10 以上の 宝石、その 重さの 和を 示せ」――と 読める。'],
    task: ['E2 に、重さ 10 以上の「宝石」の 重さの 合計を 示せ'],
    grid: () => makeGrid(9, 5, [['宝', '重さ', '', '重い宝石', ''], ...JEWELS], ['A1', 'B1']),
    colWidths: [60, 50, 24, 70, 60],
    hints: [],
    check: (c) => pz(c, 'E2', sumIf(JEWELS, ([a, v]) => a === '宝石' && v >= 10, (r) => r[1]), 'SUMIFS'),
    reward: { exp: 120, gold: 0 },
    thanks: ['天秤が つりあい、扉の 錠が はずれた！'],
  },
  trs_cross: {
    id: 'trs_cross',
    kind: 'puzzle',
    town: 'treasury',
    npc: '王冠の扉',
    title: '王冠の扉',
    intro: ['宝物庫の 最奥へ 続く 扉。', '「東西の 部屋に 眠る 冠と 剣、その 数を 表に 記せ」――と 読める。', '1つの 式を 4つの 枠すべてに 映せ、とも 刻まれている。'],
    task: ['F2:G3 に、部屋（E列）× 宝（1行目）ごとの 数を 示せ'],
    grid: () => makeGrid(9, 7, [['部屋', '宝', '数', '', '', '冠', '剣'], [...VAULT[0], '', '東'], [...VAULT[1], '', '西'], ...VAULT.slice(2)]),
    colWidths: [50, 50, 40, 20, 50, 50, 50],
    hints: [],
    check: (c) =>
      first(
        ...(['東', '西'] as const).flatMap((room, i) =>
          (['冠', '剣'] as const).map((t, j) => pz(c, `${'FG'[j]}${i + 2}`, sumIf(VAULT, ([a, b]) => a === room && b === t, (r) => r[2]), 'SUMIFS')),
        ),
      ),
    reward: { exp: 140, gold: 0 },
    thanks: ['4つの 枠が 同時に 輝き、王冠の 扉が 重々しく 開いた……！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第6章 テキストリア（文字列）
const GUEST_NAMES: [string, string][] = [
  ['山田', '太郎'],
  ['佐藤', '花子'],
  ['鈴木', '一郎'],
  ['田中', '美咲'],
]
const ITEM_CODES = ['TX-1023', 'NB-2201', 'KS-0450', 'TX-3310']
const PHONES = ['03-1234-5678', '03-8765-4321', '03-2468-1357', '03-5555-0001']
const SIGNS = ['パン屋モジモジ', 'テキストリア中央市場', '宿屋ひらがな', 'カタカナ雑貨店本店']
const SIGN_MAX = 8
const MESSY = ['  山田 花子', '佐藤  次郎 ', ' 鈴木   一郎']
const COMPANIES = ['株式会社モジ', '株式会社テキスト', 'ヨミカキ株式会社']
const EMAILS = ['taro@moji.jp', 'hanako@text.co', 'ichiro@kaki.ne']
const trim = (t: string) => t.trim().replace(/ +/g, ' ')

/** & で つないでいるか（CONCATENATE でも よい） */
const needJoin = (c: CheckCtx, cells: string[], vague = false) => {
  const a = cells.find((x) => !c.raw(x).includes('&') && !usesFn(c.raw(x), 'CONCATENATE'))
  if (!a) return null
  return vague ? `${a} の 答えは 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。` : `${a} は 合っている！ でも 文字を そのまま 書かずに、& で つないで 作ってみよう。`
}

Object.assign(QUESTS, {
  text_concat: {
    id: 'text_concat',
    town: 'textria',
    npc: '宿帳係フミ',
    title: '宿帳の名前',
    intro: [
      'いらっしゃいませ。宿場の 宿帳係、フミと 申します。',
      '宿帳には 名字と 名前が 別の 欄に 書いてあるのですが、お部屋の 札には「山田 太郎」のように 1つに して 書きたいのです。',
      '1人ずつ 書き写していたら、文字化けの 呪いで 名前が 化けて しまって……。',
    ],
    task: ['C2:C5 に「名字 名前」（間に 空白）を 作ろう', '文字と 文字は「&」で つなぐ。空白は " " と 書く'],
    grid: () => makeGrid(6, 3, [['名字', '名前', '札の名前'], ...GUEST_NAMES], ['A1', 'B1', 'C1']),
    colWidths: [60, 60, 110],
    hints: [
      '「&」は 文字と 文字を つなぐ 記号。=A2&B2 なら「山田太郎」。',
      '間に 空白を はさむには、空白の 文字 " " を まん中に つなぐ。',
      'C2 に =A2&" "&B2 → C5 まで オートフィル。',
    ],
    check: (c) => first(eachVal(c, GUEST_NAMES.map(([a, b], i) => [`C${i + 2}`, `${a} ${b}`])), needJoin(c, GUEST_NAMES.map((_, i) => `C${i + 2}`))),
    reward: { exp: 260, gold: 260, skill: 'concat' },
    thanks: [
      '「山田 太郎」「佐藤 花子」……きれいに つながりました！',
      '名字や 名前を 直せば、札の 名前も 自動で 変わるのですね。',
      'もう 書き写して 化けさせる 心配は ありません。ありがとうございます！',
    ],
  },

  text_leftright: {
    id: 'text_leftright',
    town: 'textria',
    npc: '倉庫番コード',
    title: '商品コードの分解',
    intro: [
      'おう、倉庫番の コードだ。',
      '荷物の 商品コードは「TX-1023」みたいに、左の 2文字が 産地、右の 4文字が 品番なんだ。',
      '産地ごと・品番ごとに 棚を 分けたいんだが、1つずつ 目で 読んで 書き分けるのは 骨が 折れるぜ。',
    ],
    task: ['B2:B5 に、コードの 左から 2文字（産地）を 取り出そう', 'C2:C5 に、コードの 右から 4文字（品番）を 取り出そう'],
    grid: () => makeGrid(6, 3, [['コード', '産地', '品番'], ...ITEM_CODES.map((x) => [x])], ['A1', 'B1', 'C1']),
    colWidths: [90, 60, 60],
    hints: [
      '=LEFT(文字列, 文字数) で 左から、=RIGHT(文字列, 文字数) で 右から 取り出せる。',
      '産地は 左の 2文字 → LEFT(A2,2)。品番は 右の 4文字 → RIGHT(A2,4)。',
      'B2 に =LEFT(A2,2)、C2 に =RIGHT(A2,4)。どちらも 5行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        eachVal(c, ITEM_CODES.map((x, i) => [`B${i + 2}`, x.slice(0, 2)]), 'LEFT'),
        eachVal(c, ITEM_CODES.map((x, i) => [`C${i + 2}`, x.slice(-4)]), 'RIGHT'),
      ),
    reward: { exp: 270, gold: 270, skill: 'leftright' },
    thanks: [
      'TX、NB、KS……品番も 0450 の 頭の 0 まで ちゃんと 残ってるな！',
      '左から 何文字、右から 何文字。決まった 形の コードなら 一発だ。',
      'これで 棚分けも あっという間だぜ。ありがとよ！',
    ],
  },

  text_mid: {
    id: 'text_mid',
    town: 'textria',
    npc: '通信士デンワ',
    title: '電話番号の局番',
    intro: [
      '……あ、通信所の デンワです。',
      '電話番号「03-1234-5678」の まん中の 4けた「1234」が 局番で、地区ごとに 決まって いるんです。',
      '左からでも 右からでも ない、まん中の 文字だけ 取り出す 方法って あるんでしょうか……？',
    ],
    task: ['B2:B5 に、電話番号の まん中の 4けた（4文字目から 4文字）を 取り出そう', '=MID(文字列, 何文字目から, 何文字) を 使う'],
    grid: () => makeGrid(6, 2, [['電話番号', '局番'], ...PHONES.map((x) => [x])], ['A1', 'B1']),
    colWidths: [120, 60],
    hints: [
      'MID は「何文字目から」「何文字」を 指定して、まん中の 文字を 取り出す。',
      '「03-1234-5678」の 1 は 4文字目（0・3・- の 次）。そこから 4文字。',
      'B2 に =MID(A2,4,4) → B5 まで オートフィル。',
    ],
    check: (c) => eachVal(c, PHONES.map((x, i) => [`B${i + 2}`, x.slice(3, 7)]), 'MID'),
    reward: { exp: 280, gold: 280, skill: 'mid' },
    thanks: [
      '1234、8765、2468、5555……ぜんぶ 局番だけに なりました！',
      '「何文字目から 何文字」……数え方さえ わかれば、どこでも 切り取れるんですね。',
      '地区ごとの 集計も、SUMIFS で すぐ できそうです。',
    ],
  },

  text_len: {
    id: 'text_len',
    town: 'textria',
    npc: '看板屋カンバ',
    title: '看板の文字数',
    intro: [
      'いらっしゃい！ 看板屋の カンバよ。',
      'うちの 看板は 8文字までしか 入らないの。注文された 店名が 入るか どうか、文字数を 数えたいのよ。',
      '指で 1文字ずつ 数えてたら、途中で 何文字目か わからなく なっちゃって……。',
    ],
    task: ['B2:B5 に、店名の 文字数を 出そう（LEN）', `C2:C5 に、${SIGN_MAX}文字より 多ければ「長い」、そうでなければ「OK」と 出そう`],
    grid: () => makeGrid(6, 3, [['店名', '文字数', '判定'], ...SIGNS.map((x) => [x])], ['A1', 'B1', 'C1']),
    colWidths: [150, 60, 60],
    hints: [
      '=LEN(文字列) で 文字数が わかる。空白も 1文字と 数える。',
      '判定は イフポートで 覚えた IF。条件に LEN を そのまま 使える。',
      `B2 に =LEN(A2)。C2 に =IF(LEN(A2)>${SIGN_MAX},"長い","OK")。どちらも 5行目まで オートフィル。`,
    ],
    check: (c) =>
      first(
        ...SIGNS.map((x, i) => expectNum(c, `B${i + 2}`, x.length, 'LEN')),
        eachVal(c, SIGNS.map((x, i) => [`C${i + 2}`, x.length > SIGN_MAX ? '長い' : 'OK']), 'IF'),
      ),
    reward: { exp: 280, gold: 280, skill: 'len' },
    thanks: [
      '中央市場は 10文字、雑貨店本店は 9文字で「長い」……お客さんに 相談しなきゃ。',
      '文字数を 数える だけなら LEN、判定まで するなら IF と 組み合わせる。覚えたわ！',
      '看板づくりが はかどるわ。ありがとう！',
    ],
  },

  text_clean: {
    id: 'text_clean',
    town: 'textria',
    npc: '書記ナラベ',
    title: '名簿の清書',
    intro: [
      '書記の ナラベです。宿場の 名簿を 清書しているのですが……。',
      '名前の 前後や 間に、よけいな 空白が 入っていて、並べると ガタガタなのです。',
      'それに、会社名の「株式会社」は 長いので「(株)」に したい。1つずつ 消して 書き直すのは、もう うんざりです。',
    ],
    task: ['B2:B4 に、A列の 名前から よけいな 空白を 取り除こう（TRIM）', 'D2:D4 に、C列の「株式会社」を「(株)」に 置きかえよう（SUBSTITUTE）'],
    grid: () => makeGrid(5, 4, [['名前（元）', '名前（清書）', '会社名（元）', '会社名（略）'], ...MESSY.map((x, i) => [x, '', COMPANIES[i]])], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [110, 100, 130, 110],
    hints: [
      '=TRIM(文字列) は、前後の 空白を 消し、間の 空白も 1つに そろえる。',
      '=SUBSTITUTE(文字列, 探す文字, 置きかえる文字) で 文字を 置きかえる。',
      'B2 に =TRIM(A2)、D2 に =SUBSTITUTE(C2,"株式会社","(株)")。どちらも 4行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        eachVal(c, MESSY.map((x, i) => [`B${i + 2}`, trim(x)]), 'TRIM'),
        eachVal(c, COMPANIES.map((x, i) => [`D${i + 2}`, x.replace('株式会社', '(株)')]), 'SUBSTITUTE'),
      ),
    reward: { exp: 290, gold: 290, skill: 'clean' },
    thanks: [
      '名前が ぴしっと そろいました！ (株)モジ、ヨミカキ(株)……後ろに ある 株式会社も ちゃんと 置きかわって いますね。',
      '空白を 消す TRIM と、文字を 置きかえる SUBSTITUTE。清書の 二大道具です。',
      'これで 名簿も 見違えるように なりました。感謝します。',
    ],
  },

  text_find: {
    id: 'text_find',
    town: 'textria',
    npc: '宿場長カキコ',
    title: '手紙のあて先',
    intro: [
      '宿場長の カキコです。町の 悩みを 次々と 解いて くださって ありがとう。',
      '最後に お願いが。伝書鳩の あて先は「taro@moji.jp」のように、@ の 前が 名前、後ろが 町の 印なの。',
      '@ の 位置は 人によって ちがうから、何文字目で 切るか 決められなくて……。',
    ],
    task: ['B2:B4 に、@ より 前（名前）を 取り出そう', 'C2:C4 に、@ より 後ろ（町の 印）を 取り出そう', '=FIND("@", A2) で @ が 何文字目か わかる'],
    grid: () => makeGrid(5, 3, [['あて先', '名前', '町の印'], ...EMAILS.map((x) => [x])], ['A1', 'B1', 'C1']),
    colWidths: [130, 70, 80],
    hints: [
      'FIND("@",A2) は @ が 何文字目かを 返す。taro@… なら 5。',
      '名前は @ の 1つ 手前まで → =LEFT(A2,FIND("@",A2)-1)',
      '町の印は 全体の 文字数から @ までを 引いた 分 → =RIGHT(A2,LEN(A2)-FIND("@",A2))。どちらも 4行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        eachVal(c, EMAILS.map((x, i) => [`B${i + 2}`, x.split('@')[0]]), 'FIND'),
        eachVal(c, EMAILS.map((x, i) => [`C${i + 2}`, x.split('@')[1]]), 'FIND'),
      ),
    reward: { exp: 310, gold: 310, skill: 'find' },
    thanks: [
      'taro、hanako、ichiro……@ の 位置が ちがっても、ぴったり 切り分けられたわ！',
      '場所を 探す FIND と、切り取る LEFT・RIGHT。組み合わせれば、どんな 文字でも 自由自在ね。',
      'でも 町の 文字を 化けさせている 張本人は、北の 活版印刷所に 住みついた「モジバケーラ」。どうか、止めて ちょうだい。',
    ],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 活版印刷所の扉（謎解き）
const SECRETS: [string, string][] = [
  ['合言葉:ヨミ', 'ヨミ'],
  ['鍵:カキ', 'カキ'],
  ['ひみつの言葉:ソロバン', 'ソロバン'],
]

Object.assign(QUESTS, {
  prt_join: {
    id: 'prt_join',
    kind: 'puzzle',
    town: 'printing',
    npc: '活字の扉',
    title: '活字の扉',
    intro: ['扉に 2つの 活字が はめこまれている。', '「左の 字と 右の 字を つなぎ、扉に 命じよ」――と 読める。'],
    task: ['C2 に、A2 と B2 の 文字を つないだ 言葉を 示せ', '※ 自分で 書き写しても、扉は 開かないようだ'],
    grid: () => makeGrid(3, 3, [['左の字', '右の字', '命令'], ['ヒラ', 'ケ']]),
    colWidths: [60, 60, 80],
    hints: [],
    check: (c) => first(expectVal(c, 'C2', 'ヒラケ', undefined, true), needJoin(c, ['C2'], true)),
    reward: { exp: 140, gold: 0 },
    thanks: ['「ヒラケ」の 文字が 光り、扉が 開いた！'],
  },
  prt_mid: {
    id: 'prt_mid',
    kind: 'puzzle',
    town: 'printing',
    npc: '隠し字の扉',
    title: '隠し字の扉',
    intro: ['扉に 意味の ない 文字の 列が 刻まれている。', '「4番目の 字より 2字、そこに 鍵は 眠る」――と 読める。'],
    task: ['B2 に、A2 の 4文字目から 2文字を 示せ'],
    grid: () => makeGrid(3, 2, [['文字の列', '鍵'], ['アイウカギエオ']]),
    colWidths: [130, 60],
    hints: [],
    check: (c) => expectVal(c, 'B2', 'カギ', 'MID', true),
    reward: { exp: 150, gold: 0 },
    thanks: ['「カギ」の 文字が 浮かび、錠が はずれた！'],
  },
  prt_find: {
    id: 'prt_find',
    kind: 'puzzle',
    town: 'printing',
    npc: '合言葉の扉',
    title: '合言葉の扉',
    intro: ['印刷所の 最奥へ 続く 扉。', '「『:』の 後ろに 真の 言葉 あり。3つ すべてを 1つの 式で 示せ」――と 読める。'],
    task: ['B2:B4 に、「:」より 後ろの 言葉を 示せ'],
    grid: () => makeGrid(5, 2, [['刻まれた文', '言葉'], ...SECRETS.map(([x]) => [x])]),
    colWidths: [170, 80],
    hints: [],
    check: (c) => first(eachVal(c, SECRETS.map(([, w], i) => [`B${i + 2}`, w]), 'FIND', true)),
    reward: { exp: 170, gold: 0 },
    thanks: ['3つの 言葉が 同時に 響き、最奥の 扉が 開いた……！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第7章 コヨミノ（日付）
/** 「2026/10/1」→ 日付（UTC） */
const D = (t: string) => {
  const [y, m, d] = t.split('/').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const fmtD = (d: Date) => `${d.getUTCFullYear()}/${d.getUTCMonth() + 1}/${d.getUTCDate()}`
const addDays = (t: string, n: number) => fmtD(new Date(D(t).getTime() + n * 86400000))
const daysBetween = (a: string, b: string) => Math.round((D(b).getTime() - D(a).getTime()) / 86400000)
/** EDATE：月を 足す（その月に ない 日は 月末に そろえる） */
const addMonths = (t: string, n: number) => {
  const d = D(t)
  const y = d.getUTCFullYear()
  const m = d.getUTCMonth() + n
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return fmtD(new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last))))
}
const monthEnd = (t: string) => {
  const d = D(t)
  return fmtD(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)))
}
/** WEEKDAY(日付, 2)：月曜 1 〜 日曜 7 */
const weekday2 = (t: string) => ((D(t).getUTCDay() + 6) % 7) + 1
/** DATEDIF の "Y" と "M" */
const fullMonths = (a: string, b: string) => {
  const x = D(a)
  const y = D(b)
  let m = (y.getUTCFullYear() - x.getUTCFullYear()) * 12 + (y.getUTCMonth() - x.getUTCMonth())
  if (y.getUTCDate() < x.getUTCDate()) m--
  return m
}
const fullYears = (a: string, b: string) => Math.floor(fullMonths(a, b) / 12)

const ORDERS7: [string, number][] = [
  ['2026/10/1', 7],
  ['2026/10/5', 10],
  ['2026/10/20', 14],
  ['2026/10/28', 5],
]
const TODAY7 = '2026/10/10'
const DEADLINES = ['2026/10/15', '2026/10/31', '2026/11/10', '2026/12/24']
const BIRTHDAYS = ['1995/4/12', '1988/12/3', '2001/7/30', '1979/1/15']
const MARKET_DAYS = ['2026/10/2', '2026/10/3', '2026/10/4', '2026/10/5', '2026/10/6']
const CONTRACTS: [string, number][] = [
  ['2026/1/15', 6],
  ['2026/3/31', 1],
  ['2026/8/10', 12],
]
const VILLAGERS: [string, string][] = [
  ['ムラオサ', '2001/12/1'],
  ['ハタケ', '2018/10/11'],
  ['イズミ', '2016/10/9'],
  ['モリ', '2010/4/1'],
]

Object.assign(QUESTS, {
  date_add: {
    id: 'date_add',
    town: 'koyomi',
    npc: '飛脚ハヤテ',
    title: 'お届け予定日',
    intro: [
      'おっと、旅の人！ 飛脚の ハヤテだ。',
      '荷物は「受付の日から 何日後に 届けるか」で 約束してる。予定日を 帳面に 書きたいんだが……',
      '暦の 呪いで、10月の 次が 何月だったか、31日の 次が 何日だったか、さっぱり わからなく なっちまった！',
    ],
    task: ['C2:C5 に、受付日（A列）の 日数（B列）後の 日付を 出そう', '日付は 足し算・引き算が できる。=A2+B2'],
    grid: () => makeGrid(6, 3, [['受付日', '日数', '届け予定日'], ...ORDERS7], ['A1', 'B1', 'C1']),
    colWidths: [90, 50, 100],
    hints: [
      '表計算の 日付は「1日 ＝ 1」の 数として 扱われている。だから 足せば 何日後、引けば 何日前。',
      '月や 年を またいでも、表計算ソフトが 暦どおりに 計算してくれる。',
      'C2 に =A2+B2 → C5 まで オートフィル。',
    ],
    check: (c) => eachVal(c, ORDERS7.map(([d, n], i) => [`C${i + 2}`, addDays(d, n)]), undefined),
    reward: { exp: 330, gold: 320, skill: 'dateadd' },
    thanks: [
      '10月20日の 14日後は 11月3日、28日の 5日後は 11月2日……月を またいでも ばっちりだ！',
      '日付は 数と 同じように 足せる……こりゃ 便利だな。',
      'これで お客さんとの 約束を 破らずに すむぜ。ありがとよ！',
    ],
  },

  date_diff: {
    id: 'date_diff',
    town: 'koyomi',
    npc: '鍛冶屋の弟子ノコリ',
    title: '締め切りまで あと何日',
    intro: [
      'あ、あの……鍛冶屋の 弟子の ノコリです。',
      '注文の 締め切りが いくつも あって、それぞれ「今日から あと何日か」を 知りたいんです。',
      'カレンダーを 指で 数えてたら、途中で 何日目か わからなく なって……。',
    ],
    task: ['B2:B5 に、締め切り（A列）まで 今日（E1）から あと何日かを 出そう', '1つ 作って 下へ コピー。今日の セルは $ で 固定'],
    grid: () => makeGrid(6, 5, [['締め切り', 'あと何日', '', '今日', TODAY7], ...DEADLINES.map((d) => [d])], ['A1', 'B1', 'D1']),
    colWidths: [100, 70, 20, 50, 100],
    hints: [
      '日付どうしを 引き算すると、間の 日数が 出る。締め切り − 今日。',
      '下へ コピーしても 今日の セル（E1）が ずれないよう $E$1 に する。',
      'B2 に =A2-$E$1 → B5 まで オートフィル。',
    ],
    check: (c) => first(...DEADLINES.map((d, i) => expectNum(c, `B${i + 2}`, daysBetween(TODAY7, d), 'formula'))),
    reward: { exp: 340, gold: 330, skill: 'datediff' },
    thanks: [
      'あと 5日、21日、31日、75日……！ いちばん 急ぐのは 10月15日の 注文ですね。',
      '引き算するだけで 日数が 出る。今日の セルを 書きかえれば、毎日 使えますね！',
      '師匠に 怒られずに すみそうです。ありがとうございます！',
    ],
  },

  date_parts: {
    id: 'date_parts',
    town: 'koyomi',
    npc: 'お祝い係ハレ',
    title: '誕生月のお祝い',
    intro: [
      'こんにちは！ 村の お祝い係、ハレです。',
      '毎月、その月が 誕生日の 人を お祝いするんですけど、名簿の 誕生日が「1995/4/12」みたいに 年・月・日 ぜんぶ くっついてて……',
      '月と 日だけ 取り出す 方法って ないですか？',
    ],
    task: ['B2:B5 に、誕生日の「月」を 取り出そう（MONTH）', 'C2:C5 に、誕生日の「日」を 取り出そう（DAY）'],
    grid: () => makeGrid(6, 3, [['誕生日', '月', '日'], ...BIRTHDAYS.map((d) => [d])], ['A1', 'B1', 'C1']),
    colWidths: [100, 50, 50],
    hints: [
      '=YEAR(日付) で 年、=MONTH(日付) で 月、=DAY(日付) で 日を 数として 取り出せる。',
      '月は =MONTH(A2)、日は =DAY(A2)。',
      'B2 に =MONTH(A2)、C2 に =DAY(A2)。どちらも 5行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        ...BIRTHDAYS.map((d, i) => expectNum(c, `B${i + 2}`, D(d).getUTCMonth() + 1, 'MONTH')),
        ...BIRTHDAYS.map((d, i) => expectNum(c, `C${i + 2}`, D(d).getUTCDate(), 'DAY')),
      ),
    reward: { exp: 340, gold: 330, skill: 'dateparts' },
    thanks: [
      '4月、12月、7月、1月……日も ちゃんと 出ました！',
      '月が 数に なれば、COUNTIF で「今月 誕生日の 人数」も 数えられますね！',
      'お祝いの 準備が はかどります。ありがとう！',
    ],
  },

  date_weekday: {
    id: 'date_weekday',
    town: 'koyomi',
    npc: '市場番ヨウビ',
    title: '市場の休み',
    intro: [
      '市場番の ヨウビじゃ。',
      'この 村の 市場は、土曜と 日曜が 休み。じゃが 暦の 呪いで、日付から 曜日が わからなく なってしもうた。',
      '「その日は 開いとるか」と 聞かれても、答えられんのじゃ……。',
    ],
    task: ['B2:B6 に、土曜・日曜なら「休み」、それ以外は「営業」と 出そう', '=WEEKDAY(日付, 2) は 月曜が 1、土曜が 6、日曜が 7'],
    grid: () => makeGrid(7, 2, [['日付', '市場'], ...MARKET_DAYS.map((d) => [d])], ['A1', 'B1']),
    colWidths: [100, 60],
    hints: [
      'WEEKDAY は 曜日を 数で 返す。2つ目に 2 を 書くと 月曜 1 〜 日曜 7。',
      '土日は 6 と 7、つまり「6以上」。IF の 条件に WEEKDAY(A2,2)>=6 と 書く。',
      'B2 に =IF(WEEKDAY(A2,2)>=6,"休み","営業") → B6 まで オートフィル。',
    ],
    check: (c) => eachVal(c, MARKET_DAYS.map((d, i) => [`B${i + 2}`, weekday2(d) >= 6 ? '休み' : '営業']), 'WEEKDAY'),
    reward: { exp: 350, gold: 340, skill: 'weekday' },
    thanks: [
      '3日と 4日が 休みで、あとは 営業……そうじゃ、そうじゃった！',
      '曜日を 数に すれば、IF で 判断できる。「6以上は 休み」とは わかりやすい。',
      '客に 聞かれても もう 迷わん。礼を 言うぞ。',
    ],
  },

  date_edate: {
    id: 'date_edate',
    town: 'koyomi',
    npc: '契約係ツキミ',
    title: '契約の更新日',
    intro: [
      '契約係の ツキミと 申します。',
      '畑の 貸し借りの 契約は「○か月ごとに 更新」で、お代は「その月の 末日」に 締めます。',
      '月によって 30日だったり 31日だったり、2月は 28日だったり……もう 頭が こんがらがって しまって。',
    ],
    task: ['C2:C4 に、開始日（A列）の 月数（B列）後の 更新日を 出そう（EDATE）', 'D2:D4 に、開始日の 月の 末日を 出そう（EOMONTH）'],
    grid: () => makeGrid(5, 4, [['開始日', '月数', '更新日', '月末'], ...CONTRACTS], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [100, 50, 100, 100],
    hints: [
      '=EDATE(日付, 月数) で ○か月後の 同じ日。その月に ない 日（4月31日 など）は 月末に なる。',
      '=EOMONTH(日付, 0) で その月の 末日。1 に すると 翌月の 末日。',
      'C2 に =EDATE(A2,B2)、D2 に =EOMONTH(A2,0)。どちらも 4行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        eachVal(c, CONTRACTS.map(([d, n], i) => [`C${i + 2}`, addMonths(d, n)]), 'EDATE'),
        eachVal(c, CONTRACTS.map(([d], i) => [`D${i + 2}`, monthEnd(d)]), 'EOMONTH'),
      ),
    reward: { exp: 360, gold: 350, skill: 'edate' },
    thanks: [
      '3月31日の 1か月後は 4月30日……4月に 31日が ないことまで 考えて くれるのですね！',
      '何日 足すか ではなく、何か月 足すか。暦に 合わせた 計算が できるのですね。',
      '契約の 帳面が すっきりしました。ありがとうございます。',
    ],
  },

  date_datedif: {
    id: 'date_datedif',
    town: 'koyomi',
    npc: '村長トキワ',
    title: '勤続のお祝い',
    intro: [
      '村長の トキワじゃ。村の 暦を 次々と 取り戻して くれて、礼を 言う。',
      '最後に 頼みが ある。村に 来てから 10年 以上 たつ 者を 表彰したいのじゃ。',
      'じゃが「何年 たったか」を 引き算で 出そうと すると、日数に なって しまって……。',
    ],
    task: ['B2:B5 に、入村日（A列）から 今日（E1）までの 年数（満年数）を 出そう', 'C2:C5 に、10年 以上なら「表彰」、それ以外は「-」と 出そう'],
    grid: () => makeGrid(6, 5, [['入村日', '年数', '表彰', '今日', TODAY7], ...VILLAGERS.map(([, d]) => [d])], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [100, 50, 60, 50, 100],
    hints: [
      '=DATEDIF(開始日, 終了日, "Y") で 満年数。"M" なら 満月数、"D" なら 日数。',
      '今日の セルは コピーしても ずれないよう $E$1。',
      'B2 に =DATEDIF(A2,$E$1,"Y")、C2 に =IF(B2>=10,"表彰","-")。どちらも 5行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        ...VILLAGERS.map(([, d], i) => expectNum(c, `B${i + 2}`, fullYears(d, TODAY7), 'DATEDIF')),
        eachVal(c, VILLAGERS.map(([, d], i) => [`C${i + 2}`, fullYears(d, TODAY7) >= 10 ? '表彰' : '-']), 'IF'),
      ),
    reward: { exp: 380, gold: 370, skill: 'datedif' },
    thanks: [
      '24年、7年、10年、16年……2016年10月9日の 者は、きのうで ちょうど 10年じゃな。',
      '「満何年」は DATEDIF。引き算と ちがって、誕生日を 迎えたかまで 見て くれるのじゃな。',
      'じゃが 村の 暦を 狂わせた 張本人は、北の 時計塔に 棲む「シメキリス」。どうか、時を 取り戻して くれ。',
    ],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 時計塔の扉（謎解き）
const TERMS: [string, string][] = [
  ['2026/1/10', '2026/4/10'],
  ['2025/6/1', '2026/6/1'],
  ['2026/2/20', '2026/3/19'],
]

Object.assign(QUESTS, {
  clk_add: {
    id: 'clk_add',
    kind: 'puzzle',
    town: 'clock',
    npc: '百日の扉',
    title: '百日の扉',
    intro: ['扉に 日付と 数字が 刻まれている。', '「始まりの日より 百日の 後、その 日付を 示せ」――と 読める。'],
    task: ['C2 に、A2 の 日付の B2 日後の 日付を 示せ'],
    grid: () => makeGrid(3, 3, [['始まりの日', '日数', '百日の後'], ['2026/1/1', 100]]),
    colWidths: [100, 50, 100],
    hints: [],
    check: (c) => expectVal(c, 'C2', addDays('2026/1/1', 100), undefined, true),
    reward: { exp: 160, gold: 0 },
    thanks: [`「${addDays('2026/1/1', 100)}」の 文字が 光り、扉が 開いた！`],
  },
  clk_weekday: {
    id: 'clk_weekday',
    kind: 'puzzle',
    town: 'clock',
    npc: '曜日の扉',
    title: '曜日の扉',
    intro: ['扉に 7つの 穴が 並び、1つの 日付が 刻まれている。', '「この日は 月より 数えて 幾つめの 日か。その 数を 示せ」――と 読める。'],
    task: ['B2 に、A2 の 日付の 曜日を 月曜 1 〜 日曜 7 の 数で 示せ'],
    grid: () => makeGrid(3, 2, [['日付', '曜日の数'], ['2026/12/25']]),
    colWidths: [100, 70],
    hints: [],
    check: (c) => expectNum(c, 'B2', weekday2('2026/12/25'), 'WEEKDAY', 'B2', true),
    reward: { exp: 170, gold: 0 },
    thanks: ['7つの 穴の 1つに 光が ともり、錠が はずれた！'],
  },
  clk_months: {
    id: 'clk_months',
    kind: 'puzzle',
    town: 'clock',
    npc: '月日の扉',
    title: '月日の扉',
    intro: ['時計塔の 最上階へ 続く 扉。', '「3つの 時の 間、満ちた 月の 数を 示せ。1つの 式を すべてに 映せ」――と 読める。'],
    task: ['C2:C4 に、開始日（A列）から 終了日（B列）までの 満月数を 示せ'],
    grid: () => makeGrid(5, 3, [['開始日', '終了日', '満ちた月'], ...TERMS]),
    colWidths: [100, 100, 70],
    hints: [],
    check: (c) => first(...TERMS.map(([a, b], i) => expectNum(c, `C${i + 2}`, fullMonths(a, b), 'DATEDIF', `C${i + 2}`, true))),
    reward: { exp: 190, gold: 0 },
    thanks: ['時計塔の 鐘が 1つ 鳴り、最上階への 扉が 開いた……！'],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 最終章 ホープ（エラーの 直し方と 総まとめ）
const SUPPLY: [number, number][] = [
  [120, 4],
  [90, 0],
  [60, 3],
  [80, 0],
]
const WATCH: [string, number | string][] = [
  ['月', 12],
  ['火', '休み'],
  ['水', 9],
  ['木', 15],
  ['金', '休み'],
]
const SCRIBE_SCORES = [72, 55, 88, 64]
const MAP_COST = [300, 450, 120, 800]
const RATE_F = 0.1
const UNITS: [string, string, number][] = [
  ['西隊', '兵糧', 60],
  ['南隊', '兵糧', 25],
  ['北隊', '兵糧', 40],
  ['北隊', '兵糧', 70],
  ['南隊', '兵糧', 30],
  ['西隊', '兵糧', 50],
  ['北隊', '兵糧', 10],
  ['南隊', '兵糧', 20],
]
const UNIT_NAMES = ['北隊', '南隊', '西隊']
const ROSTER: [string, number][] = [
  ['北隊', 38],
  ['南隊', 27],
  ['西隊', 33],
  ['遊撃隊', 22],
]

/** 数か「-」か（0 で 割る 行は「-」） */
const divOrDash = (c: CheckCtx, a: string, want: number | string) => (typeof want === 'number' ? expectNum(c, a, want) : expectVal(c, a, want))
const needErrFix = (c: CheckCtx, cells: string[]) => {
  const a = cells.find((x) => !usesFn(c.raw(x), 'IFERROR') && !usesFn(c.raw(x), 'IF'))
  return a ? `${a} は 合っている！ でも IFERROR（または IF）で エラーを 防ぐ 形に しよう。` : null
}

Object.assign(QUESTS, {
  err_div0: {
    id: 'err_div0',
    town: 'hope',
    npc: '補給係ワリザン',
    title: '1人あたりの食料',
    intro: [
      '補給係の ワリザンだ。魔王城へ 向かう 部隊に、食料を 分けている。',
      '「食料 ÷ 人数」で 1人あたりを 出したいんだが……まだ 人が 集まって いない 部隊が あってな。',
      'そこだけ「#DIV/0!」という 不気味な 文字が 出る。魔王の 呪いか？',
    ],
    task: ['C2:C5 に、1人あたりの 食料（A ÷ B）を 出そう', '人数が 0 で 割れない 行は「-」と 出す（IFERROR）'],
    grid: () => makeGrid(6, 3, [['食料', '人数', '1人あたり'], ...SUPPLY], ['A1', 'B1', 'C1']),
    colWidths: [60, 60, 80],
    hints: [
      '#DIV/0! は「0 で 割った」という エラー。人数が 0 の 行で 出る。呪いでは ない。',
      'IFERROR(計算, エラーの ときの 値) で 包めば、エラーの ときだけ「-」に できる。',
      'C2 に =IFERROR(A2/B2,"-") → C5 まで オートフィル。',
    ],
    check: (c) => first(...SUPPLY.map(([a, b], i) => divOrDash(c, `C${i + 2}`, b === 0 ? '-' : a / b)), needErrFix(c, SUPPLY.map((_, i) => `C${i + 2}`))),
    reward: { exp: 420, gold: 400, skill: 'diverr' },
    thanks: [
      '30、-、20、-……。不気味な 文字が 消えた！',
      '#DIV/0! は 0 で 割った 合図だったのか。呪いじゃ なかったんだな。',
      'エラーが 出たら、まず その 意味を 読む。戦いと 同じだ。',
    ],
  },

  err_value: {
    id: 'err_value',
    town: 'hope',
    npc: '見張り番ミハル',
    title: '見張りの合計',
    intro: [
      '見張り番の ミハルです。今週 見つけた 魔物の 数を 合計しているのですが……。',
      'B7 に =B2+B3+B4+B5+B6 と 書いたら「#VALUE!」に なって しまいました。',
      '「休み」の 日が あるからでしょうか……？',
    ],
    task: ['B7 の 式を 直して、魔物の 数の 合計を 出そう', '+ で 足すと、文字（休み）が まざって #VALUE! に なる。SUM は 文字を 飛ばして 足す'],
    grid: () => {
      const g = makeGrid(8, 2, [['曜日', '魔物の数'], ...WATCH, ['合計']], ['A1', 'B1', 'A7'])
      g[6][1].raw = '=B2+B3+B4+B5+B6'
      return g
    },
    colWidths: [60, 80],
    hints: [
      '#VALUE! は「計算できない 種類の 値（文字など）が まざっている」という エラー。',
      '+ は 1つずつ 足すので、「休み」を 足そうとして 失敗する。SUM なら 数だけを 足してくれる。',
      'B7 を =SUM(B2:B6) に 書きかえる。',
    ],
    check: (c) => expectNum(c, 'B7', WATCH.reduce((a, [, v]) => a + (typeof v === 'number' ? v : 0), 0), 'SUM'),
    reward: { exp: 420, gold: 400, skill: 'valueerr' },
    thanks: [
      '合計 36 体……！ 「休み」の 日は ちゃんと 飛ばされて いますね。',
      '+ は 文字に つまずく けど、SUM は 数だけを 拾う。使い分けが 大事なんですね。',
      'これで 魔物の 動きを 正しく 報告できます。',
    ],
  },

  err_name: {
    id: 'err_name',
    town: 'hope',
    npc: '書記兵カクミス',
    title: '書き損じの式',
    intro: [
      '書記兵の カクミスです……。',
      '訓練の 点数表を 作ったのですが、D2 も D3 も「#NAME?」に なって しまって。',
      '自分で 書いた 式なのに、どこが 間違って いるのか わからないんです。',
    ],
    task: ['D2 の 式を 直して、点数の 合計を 出そう（今は =SUMM(A2:A5)）', 'D3 の 式を 直して、A2 が 60以上なら「OK」、それ以外は「NG」と 出そう（今は =IF(A2>=60,OK,NG)）'],
    grid: () => {
      const g = makeGrid(6, 4, [['点数', '', '', ''], ...SCRIBE_SCORES.map((v, i) => [v, '', i === 0 ? '合計' : i === 1 ? '判定' : ''])], ['A1', 'C2', 'C3'])
      g[1][3].raw = '=SUMM(A2:A5)'
      g[2][3].raw = '=IF(A2>=60,OK,NG)'
      return g
    },
    colWidths: [60, 20, 50, 80],
    hints: [
      '#NAME? は「その 名前を 知らない」という エラー。関数名の 打ちまちがいや、" を 付け忘れた 文字で 出る。',
      'D2 は SUMM ではなく SUM。D3 は 文字の OK・NG を " で 囲む。',
      'D2 に =SUM(A2:A5)、D3 に =IF(A2>=60,"OK","NG")。',
    ],
    check: (c) => first(expectNum(c, 'D2', SCRIBE_SCORES.reduce((a, b) => a + b, 0), 'SUM'), expectVal(c, 'D3', SCRIBE_SCORES[0] >= 60 ? 'OK' : 'NG', 'IF')),
    reward: { exp: 430, gold: 410, skill: 'nameerr' },
    thanks: [
      '合計 279、判定は「OK」……！ ちゃんと 出ました！',
      '#NAME? が 出たら、関数名の つづりと、" の 付け忘れを 確かめる。覚えました！',
      'わたしの 書き損じ、魔王の せいに しないで よかった……。',
    ],
  },

  err_ref: {
    id: 'err_ref',
    town: 'hope',
    npc: '地図係ツナギ',
    title: '消えた参照',
    intro: [
      '地図係の ツナギよ。道ごとの 通行税を 計算してたの。',
      '税率を 書いた 列を うっかり 消したら、式が ぜんぶ「#REF!」に なっちゃって……。',
      '税率は E1 に 書き直したわ。式を どう 直せば いいかしら？',
    ],
    task: ['C2:C5 の 式を 直して、通行料（B列）× 税率（E1）を 出そう', '1つ 直して 下へ コピー。税率の セルは $ で 固定'],
    grid: () => {
      const g = makeGrid(6, 5, [['道', '通行料', '税', '税率', RATE_F], ...MAP_COST.map((v, i) => [`${['北', '東', '南', '西'][i]}の道`, v])], ['A1', 'B1', 'C1', 'D1'])
      for (let i = 0; i < MAP_COST.length; i++) g[i + 1][2].raw = `=B${i + 2}*#REF!`
      return g
    },
    colWidths: [70, 60, 60, 50, 50],
    hints: [
      '#REF! は「参照先の セルが 消えた」という エラー。行や 列を 削除すると 出る。',
      '消えた 参照を、新しい 税率の セル E1 に 付けかえる。コピーするので $E$1。',
      'C2 に =B2*$E$1 → C5 まで オートフィル。',
    ],
    check: (c) => first(...MAP_COST.map((v, i) => expectNum(c, `C${i + 2}`, v * RATE_F, 'formula'))),
    reward: { exp: 440, gold: 420, skill: 'referr' },
    thanks: [
      '30、45、12、80……税が ちゃんと 出たわ！',
      '#REF! は「行き先が 消えた」合図。消す 前に、その セルを 使っている 式が ないか 確かめるのね。',
      'ふう、地図の 帳面が 元どおりに なったわ。',
    ],
  },

  err_report: {
    id: 'err_report',
    town: 'hope',
    npc: '兵站長マトメ',
    title: '出陣前の兵糧',
    intro: [
      '兵站長の マトメだ。魔王城へ 出陣する 前に、部隊ごとの 兵糧を 確かめたい。',
      '記録は バラバラ。北隊・南隊・西隊の 合計を 出して、100袋 以上 あれば「十分」、なければ「不足」と 判定したい。',
      'ピボリアや イフポートで 覚えた 魔法を、組み合わせて くれないか。',
    ],
    task: ['F2:F4 に、部隊（E列）ごとの 兵糧の 合計を 出そう（SUMIFS、範囲は $ で 固定）', 'G2:G4 に、100 以上なら「十分」、それ以外は「不足」と 出そう'],
    grid: () => makeGrid(10, 7, [['部隊', '品', '袋', '', '部隊', '合計', '判定'], ...UNITS.map((r, i) => [...r, '', UNIT_NAMES[i] ?? ''])], ['A1', 'B1', 'C1', 'E1', 'F1', 'G1']),
    colWidths: [50, 50, 40, 20, 50, 50, 50],
    hints: [
      '合計は =SUMIFS(合計する範囲, 条件の範囲, 条件)。条件は E2 の 部隊名。',
      '下へ コピーするので 記録の 範囲は $ で 固定。=SUMIFS($C$2:$C$9,$A$2:$A$9,E2)',
      '判定は =IF(F2>=100,"十分","不足")。どちらも 4行目まで オートフィル。',
    ],
    check: (c) =>
      first(
        ...UNIT_NAMES.map((u, i) => expectNum(c, `F${i + 2}`, sumIf(UNITS, ([a]) => a === u, (r) => r[2]), 'SUMIFS')),
        eachVal(c, UNIT_NAMES.map((u, i) => [`G${i + 2}`, sumIf(UNITS, ([a]) => a === u, (r) => r[2]) >= 100 ? '十分' : '不足']), 'IF'),
      ),
    reward: { exp: 460, gold: 440, skill: 'combine' },
    thanks: [
      '北隊 120、南隊 75、西隊 110。南隊が「不足」か……すぐに 補給を 回そう。',
      '集計して、判定する。2つの 魔法を 組み合わせれば、報告書が 一瞬で できあがる。',
      'これで 出陣できる。ありがとう、旅の者。',
    ],
  },

  err_final: {
    id: 'err_final',
    town: 'hope',
    npc: '砦の長ガンバル',
    title: '出陣の号令',
    intro: [
      '砦の長、ガンバルだ。7つの 町を 救った 噂は、ここまで 届いて おる。',
      '最後に 頼みが ある。出陣の 号令を、名簿から 自動で 作りたいのだ。',
      '総勢 何名かを 計算して、「総勢 ○ 名、出陣！」と 1つの 文に したい。人数が 変わっても、文が 自動で 変わるように な。',
    ],
    task: ['B6 に、人数の 合計を 出そう', 'A8 に、「総勢 」と B6 と「 名、出陣!」を つないだ 文を 作ろう'],
    grid: () => makeGrid(9, 2, [['部隊', '人数'], ...ROSTER, ['合計'], [], ['']], ['A1', 'B1', 'A6']),
    colWidths: [180, 60],
    hints: [
      '合計は =SUM(B2:B5)。',
      '文字と 数も「&」で つなげる。文字の 部分は " で 囲む。空白も 文字の うち。',
      'A8 に ="総勢 "&B6&" 名、出陣!"',
    ],
    check: (c) => {
      const total = ROSTER.reduce((a, [, v]) => a + v, 0)
      return first(expectNum(c, 'B6', total, 'SUM'), expectVal(c, 'A8', `総勢 ${total} 名、出陣!`), needJoin(c, ['A8']))
    },
    reward: { exp: 500, gold: 500, skill: 'message' },
    thanks: [
      '「総勢 120 名、出陣!」……うむ、見事な 号令だ！',
      '数を 計算して、文に 組みこむ。これまでの 力が、すべて つながったな。',
      '魔王レフエラーの 城は、北の 結界の 向こうだ。どうか……この 世界の「時間」を 取り戻して くれ。',
    ],
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 魔王城の扉（謎解き）
const RATIONS: [number, number][] = [
  [50, 5],
  [40, 0],
  [36, 4],
]
const CASTLE_PRICES: [string, number][] = [
  ['剣', 120],
  ['盾', 80],
  ['薬', 15],
]
const CASTLE_ORDERS: [string, number][] = [
  ['盾', 2],
  ['薬', 5],
  ['剣', 1],
]
const SEALS: [string, number][] = [
  ['表の封印', 12],
  ['計算の封印', 18],
  ['参照の封印', 9],
  ['条件の封印', 15],
  ['検索の封印', 21],
  ['集計の封印', 14],
  ['文字の封印', 11],
]

Object.assign(QUESTS, {
  cst_iferror: {
    id: 'cst_iferror',
    kind: 'puzzle',
    town: 'castle',
    npc: '割れぬ扉',
    title: '割れぬ扉',
    intro: ['扉に「÷」の 紋章と 数字が 刻まれている。', '「割れるものは 割り、割れぬものには 0 を 刻め。1つの 式を すべてに 映せ」――と 読める。'],
    task: ['C2:C4 に、A ÷ B を 示せ。割れない（0 で 割る）ときは 0'],
    grid: () => makeGrid(5, 3, [['数', '割る数', '答え'], ...RATIONS]),
    colWidths: [50, 60, 60],
    hints: [],
    check: (c) => first(...RATIONS.map(([a, b], i) => expectNum(c, `C${i + 2}`, b === 0 ? 0 : a / b, 'IFERROR', `C${i + 2}`, true))),
    reward: { exp: 200, gold: 0 },
    thanks: ['3つの 答えが 光り、扉の 紋章が 割れた！'],
  },
  cst_lookup: {
    id: 'cst_lookup',
    kind: 'puzzle',
    town: 'castle',
    npc: '代価の扉',
    title: '代価の扉',
    intro: ['扉に 品の 値段表と、注文の 帳面が 刻まれている。', '「品の 値を 表より 引き、数を 掛けて 代価を 示せ。1つの 式を すべてに 映せ」――と 読める。'],
    task: ['C2:C4 に、品（A列）の 値段を 表（E2:F4）から 引いて、数（B列）を 掛けた 代価を 示せ'],
    grid: () => makeGrid(5, 6, [['品', '数', '代価', '', '品', '値段'], ...CASTLE_ORDERS.map((r, i) => [...r, '', '', ...(CASTLE_PRICES[i] ?? [])])]),
    colWidths: [40, 40, 60, 20, 40, 50],
    hints: [],
    check: (c) => first(...CASTLE_ORDERS.map(([k, n], i) => expectNum(c, `C${i + 2}`, CASTLE_PRICES.find(([p]) => p === k)![1] * n, 'XLOOKUP', `C${i + 2}`, true))),
    reward: { exp: 220, gold: 0 },
    thanks: ['代価の 数字が 天秤に 乗り、重い 扉が 開いた！'],
  },
  cst_seals: {
    id: 'cst_seals',
    kind: 'puzzle',
    town: 'castle',
    npc: '七つの封印',
    title: '七つの封印',
    intro: ['玉座の間へ 続く 最後の 扉。7つの 封印が 刻まれている。', '「七つの 力の 和が 百に 届くならば『ヒラケ』、届かぬならば『トジヨ』と 刻め」――と 読める。'],
    task: ['B9 に、7つの 力（B2:B8）の 合計が 100 以上なら「ヒラケ」、それ以外は「トジヨ」と 示せ'],
    grid: () => makeGrid(10, 2, [['封印', '力'], ...SEALS, ['命令']]),
    colWidths: [110, 70],
    hints: [],
    check: (c) => expectVal(c, 'B9', SEALS.reduce((a, [, v]) => a + v, 0) >= 100 ? 'ヒラケ' : 'トジヨ', 'IF', true),
    reward: { exp: 260, gold: 0 },
    thanks: ['7つの 封印が 次々と 光を 放ち、玉座の間への 扉が 開いた……！'],
  },
} satisfies Record<string, QuestDef>)

export const townQuests = (town: string) => Object.values(QUESTS).filter((q) => q.town === town)
