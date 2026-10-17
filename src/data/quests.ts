import { formatValue, makeGrid, parseAddr, usesFn, type Grid, type Value } from '../game/formula'
import type { ItemId } from '../game/types'
import { tr, tra } from '../game/lang'

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
  /**
   * 町の 代表の 依頼のように「町で 最後の 悩み」として 話す 依頼。
   * ほかの 悩みが まだ 残っている ときは、intro の 先頭と thanks の 末尾を これに 差しかえる
   */
  notLast?: { introHead: string[]; thanksTail: string[] }
}

/** 町の ほかの 悩みが すべて 解決ずみか（この 依頼が 最後の 1つか） */
export const isLastInTown = (q: QuestDef, solved: string[]) => townQuests(q.town).every((x) => x.id === q.id || solved.includes(x.id))

/** 話す 順番に 合わせた 依頼の 前置き・お礼（ほかの 悩みが 残っていれば notLast を 使う） */
export function questLines(q: QuestDef, solved: string[]) {
  if (!q.notLast || isLastInTown(q, solved)) return { intro: q.intro, thanks: q.thanks }
  const { introHead, thanksTail } = q.notLast
  return {
    intro: [...introHead, ...q.intro.slice(introHead.length)],
    thanks: [...q.thanks.slice(0, q.thanks.length - thanksTail.length), ...thanksTail],
  }
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

const BAD_OP = tr('「≧ ≦ ≠」は 数式では 使えない。以上は >=、以下は <=、等しくないは <> と 書こう。', "You can't use ≧ ≦ ≠ in formulas. Write >= for at least, <= for at most, and <> for not equal.")

/** 数値の期待値チェック。数式必須なら mustUse を指定 */
/** vague=true は 謎解き用（解き方の名前を 出さない） */
function expectNum(ctx: CheckCtx, a: string, n: number, mustUse?: string, label = a, vague = false): string | null {
  const v = ctx.v(a)
  const raw = ctx.raw(a)
  if (raw === '') return tr(`${label} がまだ空っぽだ。`, `${label} is still empty.`)
  if (/[≧≦≠]/.test(raw)) return BAD_OP
  if (typeof v === 'object' && v !== null) return tr(`${label} が エラー（${v.error}）になっている。数式を見直そう。`, `${label} shows an error (${v.error}). Check the formula.`)
  if (!isN(v, n)) return tr(`${label} の値（${v}）が正しくないようだ。`, `The value in ${label} (${v}) doesn't look right.`)
  if (mustUse === 'formula' && !raw.startsWith('='))
    return vague
      ? tr(`${label} の値は 合っているが……扉は 反応しない。数字を そのまま 書いただけでは ダメなようだ。`, `The value in ${label} is right, but... the door doesn't react. Just writing the number won't do.`)
      : tr(`${label} は値は合っているけど、数式ではなく直接入力されている。数式で計算しよう。`, `${label} has the right value, but it was typed in directly. Calculate it with a formula.`)
  if (mustUse && mustUse !== 'formula' && !usesFn(raw, mustUse))
    return vague
      ? tr(`${label} の値は 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。`, `The value in ${label} is right, but... the door doesn't react. There seems to be a rule about how to get it.`)
      : tr(`${label} は値は合っている！ でも ${mustUse} 関数を使って求めてみよう。`, `${label} has the right value! But try using the ${mustUse} function.`)
  return null
}
/** 謎解き用の判定（ヒントなし） */
const pz = (c: CheckCtx, a: string, n: number, mustUse?: string) => expectNum(c, a, n, mustUse, a, true)

const first = (...xs: (string | null)[]) => xs.find((x) => x !== null) ?? null

// ---------------------------------------------------------------- セルノ
const SALES = [1200, 980, 1540, 1320, 870, 2010, 1780, 1100, 1450, 1630]
const SCORES: [string, number][] = tra<[string, number][]>(
  [
    ['プルお', 72],
    ['タケ吉', 85],
    ['ゴレム', 60],
    ['キメリ', 94],
    ['ベホマ', 78],
    ['ピカ坊', 100],
    ['ヒラリン', 66],
    ['ぶちスラ', 81],
  ],
  [
    ['Puruo', 72],
    ['Takekichi', 85],
    ['Golemu', 60],
    ['Kimeri', 94],
    ['Behoma', 78],
    ['Pikabo', 100],
    ['Hirarin', 66],
    ['Buchisura', 81],
  ],
)
const FISH_DAYS = tra(['月', '火', '水', '木', '金', '土', '日'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const FISH: [string, number][] = [23, 41, 17, 35, 52, 28, 39].map((n, i) => [FISH_DAYS[i], n])
const CLOSED = tr('休み', 'Closed')
const GUESTS: (number | string)[] = [5, 8, CLOSED, 6, '', 9, CLOSED, 4, 7, 3]
const TAX = tra<(string | number)[][]>(
  [
    ['店', '1月', '2月', '3月', '合計'],
    ['武器屋', 320, 410, 380, ''],
    ['パン屋', 150, 170, 160, ''],
    ['宿屋', 240, 220, 300, ''],
    ['合計', '', '', '', ''],
  ],
  [
    ['Shop', 'Jan', 'Feb', 'Mar', 'Total'],
    ['Weapons', 320, 410, 380, ''],
    ['Bakery', 150, 170, 160, ''],
    ['Inn', 240, 220, 300, ''],
    ['Total', '', '', '', ''],
  ],
)
/** 月の 名前（暦の 依頼） */
const MONTHS = tra(
  Array.from({ length: 12 }, (_, i) => `${i + 1}月`),
  ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
)
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0)

export const QUESTS: Record<string, QuestDef> = {
  celuno_input: {
    id: 'celuno_input',
    town: 'celuno',
    npc: '羊飼いのメェル',
    title: tr('ヒツジの記録', 'Sheep Log'),
    intro: tra([
      'メェ〜……あっ、ごめんなさい。ヒツジと しゃべりすぎて、口ぐせが うつっちゃって。',
      '羊飼いのメェルです。毎日 ヒツジの数を「表」に記録してるんだけど、呪いのせいで 今日の分が 書き込めないの。',
      '今日数えたのは 朝12頭、昼8頭、夕方15頭。かわりに 入力してくれる？ ……メェ。',
    ], [
      'Baa... oh, sorry. I talk to my sheep so much that I picked up their way of talking.',
      'I\'m Meel the shepherd. I record how many sheep I have in a table every day, but because of the curse, I can\'t enter today\'s numbers.',
      'Today I counted 12 in the morning, 8 at noon, and 15 in the evening. Could you enter them for me? ...Baa.',
    ]),
    task: tra(['B2 に 12、B3 に 8、B4 に 15 を入力しよう', 'セルをクリック → 数字を打つ → Enter で確定（下のセルへ移動）'], [
      'Enter 12 in B2, 8 in B3, and 15 in B4',
      'Click a cell → type the number → press Enter to confirm (you move to the cell below)',
    ]),
    grid: () =>
      makeGrid(6, 4, tra([['時間帯', 'ヒツジの数'], ['朝'], ['昼'], ['夕方']], [['Time', 'Sheep'], ['Morning'], ['Noon'], ['Evening']])),
    colWidths: [80, 110],
    hints: tra([
      '入力したいセルを クリックして選ぼう。',
      '数字を打ったら Enter で確定。自動で1つ下のセルに移るよ。',
      'B2をクリック → 12 → Enter → 8 → Enter → 15 → Enter',
    ], [
      'Click the cell you want to fill in to select it.',
      'After typing a number, press Enter to confirm. You automatically move down one cell.',
      'Click B2 → 12 → Enter → 8 → Enter → 15 → Enter',
    ]),
    check: (c) => first(expectNum(c, 'B2', 12), expectNum(c, 'B3', 8), expectNum(c, 'B4', 15)),
    reward: { exp: 20, gold: 20, skill: 'input' },
    thanks: tra(['わぁ、ありがとメェ〜！ ……あ、また言っちゃった。', '表に入れておけば、あとで合計も 平均も 一瞬で出せるんだって。ヒツジたちも 喜んでるよ。'], [
      'Yay, thank you, baa~! ...Oops, there I go again.',
      'They say once it\'s in a table, you can get the total and the average in an instant. My sheep are happy too.',
    ]),
  },

  celuno_fix: {
    id: 'celuno_fix',
    town: 'celuno',
    npc: '道具屋のリコ',
    title: tr('値札の修正', 'Fix the Price List'),
    intro: tra([
      'いらっしゃいませーっ！ ……って、お客さんじゃないの？ でも ちょうどいいわ！',
      'うちの値札表、呪いで めちゃくちゃなの！ やくそうが 80ゴールドって、ぼったくりじゃない！',
      'しかも「どうのつるぎ」が「どうのつるき」になってるし！ 正しくは やくそう 8ゴールド、名前は どうのつるぎ。直してくれる？',
    ], [
      'Welcome! ...Oh, you\'re not a customer? Well, good timing anyway!',
      'The curse scrambled my price list! A Herb for 80 gold? That\'s highway robbery!',
      'And "Copper Sword" is spelled "Copper Swrod"! It should be Herb for 8 gold, and the name is Copper Sword. Can you fix it?',
    ]),
    task: tra(['B3 の 80 を 8 に直そう（選んでそのまま入力＝上書き）', 'A4 を「どうのつるぎ」に直そう（F2 かダブルクリックで一部だけ修正）'], [
      'Change the 80 in B3 to 8 (select it and just type = overwrite)',
      'Fix A4 to say "Copper Sword" (press F2 or double-click to edit just part of it)',
    ]),
    grid: () =>
      makeGrid(
        7,
        3,
        tra<(string | number)[][]>(
          [
            ['しなもの', 'ねだん'],
            ['こんぼう', 30],
            ['やくそう', 80],
            ['どうのつるき', 100],
            ['たびびとのふく', 70],
          ],
          [
            ['Item', 'Price'],
            ['Club', 30],
            ['Herb', 80],
            ['Copper Swrod', 100],
            ["Traveler's Clothes", 70],
          ],
        ),
      ),
    colWidths: [140, 80],
    hints: tra([
      'セルを選んで そのまま入力すると、中身がまるごと上書きされるよ。',
      '文字の一部だけ直したいときは、F2キー（またはダブルクリック）で編集モードに入ろう。',
      'A4 をダブルクリック → 最後の「き」を消して「ぎ」 → Enter',
    ], [
      'If you select a cell and just start typing, its contents are completely overwritten.',
      'To fix only part of the text, press F2 (or double-click) to enter edit mode.',
      'Double-click A4 → change "Swrod" to "Sword" → Enter',
    ]),
    check: (c) =>
      first(
        expectNum(c, 'B3', 8),
        c.raw('A4').trim() === tr('どうのつるぎ', 'Copper Sword') ? null : tr('A4 がまだ「どうのつるぎ」になっていない。', 'A4 doesn\'t say "Copper Sword" yet.'),
      ),
    reward: { exp: 20, gold: 20, skill: 'edit' },
    thanks: tra(['カンペキ！ これで「信用第一のリコ商店」に 元どおりね！', '今度 お店に来たら、ちょっとだけ おまけしちゃうかも？ ふふっ。'], [
      'Perfect! Now "Riko\'s Shop, Where Trust Comes First" is back to normal!',
      'Next time you visit, I might throw in a little something extra. Hehe.',
    ]),
  },

  celuno_copy: {
    id: 'celuno_copy',
    town: 'celuno',
    npc: '見張りのガード',
    title: tr('当番表の書き写し', 'Copy the Duty Roster'),
    intro: tra([
      'はっ！ 見張りのガードで あります！',
      '来週分の 見張り当番表を 書き写す任務を 命じられたので あります。しかし 一字一句 手で写すのは……正直、骨が折れるで あります！',
      '左の表（A1:B4）を、そっくりそのまま D1 から始まる場所に 写してほしいで あります！',
    ], [
      'Sir! Gard the watchman, reporting, sir!',
      'I\'ve been ordered to copy next week\'s watch roster. But copying it word for word by hand is... honestly, backbreaking work, sir!',
      'Please copy the table on the left (A1:B4) exactly as it is, starting at D1, sir!',
    ]),
    task: tra(['A1 から B4 までドラッグして範囲選択', 'Ctrl+C（Macは ⌘+C）でコピー', 'D1 を選んで Ctrl+V（⌘+V）で貼り付け'], [
      'Drag from A1 to B4 to select the range',
      'Press Ctrl+C (⌘+C on a Mac) to copy',
      'Select D1 and press Ctrl+V (⌘+V) to paste',
    ]),
    grid: () =>
      makeGrid(
        6,
        5,
        tra(
          [
            ['曜日', '当番'],
            ['月', 'ガード'],
            ['火', 'ラルク'],
            ['水', 'ミナ'],
          ],
          [
            ['Day', 'On Duty'],
            ['Mon', 'Gard'],
            ['Tue', 'Lark'],
            ['Wed', 'Mina'],
          ],
        ),
      ),
    colWidths: [60, 80, 30, 60, 80],
    hints: tra([
      'マウスで A1 から B4 までドラッグすると、四角く選べる。',
      '選んだまま Ctrl+C。点線で囲まれたらコピー完了。',
      'D1 をクリックして Ctrl+V。左上をD1に合わせて貼り付けられる。',
    ], [
      'Drag from A1 to B4 with the mouse to select a rectangle.',
      'With it selected, press Ctrl+C. When a dotted line surrounds it, it\'s copied.',
      'Click D1 and press Ctrl+V. It pastes with D1 as the top-left corner.',
    ]),
    check: (c) => {
      for (const [src, dst] of [
        ['A1', 'D1'], ['B1', 'E1'], ['A2', 'D2'], ['B2', 'E2'],
        ['A3', 'D3'], ['B3', 'E3'], ['A4', 'D4'], ['B4', 'E4'],
      ])
        if (c.raw(src) !== c.raw(dst)) return tr(`${dst} が ${src} と同じになっていない。`, `${dst} doesn't match ${src}.`)
      if (!c.actions.has('paste')) return tr('書き写せてはいるが……手で打ったで ありますな？ Ctrl+C → Ctrl+V で 頼むで あります！', "It's copied, but... you typed it by hand, didn't you, sir? Please use Ctrl+C → Ctrl+V, sir!")
      return null
    },
    reward: { exp: 25, gold: 25, skill: 'copy' },
    thanks: tra(['おおっ……一瞬で！ これが コピー＆貼り付けの魔法で ありますか！', '任務完了で あります！ 北の結界の 見張りに 戻るで あります！'], [
      'Whoa... in an instant! So this is the magic of copy and paste, sir!',
      'Mission complete, sir! Returning to my post watching the northern barrier, sir!',
    ]),
  },

  celuno_undo: {
    id: 'celuno_undo',
    town: 'celuno',
    npc: '書記のペン',
    title: tr('消えた税の記録', 'The Lost Tax Records'),
    intro: tra([
      'た、た、たいへんです！ む、村の 税の記録を……うっかり 消してしまいましたぁ！',
      'ちょ、長老さまに 知られたら……ぼ、ぼく、クビです……！',
      'た、旅の方！ なんとか 元に戻せませんか！？',
    ], [
      'Th-th-this is a disaster! I a-accidentally deleted the village tax records!',
      'I-if the Elder finds out... I-I\'ll be fired...!',
      'Tr-traveler! Is there any way to get them back?!',
    ]),
    task: tra(['Ctrl+Z（Macは ⌘+Z）で、直前の操作を元に戻そう'], ['Press Ctrl+Z (⌘+Z on a Mac) to undo the last action']),
    grid: () =>
      makeGrid(7, 2, tra([['名前', '税（G）'], ['メェル'], ['リコ'], ['ガード'], ['ペン']], [['Name', 'Tax (G)'], ['Meel'], ['Riko'], ['Gard'], ['Pen']])),
    history: () => [
      makeGrid(
        7,
        2,
        tra<(string | number)[][]>(
          [
            ['名前', '税（G）'],
            ['メェル', 12],
            ['リコ', 30],
            ['ガード', 25],
            ['ペン', 8],
          ],
          [
            ['Name', 'Tax (G)'],
            ['Meel', 12],
            ['Riko', 30],
            ['Gard', 25],
            ['Pen', 8],
          ],
        ),
      ),
    ],
    colWidths: [100, 90],
    hints: tra([
      '表計算ソフトには「さっきの操作を取り消す」魔法がある。',
      'キーボードの Ctrl を押しながら Z。Macなら ⌘ + Z。',
      'ツールバーの ↶ ボタンでも 元に戻せるよ。',
    ], [
      'Spreadsheets have a magic spell that cancels your last action.',
      'Hold Ctrl on the keyboard and press Z. On a Mac, ⌘ + Z.',
      'You can also undo with the ↶ button on the toolbar.',
    ]),
    check: (c) =>
      first(
        expectNum(c, 'B2', 12),
        expectNum(c, 'B3', 30),
        expectNum(c, 'B4', 25),
        expectNum(c, 'B5', 8),
        c.actions.has('undo') ? null : tr('数字は合っていますが……Ctrl+Z を使えば一瞬ですよ！', 'The numbers are right... but Ctrl+Z would do it in an instant!'),
      ),
    reward: { exp: 20, gold: 20, skill: 'undo', item: 'sandglass' },
    thanks: tra(['も、戻った……！ い、命拾いしました……！', 'お、お礼に この「Ctrl+Zのすなどけい」を どうぞ。戦いで ミスを 1回だけ なかったことに できますよ。'], [
      'Th-they\'re back...! You saved my life...!',
      'P-please take this "Ctrl+Z Hourglass" as thanks. In battle, it undoes one mistake.',
    ]),
  },

  celuno_fill: {
    id: 'celuno_fill',
    town: 'celuno',
    npc: '暦のおばば トキ',
    title: tr('来年の暦', 'Next Year\'s Calendar'),
    intro: tra([
      'ふぉっふぉ。わしは この村の 暦（こよみ）係じゃ。',
      '来年の暦表を作りたいのじゃが、1月から12月まで書くのも、番号をふるのも 骨が折れてのう。',
      '「オートフィル」という魔法があれば 一瞬なんじゃが……おぬし、使えるかの？',
    ], [
      'Ho ho. I\'m this village\'s calendar keeper.',
      'I want to make next year\'s calendar, but writing January through December and numbering everything is such a chore.',
      'If only I had the magic called "AutoFill," it would take no time at all... Can you use it, dearie?',
    ]),
    task: tra([
      'A2:A3 を選んで、右下の■（フィルハンドル）を A13 までドラッグ → 1〜12 の連番に',
      'B2 を選んで、■を B13 までドラッグ → 1月〜12月に',
    ], [
      'Select A2:A3 and drag the ■ at the bottom right (the fill handle) down to A13 → numbers 1 to 12',
      'Select B2 and drag the ■ down to B13 → Jan to Dec',
    ]),
    grid: () => makeGrid(15, 3, tra<(string | number)[][]>([['No', '月', '行事'], [1, '1月', '新年祭'], [2]], [['No', 'Month', 'Event'], [1, 'Jan', 'New Year Fest'], [2]])),
    colWidths: [50, 70, 110],
    hints: tra([
      '選んだ範囲の右下にある 小さな■が「フィルハンドル」じゃ。',
      '数字は 2つ並べて選んでからドラッグすると、差の分だけ増える連番になる。1つだけだと ただのコピーじゃ。',
      '「1月」のような文字は、1つ選んで ドラッグするだけで 2月、3月…と続いていくぞい。',
    ], [
      'The little ■ at the bottom right of a selection is the "fill handle."',
      'Select two numbers before you drag, and they count up by the difference. With just one, it only copies.',
      'Text like "Jan" continues Feb, Mar... just by selecting it and dragging, dearie.',
    ]),
    check: (c) => {
      for (let i = 1; i <= 12; i++) {
        const e = expectNum(c, `A${i + 1}`, i)
        if (e) return e
        if (c.raw(`B${i + 1}`) !== MONTHS[i - 1]) return tr(`B${i + 1} が「${i}月」になっていない。`, `B${i + 1} doesn't say "${MONTHS[i - 1]}" yet.`)
      }
      if (!c.actions.has('fill')) return tr('できておるが……手で打ったのう？ フィルハンドルを使ってみるのじゃ。', "It's done... but you typed it by hand, didn't you? Try using the fill handle, dearie.")
      return null
    },
    reward: { exp: 30, gold: 30, skill: 'autofill' },
    thanks: tra(['ほっほう！ 見事な暦じゃ。', '面倒な作業ほど、表計算に まかせるのが 賢い者のやり方じゃよ。'], [
      'Ho ho! What a splendid calendar.',
      'The more tedious the task, the wiser it is to leave it to the spreadsheet.',
    ]),
  },

  celuno_bold: {
    id: 'celuno_bold',
    town: 'celuno',
    npc: '看板職人ボルド',
    title: tr('見出しを目立たせろ', 'Make the Headings Stand Out'),
    intro: tra([
      'おう、あんちゃん。オレぁ 看板職人の ボルドってんだ。',
      '看板用の 品書きを 作ったんだがよ、「どこが見出しか わからねえ」って 言われちまってな。',
      '見出しの行（A1:C1）を 太字にして、ビシッと 目立たせてくんな！',
    ], [
      'Hey there, pal. Name\'s Bold. I make signs.',
      'I made a menu board for a sign, but folks say they can\'t tell where the headings are.',
      'Make the heading row (A1:C1) bold so it really pops!',
    ]),
    task: tra(['A1:C1 を範囲選択', 'Ctrl+B（⌘+B）か、ツールバーの［B］で太字に'], [
      'Select the range A1:C1',
      'Make it bold with Ctrl+B (⌘+B) or the [B] button on the toolbar',
    ]),
    grid: () =>
      makeGrid(
        6,
        3,
        tra<(string | number)[][]>(
          [
            ['品名', '値段', '在庫'],
            ['やくそう', 8, 20],
            ['どくけしそう', 10, 15],
            ['ワープのはね', 25, 5],
          ],
          [
            ['Item', 'Price', 'Stock'],
            ['Herb', 8, 20],
            ['Antidote', 10, 15],
            ['Warp Wing', 25, 5],
          ],
        ),
      ),
    colWidths: [130, 70, 70],
    hints: tra(['A1 から C1 まで ドラッグして選ぼう。', 'Ctrl を押しながら B（Bold＝太字）。もう一度押すと元に戻る。'], [
      'Drag from A1 to C1 to select it.',
      'Hold Ctrl and press B (B for Bold). Press it again to undo it.',
    ]),
    check: (c) =>
      ['A1', 'B1', 'C1'].every((a) => c.bold(a)) ? null : tr('見出し（A1:C1）が まだ全部 太字になっていない。', "The headings (A1:C1) aren't all bold yet."),
    reward: { exp: 20, gold: 20, skill: 'bold' },
    thanks: tra(['てやんでえ、見違えたぜ！', '見た目も 立派な「伝わる力」よ。あんちゃん、いい仕事するじゃねえか。'], [
      'Well, I\'ll be! Looks like a whole new board!',
      'Looks are part of getting the message across. You do good work, pal.',
    ]),
  },

  // ---------------------------------------------------------------- カルキュレ
  calc_arith: {
    id: 'calc_arith',
    town: 'calculet',
    npc: '武器屋ガンテツ',
    title: tr('注文書の小計', 'Order Form Subtotals'),
    intro: tra([
      'へいらっしゃい！……と言いてえところだが、注文書の計算が 合わねえんだ。',
      '単価×数量で 小計を出したいんだが、手で計算したら 全部まちがえちまってな。',
      'D列に「=B2*C2」みてえな 数式を入れて、D5まで 出してくれ！',
    ], [
      'Welcome! ...is what I\'d like to say, but the math on my order form doesn\'t add up.',
      'I want subtotals from price × quantity, but I worked them out by hand and got every one wrong.',
      'Put a formula like "=B2*C2" in column D and fill it down to D5!',
    ]),
    task: tra(['D2 に =B2*C2 と入力（掛け算は *）', 'D2 を選んで、フィルハンドルで D5 までオートフィル'], [
      'Enter =B2*C2 in D2 (multiply with *)',
      'Select D2 and AutoFill down to D5 with the fill handle',
    ]),
    grid: () =>
      makeGrid(
        7,
        4,
        tra<(string | number)[][]>(
          [
            ['品名', '単価', '数量', '小計'],
            ['どうのつるぎ', 100, 3],
            ['かわのたて', 70, 2],
            ['てつのかぶと', 180, 1],
            ['せいなるナイフ', 200, 4],
          ],
          [
            ['Item', 'Price', 'Qty', 'Subtotal'],
            ['Copper Sword', 100, 3],
            ['Leather Shield', 70, 2],
            ['Iron Helm', 180, 1],
            ['Holy Knife', 200, 4],
          ],
        ),
      ),
    colWidths: [130, 70, 60, 80],
    hints: tra([
      '数式は「=」から始めるのが ルールだ。',
      '掛け算は × じゃなくて *（アスタリスク）。割り算は /。',
      'D2 に =B2*C2 → Enter。D2を選んで 右下の■を D5 まで引っぱると、B3*C3… と自動でずれてくれる。',
    ], [
      'Formulas always start with "=". That\'s the rule.',
      'Multiply with * (an asterisk), not ×. Divide with /.',
      'Type =B2*C2 in D2 → Enter. Select D2 and drag the ■ at its bottom right down to D5, and it shifts to B3*C3... automatically.',
    ]),
    check: (c) =>
      first(
        expectNum(c, 'D2', 300, 'formula'),
        expectNum(c, 'D3', 140, 'formula'),
        expectNum(c, 'D4', 180, 'formula'),
        expectNum(c, 'D5', 800, 'formula'),
      ),
    reward: { exp: 30, gold: 30, skill: 'arith' },
    thanks: tra(['すげえ！ 数字を変えても 小計が勝手に変わるじゃねえか！', 'これが「数式」ってやつか。もう そろばんは いらねえな。'], [
      'Amazing! Change the numbers and the subtotals update by themselves!',
      'So this is a "formula." Guess I don\'t need my abacus anymore.',
    ]),
  },

  calc_sum: {
    id: 'calc_sum',
    town: 'calculet',
    npc: 'パン屋のマーサ',
    title: tr('売上の合計', 'Total Sales'),
    intro: tra([
      'いらっしゃい。……ごめんね、ちょっと 疲れてて。',
      '毎晩 10日分の売上を そろばんで足してたら、腰を痛めちゃってねぇ。',
      'B12 に 売上の合計を 出してくれないかい？',
    ], [
      'Welcome. ...Sorry, I\'m a little tired.',
      'Every night I add up ten days of sales on my abacus, and I\'ve hurt my back doing it.',
      'Could you put the sales total in B12 for me?',
    ]),
    task: tra(['B12 に =SUM(B2:B11) を入れて合計を出そう', '「=SUM(」まで打ったら、B2:B11 をドラッグで指定してもOK'], [
      'Put =SUM(B2:B11) in B12 to get the total',
      'After typing "=SUM(", you can also drag across B2:B11 to fill in the range',
    ]),
    grid: () =>
      makeGrid(13, 2, [tra(['日付', '売上（G）'], ['Date', 'Sales (G)']), ...SALES.map((s, i) => [tr(`${i + 1}日`, `Day ${i + 1}`), s]), [tr('合計', 'Total')]]),
    colWidths: [70, 100],
    hints: tra([
      '「=SUM(」と打ってから、合計したい範囲を マウスでドラッグすると 自動で入るよ。',
      '範囲は「始まりのセル:終わりのセル」と書くの。例：B2:B11',
      'B12 に =SUM(B2:B11) → Enter',
    ], [
      'Type "=SUM(" and then drag across the range you want to add up. It fills in automatically.',
      'A range is written as "first cell:last cell." For example, B2:B11',
      'Type =SUM(B2:B11) in B12 → Enter',
    ]),
    check: (c) => expectNum(c, 'B12', sum(SALES), 'SUM'),
    reward: { exp: 30, gold: 30, skill: 'SUM' },
    thanks: tra(['まあ！ 一瞬で合計が！', 'これなら 来月も 数字を入れるだけで いいのね。お礼に 焼きたてのパンを どうぞ。'], [
      'My! The total in an instant!',
      'Next month I just have to enter the numbers. Please, take some freshly baked bread as thanks.',
    ]),
  },

  calc_average: {
    id: 'calc_average',
    town: 'calculet',
    npc: '先生ミネルバ',
    title: tr('テストの平均点', 'Test Average'),
    intro: tra([
      'ごきげんよう。わたくし、この町の モンスター学校で 教えております ミネルバですわ。',
      'テストの平均点を 出したいのですけれど、足して 人数で割って……と やっているうちに 計算ミスばかり。',
      'B10 に 平均点を 出していただけるかしら？',
    ], [
      'Good day. I am Minerva, and I teach at this town\'s Monster School.',
      'I\'d like the average test score, but adding it all up and dividing by the number of students, I keep making mistakes.',
      'Would you be so kind as to put the average in B10?',
    ]),
    task: tra(['B10 に AVERAGE関数で 平均点を出そう（=AVERAGE(範囲)）'], [
      'Find the average score in B10 with the AVERAGE function (=AVERAGE(range))',
    ]),
    grid: () => makeGrid(11, 2, [tra(['生徒', '点数'], ['Student', 'Score']), ...SCORES, [tr('平均', 'Average')]]),
    colWidths: [100, 70],
    hints: tra([
      '平均を出す関数は AVERAGE（アベレージ）。',
      '範囲は 点数の入っている B2:B9。',
      'B10 に =AVERAGE(B2:B9)',
    ], [
      'The function for an average is AVERAGE.',
      'The range is B2:B9, where the scores are.',
      'Type =AVERAGE(B2:B9) in B10',
    ]),
    check: (c) => expectNum(c, 'B10', sum(SCORES.map((s) => s[1])) / SCORES.length, 'AVERAGE'),
    reward: { exp: 30, gold: 30, skill: 'AVERAGE' },
    thanks: tra(['79.5点……なるほど、ですわ。', '生徒が増えても 範囲を広げるだけ。人数で割る必要も ありませんのね。素晴らしいですわ。'], [
      '79.5 points... I see.',
      'Even with more students, I just widen the range. No need to divide by the head count myself. Marvelous.',
    ]),
  },

  calc_maxmin: {
    id: 'calc_maxmin',
    town: 'calculet',
    npc: '漁師ナミオ',
    title: tr('釣果の記録', 'Fishing Log'),
    intro: tra([
      'おう、旅の人。オラは 漁師の ナミオだべ。',
      '今週 いちばん釣れた日と、いちばん釣れなかった日の 数を 知りてえんだ。',
      '目で探してたら 日が暮れちまうべ。なんとか ならねえか？',
    ], [
      'Howdy, traveler. I\'m Namio, a fisherman.',
      'I wanna know my best day and my worst day of fishing this week.',
      'Huntin\' for \'em by eye would take till sundown. Can ya help?',
    ]),
    task: tra(['E2 に MAX関数で 一番多い釣果を', 'E3 に MIN関数で 一番少ない釣果を'], [
      'Find the biggest catch in E2 with the MAX function',
      'Find the smallest catch in E3 with the MIN function',
    ]),
    grid: () =>
      makeGrid(10, 5, [
        tra(['曜日', '釣果（匹）'], ['Day', 'Catch']),
        [FISH[0][0], FISH[0][1], '', tr('最大', 'Max')],
        [FISH[1][0], FISH[1][1], '', tr('最小', 'Min')],
        ...FISH.slice(2),
      ]),
    colWidths: [60, 90, 30, 60, 70],
    hints: tra(['最大は MAX、最小は MIN。', '範囲は B2:B8。', 'E2 に =MAX(B2:B8)、E3 に =MIN(B2:B8)'], [
      'MAX for the largest, MIN for the smallest.',
      'The range is B2:B8.',
      'Type =MAX(B2:B8) in E2 and =MIN(B2:B8) in E3',
    ]),
    check: (c) => first(expectNum(c, 'E2', 52, 'MAX'), expectNum(c, 'E3', 17, 'MIN')),
    reward: { exp: 30, gold: 30, skill: 'MAXMIN' },
    thanks: tra(['金曜が52匹、水曜が17匹だべか！', '来週は 水曜に 休むとするべ。がっはっは！'], [
      '52 on Friday and 17 on Wednesday, huh!',
      'Guess I\'ll take Wednesdays off next week. Ha ha ha!',
    ]),
  },

  calc_count: {
    id: 'calc_count',
    town: 'calculet',
    npc: '帳簿番カウン',
    title: tr('営業日数を数えよ', 'Count the Days Open'),
    intro: tra([
      '宿屋の帳簿番、カウンと申します。',
      'この表の「営業した日数」……つまり 宿泊客の数字が 入っている日を 数えたいのです。',
      '「休み」や 空白は 数えたくありません。B12 に お願いできますか？',
    ], [
      'I\'m Kaun, the inn\'s bookkeeper.',
      'I want to count the "days we were open" in this table... in other words, the days with a number of guests entered.',
      'I don\'t want to count "Closed" or blank days. Could you do it in B12?',
    ]),
    task: tra(['B12 に COUNT関数で、数値が入っているセルの数を出そう'], [
      'In B12, use the COUNT function to count the cells that contain numbers',
    ]),
    grid: () =>
      makeGrid(13, 2, [tra(['日付', '宿泊客'], ['Date', 'Guests']), ...GUESTS.map((g, i) => [tr(`${i + 1}日`, `Day ${i + 1}`), g]), [tr('営業日数', 'Days Open')]]),
    colWidths: [80, 80],
    hints: tra([
      'COUNT は「数値が入っているセル」だけを 数える関数です。',
      'ちなみに、空白以外を すべて数えるのは COUNTA です。',
      'B12 に =COUNT(B2:B11)',
    ], [
      'COUNT counts only the cells that contain numbers.',
      'By the way, COUNTA counts every cell that isn\'t blank.',
      'Type =COUNT(B2:B11) in B12',
    ]),
    check: (c) => expectNum(c, 'B12', 7, 'COUNT'),
    reward: { exp: 30, gold: 30, skill: 'COUNT' },
    thanks: tra(['7日……ぴったりです！', '「休み」の文字を 自動で無視してくれるとは。COUNT、恐るべし。'], [
      '7 days... exactly right!',
      'It ignores "Closed" automatically. COUNT is formidable.',
    ]),
  },

  calc_report: {
    id: 'calc_report',
    town: 'calculet',
    npc: '町長カルク',
    title: tr('町の月報', 'The Monthly Town Report'),
    intro: tra([
      'ワガハイが 町長の カルクで あーる！',
      'この町は 昔から 何でも手計算でな……月報づくりで 役人が 毎月 倒れておるので あーる。',
      '3つの店の 3か月分の売上表で ある。店ごとの合計（E列）と、月ごとの合計（5行目）を 出すので あーる！',
    ], [
      'I am the mayor, Kalk, harrumph!',
      'This town has always done everything by hand... and every month my clerks collapse making the monthly report, harrumph!',
      'Here are three months of sales for three shops. We need each shop\'s total (column E) and each month\'s total (row 5), harrumph!',
    ]),
    task: tra([
      'E2 に =SUM(B2:D2) を入れて、E4 までオートフィル',
      'B5 に =SUM(B2:B4) を入れて、E5 まで右にオートフィル',
    ], [
      'Put =SUM(B2:D2) in E2 and AutoFill down to E4',
      'Put =SUM(B2:B4) in B5 and AutoFill right to E5',
    ]),
    grid: () => makeGrid(6, 5, TAX, ['A1', 'B1', 'C1', 'D1', 'E1']),
    colWidths: [80, 70, 70, 70, 80],
    hints: tra([
      '合計の数式を1つ作ったら、あとは オートフィルで コピーするのが 集計の極意じゃ。',
      '横の合計は =SUM(B2:D2)。縦の合計は =SUM(B2:B4)。',
      'フィルハンドルは 下にも 右にも 引っぱれるぞ。',
    ], [
      'Make one total formula, then copy it with AutoFill. That is the secret of summary tables.',
      'Row totals: =SUM(B2:D2). Column totals: =SUM(B2:B4).',
      'You can drag the fill handle down or to the right.',
    ]),
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
    thanks: tra(['おお……月報が 一瞬で……！ 見事で あーる！', '数字を入れかえるだけで 来月も使える。役人たちも 家に帰れるので あーる。', '北の塔の結界も、これで 弱まるはずで あーる。'], [
      'Oh... the monthly report in an instant...! Splendid, harrumph!',
      'Just swap in new numbers and it works next month too. My clerks can finally go home, harrumph!',
      'This should weaken the barrier on the northern tower, too, harrumph!',
    ]),
  },
}

// ---------------------------------------------------------------- 洞窟の扉（謎解き）
const DAYS = tra(['月', '火', '水', '木', '金', '土', '日'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
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
    title: tr('曜日の扉', 'Door of Days'),
    intro: tra([
      '石の扉に、升目の刻まれた 石版が はめこまれている。',
      '「月」「火」……と 刻まれているが、その先が 欠けている。',
      '石版の文字を「日」まで 並べれば、扉が 開きそうだ。',
    ], [
      'A stone tablet carved with a grid is set into the stone door.',
      '"Mon" and "Tue" are carved into it, but the rest has crumbled away.',
      'Lining the days up all the way to "Sun" looks like it would open the door.',
    ]),
    task: tra(['石版の升目に、曜日を「日」まで 並べよ', '※ 1つずつ 手で 打ち込んでも、石版は 反応しないようだ'], [
      'Line up the days of the week on the tablet, all the way to "Sun"',
      '* The tablet doesn\'t seem to react if you type them in one by one',
    ]),
    grid: () => makeGrid(3, 8, [[DAYS[0], DAYS[1]]]),
    colWidths: [50, 50, 50, 50, 50, 50, 50, 50],
    hints: [],
    check: (c) => {
      for (let i = 0; i < 7; i++) {
        const a = String.fromCharCode(65 + i) + '1'
        if (c.raw(a) !== DAYS[i]) return tr(`${a} が「${DAYS[i]}」になっていない。`, `${a} doesn't say "${DAYS[i]}".`)
      }
      if (!c.actions.has('fill')) return tr('文字は そろったが……石版が 反応しない。並べ方に 何か 決まりが あるようだ。', "The words line up, but... the tablet doesn't react. There seems to be a rule about how to line them up.")
      return null
    },
    reward: { exp: 15, gold: 0 },
    thanks: tra(['石版の升目が 緑色に 光った！'], ['The grid on the tablet glowed green!']),
  },
  cave_mirror: {
    id: 'cave_mirror',
    kind: 'puzzle',
    town: 'cave',
    npc: '鏡の扉',
    title: tr('鏡の扉', 'Mirror Door'),
    intro: tra([
      'この扉の石版は、左半分に 模様が 刻まれ、右半分は まっさらだ。',
      '「左の模様を、そのまま 右に 写せ」と 刻まれている。',
    ], [
      'This door\'s tablet has a pattern carved on its left half. The right half is blank.',
      '"Copy the pattern on the left to the right, exactly as it is," is carved into it.',
    ]),
    task: tra(['左の模様（A1:C3）を、右の台座（E1:G3）に そっくり 写せ', '※ 手で 描き写しても、石版は 反応しないようだ'], [
      'Copy the pattern on the left (A1:C3) exactly onto the pedestal on the right (E1:G3)',
      '* The tablet doesn\'t seem to react if you draw it by hand',
    ]),
    grid: () => makeGrid(4, 7, MARK),
    colWidths: [44, 44, 44, 24, 44, 44, 44],
    hints: [],
    check: (c) => {
      for (let r = 0; r < 3; r++)
        for (let k = 0; k < 3; k++) {
          const src = String.fromCharCode(65 + k) + (r + 1)
          const dst = String.fromCharCode(69 + k) + (r + 1)
          if (c.raw(src) !== c.raw(dst)) return tr(`${dst} が ${src} と 同じ模様に なっていない。`, `${dst} doesn't have the same pattern as ${src}.`)
        }
      if (!c.actions.has('paste')) return tr('模様は 同じだが……扉は 動かない。写し方に 何か 決まりが あるようだ。', "The patterns match... but the door won't move. There seems to be a rule about how to copy it.")
      return null
    },
    reward: { exp: 15, gold: 0 },
    thanks: tra(['左右の模様が 重なり、石版が 光った！'], ['The left and right patterns lined up, and the tablet glowed!']),
  },
  cave_words: {
    id: 'cave_words',
    kind: 'puzzle',
    town: 'cave',
    npc: '言霊の扉',
    title: tr('言霊の扉', 'Door of Words'),
    intro: tra([
      '最後の扉には、呪文が 刻まれている。',
      'しかし 呪いで 文字が 乱れ、どこが 大事な 言葉なのかも わからない。',
      '「呪文を 正しく 直し、大事な言葉を 太字にせよ」……と 読める。',
    ], [
      'A spell is carved into the last door.',
      'But the curse has jumbled it, and you can\'t even tell which words matter.',
      'It reads: "Correct the spell, and make the important words bold."',
    ]),
    task: tra(['乱れた呪文（A3）を、扉への 命令の形に 正しく 直せ', '呪文（A2:A3）を 力強い 文字（太字）で 刻め'], [
      'Fix the jumbled spell (A3) so it becomes a command to the door',
      'Carve the spell (A2:A3) in strong letters (bold)',
    ]),
    grid: () => makeGrid(4, 2, tra([['呪文', 'メモ'], ['とびらよ', '呼びかけ'], ['ひらく', '命令のはず']], [['Spell', 'Note'], ['O door,', 'calling out'], ['opens', 'should be a command']])),
    colWidths: [110, 110],
    hints: [],
    check: (c) =>
      c.raw('A3').trim().toLowerCase() !== tr('ひらけ', 'open')
        ? tr('A3 の呪文が まだ 命令の形に なっていない。', "The spell in A3 isn't a command yet.")
        : !c.bold('A2') || !c.bold('A3')
          ? tr('呪文（A2:A3）が まだ 太字に なっていない。', "The spell (A2:A3) isn't bold yet.")
          : null,
    reward: { exp: 20, gold: 0 },
    thanks: tra(['「とびらよ ひらけ」――呪文が 力強く 輝いた！'], ['"O door, open!" The spell shone with power!']),
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 計算の塔の扉（謎解き）
const STONES = [12, 7, 23, 15, 9, 31, 18]
const GOLEM_SCORES: [string, number | string][] = tra<[string, number | string][]>(
  [
    ['ゴレム', 64],
    ['ゴレス', 88],
    ['ゴレタ', '欠席'],
    ['ゴレコ', 72],
    ['ゴレノ', 96],
    ['ゴレミ', 80],
  ],
  [
    ['Golemu', 64],
    ['Goless', 88],
    ['Goleta', 'Absent'],
    ['Goleko', 72],
    ['Goleno', 96],
    ['Golemi', 80],
  ],
)

Object.assign(QUESTS, {
  tower_price: {
    id: 'tower_price',
    kind: 'puzzle',
    town: 'tower',
    npc: '値札の扉',
    title: tr('値札の扉', 'Price Tag Door'),
    intro: tra(['扉の石版に、道具の 値段表が 刻まれている。', '「小計」の欄だけが 空白だ。', '「単価 × 数量」を 数式で 埋めよ――と 読める。'], [
      'A price list of items is carved into the tablet on the door.',
      'Only the "Subtotal" column is blank.',
      'It reads: "Fill it in with formulas: price × quantity."',
    ]),
    task: tra(['「小計」の欄（D2:D4）を、単価と数量から 計算で 埋めよ', '※ 数字を 直接 書いても、扉は 開かないようだ'], [
      'Fill in the "Subtotal" column (D2:D4) by calculating from price and quantity',
      '* Writing the numbers in directly doesn\'t seem to open the door',
    ]),
    grid: () =>
      makeGrid(
        6,
        4,
        tra<(string | number)[][]>(
          [
            ['品名', '単価', '数量', '小計'],
            ['やくそう', 8, 12],
            ['どくけしそう', 10, 6],
            ['ワープのはね', 25, 3],
          ],
          [
            ['Item', 'Price', 'Qty', 'Subtotal'],
            ['Herb', 8, 12],
            ['Antidote', 10, 6],
            ['Warp Wing', 25, 3],
          ],
        ),
      ),
    colWidths: [130, 60, 60, 70],
    hints: [],
    check: (c) => first(pz(c, 'D2', 96, 'formula'), pz(c, 'D3', 60, 'formula'), pz(c, 'D4', 75, 'formula')),
    reward: { exp: 25, gold: 0 },
    thanks: tra(['小計の欄に 数字が 浮かび上がった！'], ['Numbers rose up in the Subtotal column!']),
  },
  tower_sum: {
    id: 'tower_sum',
    kind: 'puzzle',
    town: 'tower',
    npc: '天秤の扉',
    title: tr('天秤の扉', 'Scale Door'),
    intro: tra(['扉には 天秤の 絵と、石の 重さの 表が 刻まれている。', '「すべての 石の 重さの 合計を 示せ」――と 読める。'], [
      'A balance scale and a table of stone weights are carved into the door.',
      'It reads: "Show the total weight of all the stones."',
    ]),
    task: tra(['すべての 石の 重さの 合計を、B9 に 示せ', '※ 1つずつ 足し算を 書き並べても、天秤は 動かないようだ'], [
      'Show the total weight of all the stones in B9',
      '* Writing out the additions one by one doesn\'t seem to move the scale',
    ]),
    grid: () => makeGrid(10, 2, [tra(['石', '重さ（kg）'], ['Stone', 'Weight (kg)']), ...STONES.map((w, i) => [tr(`石${i + 1}`, `Stone ${i + 1}`), w]), [tr('合計', 'Total')]]),
    colWidths: [80, 100],
    hints: [],
    check: (c) => pz(c, 'B9', STONES.reduce((a, b) => a + b, 0), 'SUM'),
    reward: { exp: 25, gold: 0 },
    thanks: tra(['天秤が ぴたりと つりあった！'], ['The scale balanced perfectly!']),
  },
  tower_stats: {
    id: 'tower_stats',
    kind: 'puzzle',
    town: 'tower',
    npc: '成績の扉',
    title: tr('成績の扉', 'Grades Door'),
    intro: tra([
      '最後の扉には、ゴーレムが 筆算で 書きなぐった 成績表が 刻まれている。',
      '「平均・最高点・受験者数を 示せ」――と 読める。',
      '欠席した者は 受験者に 数えぬ、と 小さく 書かれている。',
    ], [
      'On the last door is a grade sheet the golem scrawled out by hand.',
      'It reads: "Show the average, the top score, and the number of test takers."',
      'In small letters: "Those who were absent do not count as test takers."',
    ]),
    task: tra(['E2 に 平均点、E3 に 最高点、E4 に 受験者数を 示せ', '※ 欠席した者は 受験者に 数えない'], [
      'Show the average in E2, the top score in E3, and the number of test takers in E4',
      '* Absent students don\'t count as test takers',
    ]),
    grid: () =>
      makeGrid(8, 5, [
        tra(['名前', '点数', '', '項目', '答え'], ['Name', 'Score', '', 'Item', 'Answer']),
        [GOLEM_SCORES[0][0], GOLEM_SCORES[0][1], '', tr('平均', 'Average')],
        [GOLEM_SCORES[1][0], GOLEM_SCORES[1][1], '', tr('最高点', 'Top Score')],
        [GOLEM_SCORES[2][0], GOLEM_SCORES[2][1], '', tr('受験者数', 'Test Takers')],
        ...GOLEM_SCORES.slice(3),
      ]),
    colWidths: [80, 60, 24, 80, 70],
    hints: [],
    check: (c) => first(pz(c, 'E2', 80, 'AVERAGE'), pz(c, 'E3', 96, 'MAX'), pz(c, 'E4', 5, 'COUNT')),
    reward: { exp: 30, gold: 0 },
    thanks: tra(['成績表が まばゆく 光り、筆算の 落書きが 消えていく！'], [
      'The grade sheet shone brightly, and the scribbled longhand math faded away!',
    ]),
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
        ? tr(`${a} の 値は 合っているが……扉は 反応しない。「ずれない 印」が 足りないようだ。`, `The value in ${a} is right, but... the door doesn't react. It seems to be missing the "mark that never shifts."`)
        : tr(`${a} は 値は 合っている！ でも $ が 付いていない。1つの 数式に $ を 付けて、コピーで 使い回そう。`, `${a} has the right value! But there's no $. Add $ to one formula and reuse it by copying.`)
  }
  return null
}

/** 名前だけ 言語で 切りかえる 表の データ */
const named = <T extends unknown[]>(rows: [string, ...T][], en: string[]): [string, ...T][] =>
  rows.map(([n, ...rest], i) => [tr(n, en[i]), ...rest] as [string, ...T])
const FRUITS: [string, number, number][] = named(
  [
    ['リンゴ', 120, 15],
    ['ミカン', 80, 24],
    ['ブドウ', 350, 6],
    ['モモ', 250, 9],
    ['ナシ', 140, 11],
  ],
  ['Apple', 'Orange', 'Grapes', 'Peach', 'Pear'],
)
const GOLD: [string, number][] = named(
  [
    ['ハンテン', 100],
    ['フローラ', 45],
    ['ヌイ', 80],
    ['カケル', 25],
    ['ウツシ', 150],
  ],
  ['Hanten', 'Flora', 'Nui', 'Kakeru', 'Utsushi'],
)
const CLOTHES: [string, number][] = named(
  [
    ['ぎんのドレス', 3000],
    ['鏡のマント', 4500],
    ['礼服', 12000],
    ['ハンカチ', 800],
    ['ベスト', 2500],
  ],
  ['Silver Dress', 'Mirror Cape', 'Formal Suit', 'Handkerchief', 'Vest'],
)
const FLOWERS: [string, number][] = named(
  [
    ['バラ', 400],
    ['チューリップ', 250],
    ['ヒマワリ', 150],
    ['ユリ', 100],
    ['カスミソウ', 100],
  ],
  ['Rose', 'Tulip', 'Sunflower', 'Lily', "Baby's Breath"],
)
const BUDGET: [string, number][] = named(
  [
    ['湖の清掃', 4321],
    ['街灯の修理', 2468],
    ['神殿の鏡みがき', 987],
    ['花壇の植え替え', 1573],
    ['寺子屋の教材', 3056],
  ],
  ['Lake Cleanup', 'Streetlight Repair', 'Temple Mirror Polishing', 'Flowerbed Replanting', 'School Supplies'],
)
const rows = (n: number, from = 2) => Array.from({ length: n }, (_, i) => i + from)

Object.assign(QUESTS, {
  sansho_rel: {
    id: 'sansho_rel',
    town: 'sansho',
    npc: '八百屋ハンテン',
    title: tr('くだものの売上', 'Fruit Sales'),
    intro: tra([
      'へいらっしゃい！ 八百屋の ハンテンだ！ ……って、それどころじゃ ねえんだ、兄ちゃん。',
      '売上の 数式を D2 に 1個 作ってよ、下に 写したつもりが、呪いで 全部 リンゴの 計算に なっちまった！',
      'D3 を 見てみな。「=B2*C2」のまんまだ。ミカンは 3行目だってのによ、べらんめえ！',
    ], [
      'Welcome! I\'m Hanten the grocer! ...But never mind that, buddy. We\'ve got trouble.',
      'I made one sales formula in D2 and copied it down, but thanks to the curse, every row is calculating the apples!',
      'Look at D3. It still says "=B2*C2." The oranges are on row 3, for crying out loud!',
    ]),
    task: tra(['D3:D6 の 数式が、それぞれの 行を 計算するように 直そう', 'D2 の 数式を、D3:D6 に コピーし直すのが 近道'], [
      'Fix the formulas in D3:D6 so each one calculates its own row',
      'The shortcut: copy the formula in D2 into D3:D6 again',
    ]),
    grid: () =>
      makeGrid(8, 4, [
        tra(['品名', '単価', '数量', '売上'], ['Item', 'Price', 'Qty', 'Sales']),
        ...FRUITS.map(([n, p, q]) => [n, p, q, '=B2*C2']),
      ], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [90, 60, 60, 80],
    hints: tra([
      'D3 の 数式は 本当は =B3*C3、D4 は =B4*C4 に なるべきだ。',
      'ふつうに コピーすれば、参照は 下へ 1行ずつ 勝手に ずれてくれる。これが「相対参照」だ！',
      'D2 を 選んで 右下の ■ を D6 まで 引っぱる。または D2 を Ctrl+C → D3:D6 を 選んで Ctrl+V。',
    ], [
      'D3 should really be =B3*C3, and D4 should be =B4*C4.',
      'Copy it normally, and the references shift down one row at a time on their own. That\'s a "relative reference"!',
      'Select D2 and drag the ■ at its bottom right down to D6. Or press Ctrl+C on D2 → select D3:D6 → Ctrl+V.',
    ]),
    check: (c) => expectCopy(c, FRUITS.map(([, p, q], i) => [`D${i + 2}`, p * q])),
    reward: { exp: 50, gold: 50, skill: 'relref' },
    thanks: tra([
      'おおっ！ ミカンも ブドウも、ちゃんと 自分の 行を 計算してらぁ！',
      '数式を コピーすると、参照も いっしょに ずれる……「相対参照」ってのか。',
      'ずれるのは 呪いじゃなくて、便利な しくみ だったんだな！ ありがとよ！',
    ], [
      'Whoa! The oranges and the grapes are each calculating their own row!',
      'When you copy a formula, the references shift right along with it... A "relative reference," huh?',
      'So the shifting wasn\'t a curse at all, it\'s a handy feature! Thanks a bunch!',
    ]),
  },

  sansho_abs: {
    id: 'sansho_abs',
    town: 'sansho',
    npc: '両替商ドルマ',
    title: tr('両替レート表', 'Exchange Rate Table'),
    intro: tra([
      'ようこそ、ドルマ両替所へ。わたくし 両替商の ドルマで ございます、ドル。',
      '1ゴールドは 12シルバー。レートは F1 に 置いて、C2 に「=B2*F1」と 書き、下へ コピーいたしました。',
      'ところが……2人目から 全員「0シルバー」。お客様に 殴られかけまして ございます、ドル……。',
    ], [
      'Welcome to Dolma\'s Exchange. I am Dolma, the money changer, ka-ching.',
      '1 gold is worth 12 silver. I put the rate in F1, wrote "=B2*F1" in C2, and copied it down.',
      'But from the second customer on, everyone got "0 silver." A customer nearly punched me, ka-ching...',
    ]),
    task: tra(['C3:C6 が 0 に なる 原因を 見つけて、全員の 両替額を 正しく 出そう', 'C2 の 数式を 直して、C6 まで コピー'], [
      'Find out why C3:C6 come out as 0, and calculate everyone\'s exchange correctly',
      'Fix the formula in C2 and copy it down to C6',
    ]),
    grid: () =>
      makeGrid(8, 6, [
        tra<(string | number)[]>(['お客', 'ゴールド', 'シルバー', '', 'レート', 12], ['Customer', 'Gold', 'Silver', '', 'Rate', 12]),
        ...GOLD.map(([n, g], i) => [n, g, `=B${i + 2}*F${i + 1}`]),
      ], ['A1', 'B1', 'C1', 'E1']),
    colWidths: [90, 80, 80, 24, 60, 50],
    hints: tra([
      'C3 の 数式を 見てごらんなさいませ。=B3*F2……レートの F1 まで 下に ずれて、空っぽの F2 を 見ております。',
      'ずれて ほしくない 参照には「$」を 付けます。$F$1 と 書けば、コピーしても F1 のまま で ございます。',
      'C2 を =B2*$F$1 に 直して、C6 まで オートフィル。これで 全員 正しく 両替できます、ドル！',
    ], [
      'Take a look at the formula in C3: =B3*F2... The rate in F1 shifted down too, so it\'s looking at the empty F2.',
      'Put "$" on any reference you don\'t want to shift. Write $F$1, and it stays F1 even when copied.',
      'Change C2 to =B2*$F$1 and AutoFill down to C6. Then everyone gets the right exchange, ka-ching!',
    ]),
    check: (c) => expectCopy(c, GOLD.map(([, g], i) => [`C${i + 2}`, g * 12]), { dollar: true }),
    reward: { exp: 55, gold: 60, skill: 'absref' },
    thanks: tra([
      'おお……！ 全員の 両替額が ぴたりと 合いました で ございます！',
      '$ を 付けた 参照は、どこへ コピーしても 動かない。「絶対参照」と 申すのですね。',
      'これで お客様に 殴られずに 済みます、ドル。心より 感謝 申し上げます、ドル！',
    ], [
      'Oh...! Everyone\'s exchange comes out exactly right!',
      'A reference with $ never moves, wherever you copy it. So that\'s what they call an "absolute reference."',
      'Now no customer will punch me, ka-ching. My heartfelt thanks, ka-ching!',
    ]),
  },

  sansho_f4: {
    id: 'sansho_f4',
    town: 'sansho',
    npc: '仕立て屋ヌイ',
    title: tr('セール価格の値札', 'Sale Price Tags'),
    intro: tra([
      'いらっしゃいませ。仕立て屋の ヌイですわ。',
      '明日から 全品 20% 引きの セールですの。割引率は F1 に 書いておきましたわ。',
      'でも「$」を 打つのが 苦手で……指が つりそうですの。もっと 楽に 付ける 方法は ないかしら？',
    ], [
      'Welcome. I am Nui, the tailor.',
      'Starting tomorrow, everything is 20% off. I wrote the discount rate in F1.',
      'But I\'m hopeless at typing "$"... my fingers are about to cramp. Isn\'t there an easier way to add it?',
    ]),
    task: tra(['C2:C6 に セール価格（定価 ×（1 − 割引率））を 出そう', 'C2 で 数式を 入力中、F1 の 後ろで F4 キーを 押すと $F$1 になる（Mac は fn+F4）'], [
      'Find the sale price (list price × (1 − discount)) in C2:C6',
      'While typing the formula in C2, press F4 right after F1 to turn it into $F$1 (fn+F4 on a Mac)',
    ]),
    grid: () =>
      makeGrid(8, 6, [tra<(string | number)[]>(['品名', '定価', 'セール価格', '', '割引率', 0.2], ['Item', 'List Price', 'Sale Price', '', 'Discount', 0.2]), ...CLOTHES.map(([n, p]) => [n, p])], ['A1', 'B1', 'C1', 'E1']),
    colWidths: [110, 70, 90, 24, 60, 50],
    hints: tra([
      'C2 に =B2*(1-F1) と 打って……まだ Enter は 押さないで くださいまし。',
      'カーソルが F1 の すぐ 後ろに ある 状態で F4 を 押すと、$F$1 に 変わりますの。押すたびに $F$1 → F$1 → $F1 → F1 と 切り替わりますわ。',
      'C2 が =B2*(1-$F$1) に なったら、C6 まで オートフィルですわ。',
    ], [
      'Type =B2*(1-F1) in C2... but don\'t press Enter just yet.',
      'With the cursor right after F1, press F4 and it becomes $F$1. Each press cycles $F$1 → F$1 → $F1 → F1.',
      'Once C2 says =B2*(1-$F$1), AutoFill it down to C6.',
    ]),
    check: (c) => expectCopy(c, CLOTHES.map(([, p], i) => [`C${i + 2}`, p * 0.8]), { dollar: true }),
    reward: { exp: 55, gold: 60, skill: 'f4' },
    thanks: tra([
      'まあ！ F4 を 押すだけで $ が 付くなんて……指が 楽ちんですわ！',
      '値札も ぜんぶ 正しく なりましたわ。セールは 大成功 まちがいなしですの。',
      'お礼に、これからも 身だしなみは ヌイに おまかせくださいまし。',
    ], [
      'My! Just press F4 and the $ appears... how easy on the fingers!',
      'And every price tag is correct now. The sale is sure to be a huge success.',
      'As thanks, leave your wardrobe to Nui from now on.',
    ]),
  },

  sansho_share: {
    id: 'sansho_share',
    town: 'sansho',
    npc: '花屋フローラ',
    title: tr('花の人気ランキング', 'Flower Popularity'),
    intro: tra([
      'こんにちは〜♪ 花屋の フローラなの！',
      'どの お花が 売上の 何割を しめているか、「構成比」を 出したいの♪',
      'でも C2 に =B2/B7 って 書いて コピーしたら、下が ぜんぶ エラーに なっちゃって……しくしく。',
    ], [
      'Hello~♪ I\'m Flora from the flower shop!',
      'I want to know what share of total sales each flower makes up♪',
      'But when I wrote =B2/B7 in C2 and copied it down, everything below turned into errors... *sniff*.',
    ]),
    task: tra(['C2:C6 に、それぞれの 花の 構成比（売上 ÷ 合計）を 出そう', '合計は B7 に 入っている'], [
      'In C2:C6, find each flower\'s share of the total (sales ÷ total)',
      'The total is in B7',
    ]),
    grid: () =>
      makeGrid(9, 3, [tra(['花', '売上', '構成比'], ['Flower', 'Sales', 'Share']), ...FLOWERS.map(([n, v]) => [n, v]), [tr('合計', 'Total'), '=SUM(B2:B6)']], ['A1', 'B1', 'C1', 'A7']),
    colWidths: [110, 70, 80],
    hints: tra([
      '=B2/B7 を 下に コピーすると、C3 は =B3/B8 に なるの。B8 は 空っぽだから 0 で 割って エラーなの。',
      '合計の B7 は どこに コピーしても 動いてほしくない…… $ で 固定するの♪',
      'C2 に =B2/$B$7 → C6 まで オートフィル！ （B$7 でも OK なの）',
    ], [
      'When you copy =B2/B7 down, C3 becomes =B3/B8. B8 is empty, so it divides by 0 and shows an error.',
      'The total in B7 shouldn\'t move no matter where you copy it... so lock it with $♪',
      'Put =B2/$B$7 in C2 → AutoFill down to C6! (B$7 works too)',
    ]),
    check: (c) => expectCopy(c, FLOWERS.map(([, v], i) => [`C${i + 2}`, v / 1000]), { dollar: true }),
    reward: { exp: 55, gold: 60, skill: 'share' },
    thanks: tra([
      'わぁ〜い♪ バラが 0.4 で 4割、チューリップが 2割5分 なの！',
      '「構成比」って、合計を 固定するのが コツ なのね♪',
      'お礼に、お店の 前の お花、いつでも 見に来てね！',
    ], [
      'Yay~♪ Roses are 0.4, so 40%, and tulips are 25%!',
      'So the trick to "share of total" is locking the total♪',
      'As thanks, come see the flowers in front of my shop anytime!',
    ]),
  },

  sansho_mix: {
    id: 'sansho_mix',
    town: 'sansho',
    npc: 'カケル先生',
    title: tr('九九の表', 'Times Table'),
    intro: tra([
      'よく来てくれた。わしは 寺子屋の カケルじゃ。',
      '子どもらに 九九の表を 作らせておるのだが、1マスずつ 手で 計算しておって……日が 暮れてしまう。',
      '「左の数 × 上の数」を たった1つの 数式で 表ぜんぶに 広げる 方法が あると 聞いた。お主、わかるかの？',
    ], [
      'Thank you for coming. I am Kakeru, the schoolteacher.',
      'I\'m having the children make a times table, but they work out every square by hand... it takes all day.',
      'I hear there\'s a way to spread "left number × top number" across the whole table with a single formula. Do you know it?',
    ]),
    task: tra(['B2:F6 に「左の数（A列）× 上の数（1行目）」を 出そう', 'B2 に 1つ 数式を 作って、表 ぜんぶに コピーするのが 目標'], [
      'Fill B2:F6 with "the number on the left (column A) × the number on top (row 1)"',
      'Goal: make one formula in B2 and copy it across the whole table',
    ]),
    grid: () =>
      makeGrid(8, 6, [['×', 5, 6, 7, 8, 9], [5], [6], [7], [8], [9]], ['A1', 'B1', 'C1', 'D1', 'E1', 'F1', 'A2', 'A3', 'A4', 'A5', 'A6']),
    colWidths: [50, 50, 50, 50, 50, 50],
    hints: tra([
      '=A2*B1 を 右へ コピーすると A が B に ずれてしまう。下へ コピーすると 1 が 2 に ずれてしまう。',
      '「左の数」は いつも A列 → 列だけ 固定して $A2。「上の数」は いつも 1行目 → 行だけ 固定して B$1。',
      'B2 に =$A2*B$1。B2 を Ctrl+C → B2:F6 を 選んで Ctrl+V で 一気に 完成じゃ（右→下と オートフィルでも よい）。',
    ], [
      'Copy =A2*B1 to the right and A shifts to B. Copy it down and 1 shifts to 2.',
      'The left number is always in column A → lock only the column: $A2. The top number is always in row 1 → lock only the row: B$1.',
      'Put =$A2*B$1 in B2. Press Ctrl+C on B2 → select B2:F6 → Ctrl+V, and it\'s done in one go (AutoFill right, then down, works too).',
    ]),
    check: (c) => {
      const cells: [string, number][] = []
      for (const r of rows(5)) for (let k = 0; k < 5; k++) cells.push([`${'BCDEF'[k]}${r}`, (r + 3) * (k + 5)])
      return expectCopy(c, cells, { dollar: true })
    },
    reward: { exp: 60, gold: 70, skill: 'mixref' },
    thanks: tra([
      'なんと……たった1つの 数式で、25マスが 一瞬で 埋まったぞ！',
      '列だけ・行だけを 固定する……「複合参照」とは 見事な 技じゃ。',
      'さっそく 子どもらに 教えてやろう。九九の表なら 81マスでも 一瞬じゃな！',
    ], [
      'Astonishing... a single formula filled all 25 squares in an instant!',
      'Locking only the column, or only the row... a "mixed reference" is a fine technique.',
      'I\'ll teach the children right away. Even a full 81-square times table will take no time at all!',
    ]),
  },

  sansho_round: {
    id: 'sansho_round',
    town: 'sansho',
    npc: '町長カガミ',
    title: tr('町の予算表', 'The Town Budget'),
    intro: tra([
      'サンショウの 町長、カガミです。町の 悩みを 次々と 解決してくださって いるそうですね。',
      '最後に お願いが あります。町の 予算表に 税（F1）を 足した「税込額」を 出したいのです。',
      'ただ、1円 未満の 端数が 出てしまって……監査では 整数に 四捨五入するよう 言われているのです。',
    ], [
      'I\'m Kagami, mayor of Refton. I hear you\'ve been solving our town\'s troubles one after another.',
      'I have one last request. I want the "amount with tax" for our town budget, adding the tax rate in F1.',
      'But it leaves fractions smaller than one coin... and the auditors told us to round to whole numbers.',
    ]),
    task: tra([
      'C2:C6 に 税込額（金額 ×（1 + 税率））を、四捨五入して 整数で 出そう',
      'C7 に 税込額の 合計を 出そう',
    ], [
      'In C2:C6, find the amount with tax (amount × (1 + tax rate)), rounded to a whole number',
      'Find the total of the amounts with tax in C7',
    ]),
    grid: () =>
      makeGrid(9, 6, [tra<(string | number)[]>(['事業', '金額', '税込額', '', '税率', 0.1], ['Project', 'Amount', 'With Tax', '', 'Tax', 0.1]), ...BUDGET.map(([n, v]) => [n, v]), [tr('合計', 'Total')]], ['A1', 'B1', 'C1', 'E1', 'A7']),
    colWidths: [130, 70, 80, 24, 50, 50],
    hints: tra([
      '四捨五入は ROUND 関数。=ROUND(数値, 0) で 小数第1位を 四捨五入して 整数に なります。',
      '税率の F1 は $ で 固定しましょう。=ROUND(B2*(1+$F$1),0) を C6 まで コピーです。',
      '合計は C7 に =SUM(C2:C6) です。',
    ], [
      'Round with the ROUND function. =ROUND(number, 0) rounds to a whole number.',
      'Lock the tax rate in F1 with $. Copy =ROUND(B2*(1+$F$1),0) down to C6.',
      'The total goes in C7: =SUM(C2:C6).',
    ]),
    check: (c) => {
      const vals = BUDGET.map(([, v]) => Math.round(v * 1.1))
      return first(
        expectCopy(c, vals.map((v, i) => [`C${i + 2}`, v]), { dollar: true, fn: 'ROUND' }),
        expectNum(c, 'C7', vals.reduce((a, b) => a + b, 0), 'SUM'),
      )
    },
    reward: { exp: 70, gold: 80, skill: 'round' },
    thanks: tra([
      '端数も きれいに そろって、合計も ぴたり……。これなら 監査も 通ります。',
      '町の 悩みを すべて 解決して くださって、本当に ありがとうございます。',
      '北の 鏡の神殿の 結界も、これで とけるはず……。どうか、ミラージュを 止めてください。',
    ], [
      'No stray fractions, and the total matches perfectly... This will pass the audit.',
      'Thank you so much for solving every one of our town\'s troubles.',
      'The barrier on the Mirror Temple to the north should lift now... Please, stop the Mirage.',
    ]),
    notLast: {
      introHead: tra(['サンショウの 町長、カガミです。旅の方、ようこそ。', 'お願いが あります。町の 予算表に 税（F1）を 足した「税込額」を 出したいのです。'], [
        'I\'m Kagami, mayor of Refton. Welcome, traveler.',
        'I have a request. I want the "amount with tax" for our town budget, adding the tax rate in F1.',
      ]),
      thanksTail: tra(['町には まだ 困っている 者が おります。', '頭の上に「！」の 出ている 者の 話も、聞いてやって ください。'], [
        'There are still townspeople in need.',
        'Please listen to anyone with a "!" over their head, too.',
      ]),
    },
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 鏡の神殿の扉（謎解き）
const TEMPLE_GOODS: [string, number][] = named(
  [
    ['鏡の かけら', 500],
    ['銀の しずく', 1250],
    ['月の 砂', 800],
    ['星の 粉', 2000],
  ],
  ['Mirror Shard', 'Silver Drop', 'Moon Sand', 'Star Dust'],
)
const TEMPLE_LIGHT: [string, number][] = named(
  [
    ['東の 鏡', 120],
    ['西の 鏡', 180],
    ['南の 鏡', 60],
    ['北の 鏡', 240],
  ],
  ['East Mirror', 'West Mirror', 'South Mirror', 'North Mirror'],
)

Object.assign(QUESTS, {
  temple_tax: {
    id: 'temple_tax',
    kind: 'puzzle',
    town: 'temple',
    npc: '供物の扉',
    title: tr('供物の扉', 'Offering Door'),
    intro: tra(['扉の 石版に、供物の 値段表が 刻まれている。', '「供物には 税を 加えて 納めよ」――と 読める。', '石版の 右上には「税」の 文字と 数字が 1つ。'], [
      'A price list of offerings is carved into the tablet on the door.',
      'It reads: "Add tax to your offerings before you present them."',
      'In the upper right of the tablet: the word "Tax" and a single number.',
    ]),
    task: tra(['「納める額」（C2:C5）を、値段と 税から 計算で 埋めよ', '※ 1つの 式を すべてに 映せ、とも 書かれている'], [
      'Fill in "Amount Due" (C2:C5) by calculating from the price and the tax',
      '* It also says: reflect one formula onto them all',
    ]),
    grid: () => makeGrid(7, 6, [tra<(string | number)[]>(['供物', '値段', '納める額', '', '税', 0.08], ['Offering', 'Price', 'Amount Due', '', 'Tax', 0.08]), ...TEMPLE_GOODS.map(([n, v]) => [n, v])]),
    colWidths: [110, 70, 80, 24, 40, 50],
    hints: [],
    check: (c) => expectCopy(c, TEMPLE_GOODS.map(([, v], i) => [`C${i + 2}`, v * 1.08]), { dollar: true, vague: true }),
    reward: { exp: 40, gold: 0 },
    thanks: tra(['納める額が 浮かび上がり、扉の 鏡が 静かに 光った！'], ['The amounts due rose up, and the mirror on the door glowed softly!']),
  },
  temple_share: {
    id: 'temple_share',
    kind: 'puzzle',
    town: 'temple',
    npc: '光の扉',
    title: tr('光の扉', 'Door of Light'),
    intro: tra(['扉には 4枚の 鏡と、それぞれが 集めた 光の 量が 刻まれている。', '「各々の 鏡が、すべての 光の 何割を 担うか 示せ」――と 読める。'], [
      'Four mirrors are carved into the door, along with the amount of light each has gathered.',
      'It reads: "Show what share of all the light each mirror carries."',
    ]),
    task: tra(['C2:C5 に、それぞれの 鏡が 全体の 何割の 光を 担うかを 示せ（割合で）', '※ 1つの 式を すべてに 映せ'], [
      'In C2:C5, show what share of all the light each mirror carries (as a ratio)',
      '* Reflect one formula onto them all',
    ]),
    grid: () => makeGrid(8, 3, [tra(['鏡', '光', '割合'], ['Mirror', 'Light', 'Share']), ...TEMPLE_LIGHT.map(([n, v]) => [n, v]), [tr('すべて', 'All'), '=SUM(B2:B5)']]),
    colWidths: [90, 60, 70],
    hints: [],
    check: (c) => expectCopy(c, TEMPLE_LIGHT.map(([, v], i) => [`C${i + 2}`, v / 600]), { dollar: true, vague: true }),
    reward: { exp: 40, gold: 0 },
    thanks: tra(['4枚の 鏡が 順番に 輝き、光が 扉の 中心に 集まった！'], [
      'The four mirrors shone one after another, and the light gathered at the center of the door!',
    ]),
  },
  temple_times: {
    id: 'temple_times',
    kind: 'puzzle',
    town: 'temple',
    npc: '交差の扉',
    title: tr('交差の扉', 'Crossing Door'),
    intro: tra(['大鏡の間へ 続く 最後の扉。', '縦と 横に 数字が 並び、交わる マスは すべて 空白だ。', '「縦と 横の 交わりを、ただ 1つの 式で 満たせ」――と 読める。'], [
      'The last door before the Hall of the Great Mirror.',
      'Numbers run down the side and across the top, and every square where they cross is blank.',
      'It reads: "Fill every crossing of down and across with a single formula."',
    ]),
    task: tra(['B2:E5 の すべての マスに、左端の数 × 上端の数 を 示せ', '※ ただ 1つの 式を 映して 満たせ'], [
      'Fill every square in B2:E5 with the number at the left × the number at the top',
      '* Fill them all by reflecting a single formula',
    ]),
    grid: () => makeGrid(7, 5, [['', 2, 4, 6, 8], [3], [5], [7], [9]]),
    colWidths: [50, 50, 50, 50, 50],
    hints: [],
    check: (c) => {
      const cells: [string, number][] = []
      for (const [i, a] of [3, 5, 7, 9].entries()) for (const [k, b] of [2, 4, 6, 8].entries()) cells.push([`${'BCDE'[k]}${i + 2}`, a * b])
      return expectCopy(c, cells, { dollar: true, vague: true })
    },
    reward: { exp: 50, gold: 0 },
    thanks: tra(['すべての マスが 光で 満たされ、大鏡の間への 扉が 開いていく……！'], [
      'Every square filled with light, and the door to the Hall of the Great Mirror began to open...!',
    ]),
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第3章 イフポート（条件）
/** IF などで「文字」や TRUE/FALSE が 出るセルの 判定 */
function expectVal(c: CheckCtx, a: string, want: string | boolean, fn?: string, vague = false): string | null {
  const v = c.v(a)
  const raw = c.raw(a)
  if (raw === '') return tr(`${a} が まだ 空っぽだ。`, `${a} is still empty.`)
  if (/[≧≦≠]/.test(raw)) return BAD_OP
  if (typeof v === 'object' && v !== null)
    return vague
      ? tr(`${a} が エラー（${v.error}）に なっている。`, `${a} shows an error (${v.error}).`)
      : tr(`${a} が エラー（${v.error}）に なっている。文字は "大漁" のように " で 囲んだかな？`, `${a} shows an error (${v.error}). Did you wrap text in " like "Great"?`)
  if (v !== want)
    return vague
      ? tr(`${a} の 答え（${formatValue(v) || '空'}）が 正しくないようだ。`, `The answer in ${a} (${formatValue(v) || 'blank'}) doesn't look right.`)
      : tr(
          `${a} が「${formatValue(v) || '空'}」に なっている。ここは「${formatValue(want)}」に なるはずだ。条件を 見直そう。`,
          `${a} shows "${formatValue(v) || 'blank'}", but it should be "${formatValue(want)}". Check the condition.`,
        )
  if (!raw.startsWith('='))
    return vague
      ? tr(`${a} の 答えは 合っているが……扉は 反応しない。手で 書いただけでは ダメなようだ。`, `The answer in ${a} is right, but... the door doesn't react. Writing it by hand won't do.`)
      : tr(`${a} は 合っているけど、手で 入力されている。数式で 判定させよう。`, `${a} is right, but it was typed in by hand. Let a formula decide it.`)
  if (fn && !usesFn(raw, fn))
    return vague
      ? tr(`${a} の 答えは 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。`, `The answer in ${a} is right, but... the door doesn't react. There seems to be a rule about how to get it.`)
      : tr(`${a} は 合っている！ でも ${fn} を 使って 判定してみよう。`, `${a} is right! But try deciding it with ${fn}.`)
  return null
}
const eachVal = (c: CheckCtx, cells: [string, string | boolean][], fn?: string, vague = false) => first(...cells.map(([a, w]) => expectVal(c, a, w, fn, vague)))

const TIDE: [string, number][] = named(
  [
    ['6時', 120],
    ['9時', 185],
    ['12時', 210],
    ['15時', 180],
    ['18時', 150],
  ],
  ['6:00', '9:00', '12:00', '15:00', '18:00'],
)
const BOATS: [string, number][] = named(
  [
    ['第一アミ丸', 72],
    ['第二アミ丸', 35],
    ['カモメ号', 50],
    ['イルカ号', 49],
    ['クジラ号', 88],
  ],
  ['Ami Maru I', 'Ami Maru II', 'Seagull', 'Dolphin', 'Whale'],
)
const ORDERS: [string, number][] = named(
  [
    ['宿屋', 4500],
    ['武器屋', 2800],
    ['パン屋', 3000],
    ['漁師', 1200],
    ['教会', 3600],
  ],
  ['Inn', 'Weapon Shop', 'Bakery', 'Fisher', 'Church'],
)
const CADETS: [string, number][] = named(
  [
    ['マスト', 92],
    ['イカリ', 75],
    ['ホバシラ', 60],
    ['カジ', 58],
    ['ラシン', 80],
  ],
  ['Mast', 'Anchor', 'Spar', 'Rudder', 'Compass'],
)
const WEATHER: [string, number, number][] = named(
  [
    ['月', 5, 1],
    ['火', 12, 1],
    ['水', 8, 2],
    ['木', 16, 2],
    ['金', 3, 3],
    ['土', 9, 1],
  ],
  ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
)
const ARRIVALS: [string, string, number][] = tra<[string, string, number][]>(
  [
    ['カモメ号', '魚', 40],
    ['イルカ号', '貝', 25],
    ['クジラ号', '魚', 65],
    ['サンマ丸', '海藻', 30],
    ['タイ丸', 'カニ', 55],
    ['アジ丸', '魚', 20],
    ['ホタテ丸', '貝', 70],
    ['ワカメ丸', '海藻', 50],
  ],
  [
    ['Seagull', 'Fish', 40],
    ['Dolphin', 'Shellfish', 25],
    ['Whale', 'Fish', 65],
    ['Saury Maru', 'Seaweed', 30],
    ['Bream Maru', 'Crab', 55],
    ['Mackerel Maru', 'Fish', 20],
    ['Scallop Maru', 'Shellfish', 70],
    ['Wakame Maru', 'Seaweed', 50],
  ],
)
/** IF の 答えに 使う 言葉（英語版は 英語で 判定する） */
const CARGO_FISH = tr('魚', 'Fish')
const [GREAT, POOR] = tra(['大漁', '不漁'], ['Great', 'Poor'])
const [SAIL, STAY, ALERT, NONE] = tra(['出航', '欠航', '警報', 'なし'], ['Sail', 'Stay', 'Alert', 'None'])
const grade = (n: number) => (n >= 80 ? 'A' : n >= 60 ? 'B' : 'C')

Object.assign(QUESTS, {
  port_compare: {
    id: 'port_compare',
    town: 'ifport',
    npc: '灯台守トモシ',
    title: tr('潮位の見張り', 'Watching the Tide'),
    intro: tra([
      'ほっほ……わしは 灯台守の トモシじゃ。',
      '潮位が 警戒ライン（F1）以上に なったら、船に 知らせねば ならん。',
      'じゃが 最近 目が かすんでのう……「以上」か どうか、表で 自動で わかるように できんかの？',
    ], [
      'Ho ho... I\'m Tomoshi, the lighthouse keeper.',
      'When the tide reaches the alert line (F1) or higher, I have to warn the ships.',
      'But my eyes have gone blurry lately... Could you make the table tell me automatically whether it\'s "at least" that high?',
    ]),
    task: tra(['C2:C6 に「潮位が 警戒ライン（F1）以上か」を 出そう（TRUE / FALSE）', '比べるだけの 数式 =B2>=$F$1 で OK。C6 まで コピー'], [
      'In C2:C6, show whether the tide is at or above the alert line (F1) (TRUE / FALSE)',
      'Just a comparison formula, =B2>=$F$1, will do. Copy it down to C6',
    ]),
    grid: () => makeGrid(8, 6, [tra<(string | number)[]>(['時刻', '潮位(cm)', '危険？', '', '警戒ライン', 180], ['Time', 'Tide (cm)', 'Danger?', '', 'Alert Line', 180]), ...TIDE.map(([t, v]) => [t, v])], ['A1', 'B1', 'C1', 'E1']),
    colWidths: [60, 80, 70, 24, 90, 50],
    hints: tra([
      '「以上」は >=。=B2>=F1 と 書くと、正しければ TRUE、違えば FALSE に なるんじゃ。',
      'ただし 下へ コピーすると F1 が F2 に ずれてしまう……サンショウで 覚えた $ の 出番じゃな。',
      'C2 に =B2>=$F$1 → C6 まで オートフィル。ちょうど 180 の ときも「以上」じゃから TRUE じゃよ。',
    ], [
      '"At least" is >=. Write =B2>=F1, and you get TRUE if it\'s right and FALSE if it\'s not.',
      'But copy it down and F1 shifts to F2... Time for the $ you learned in Refton.',
      '=B2>=$F$1 in C2 → AutoFill down to C6. Exactly 180 also counts as "at least," so that\'s TRUE.',
    ]),
    check: (c) => eachVal(c, TIDE.map(([, v], i) => [`C${i + 2}`, v >= 180])),
    reward: { exp: 80, gold: 90, skill: 'compare' },
    thanks: tra([
      'おお、TRUE の 時間だけ 見れば よいのか！ これなら 目が かすんでも 見逃さんわい。',
      '>= が「以上」、> が「より大きい」……ちょうど 180 の ときに 差が 出るんじゃな。',
      '灯台の 明かりも、これで 迷わず 灯せるわい。ありがとうよ。',
    ], [
      'Oh, so I just look for the TRUE times! Now I won\'t miss a thing even with blurry eyes.',
      '>= is "at least," and > is "greater than"... The difference shows up when it\'s exactly 180.',
      'Now I can light the lighthouse without hesitating. Thank you kindly.',
    ]),
  },

  port_if: {
    id: 'port_if',
    town: 'ifport',
    npc: '漁師アミ',
    title: tr('大漁か不漁か', 'Great Catch or Poor Catch'),
    intro: tra([
      'あっ、旅の人！ あたし 漁師の アミ！',
      '船ごとの 漁獲量で「50kg以上なら 大漁、それ以外は 不漁」って 記録を つけてるんだけど……',
      '幽霊船が 来てから、1隻ずつ「うーん、大漁……かな？」って 悩んじゃって 進まないの！ 手伝って！',
    ], [
      'Oh, a traveler! I\'m Ami, a fisher!',
      'I log each boat\'s catch: 50 kg or more is "Great," anything else is "Poor"...',
      'But ever since the ghost ship came, I keep agonizing over every boat, "Hmm, is this Great...?" and get nowhere! Help me out!',
    ]),
    task: tra(['C2:C6 に、漁獲量が 50以上なら「大漁」、それ以外は「不漁」と 出そう', '=IF(条件, 正しいとき, 違うとき) を 使う'], [
      'In C2:C6, show "Great" if the catch is 50 or more, and "Poor" otherwise',
      'Use =IF(condition, value if true, value if false)',
    ]),
    grid: () => makeGrid(8, 3, [tra<(string | number)[]>(['船', '漁獲量(kg)', '結果'], ['Boat', 'Catch (kg)', 'Result']), ...BOATS.map(([n, v]) => [n, v])], ['A1', 'B1', 'C1']),
    colWidths: [110, 90, 70],
    hints: tra([
      'IF は =IF(条件, 正しいときの答え, 違うときの答え) って 形なんだって！',
      '答えが 文字の ときは " で 囲むの。"大漁" "不漁" みたいに。',
      'C2 に =IF(B2>=50,"大漁","不漁") → C6 まで オートフィル！ 50kg ちょうどは 大漁だよ！',
    ], [
      'They say IF looks like =IF(condition, answer if true, answer if false)!',
      'When the answer is text, wrap it in ". Like "Great" and "Poor".',
      '=IF(B2>=50,"Great","Poor") in C2 → AutoFill down to C6! Exactly 50 kg counts as Great!',
    ]),
    check: (c) => eachVal(c, BOATS.map(([, v], i) => [`C${i + 2}`, v >= 50 ? GREAT : POOR]), 'IF'),
    reward: { exp: 85, gold: 95, skill: 'if' },
    thanks: tra([
      'すごーい！ ルールを 1回 書いたら、全部の 船が 一瞬で 判定されちゃった！',
      'もう「大漁……かな？」って 悩まなくて いいんだ！',
      'IF って「もしも」の 魔法なんだね。お礼に、今度 いちばん おいしい 魚 あげるね！',
    ], [
      'Amazing! I wrote the rule once, and every boat got judged in an instant!',
      'No more agonizing over "Is this Great...?"',
      'So IF is the magic of "what if." As thanks, I\'ll give you the tastiest fish next time!',
    ]),
  },

  port_ifcalc: {
    id: 'port_ifcalc',
    town: 'ifport',
    npc: '運送屋ハコブ',
    title: tr('送料の計算', 'Calculating Shipping'),
    intro: tra([
      'おう、ハコブ運送へ ようこそ！',
      'うちは 3000G以上の 注文なら 送料 タダ、それ未満なら 送料 500G だ。',
      'なのに 最近、1件ずつ「えーと、これは タダ……だっけ？」って 迷って 請求書が 出せねえんだ！',
    ], [
      'Hey, welcome to Hakobu Shipping!',
      'Orders of 3000G or more ship free; anything less costs 500G to ship.',
      'But lately I keep hesitating over every order, "Uh, was this one free...?" and can\'t send out any invoices!',
    ]),
    task: tra(['C2:C6 に 送料（金額が 3000以上なら 0、それ以外は 500）を 出そう', 'D2:D6 に 請求額（金額 ＋ 送料）を 出そう'], [
      'In C2:C6, show the shipping (0 if the amount is 3000 or more, otherwise 500)',
      'In D2:D6, show the total due (amount + shipping)',
    ]),
    grid: () => makeGrid(8, 4, [tra<(string | number)[]>(['お客', '金額', '送料', '請求額'], ['Customer', 'Amount', 'Shipping', 'Total Due']), ...ORDERS.map(([n, v]) => [n, v])], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [90, 70, 60, 80],
    hints: tra([
      'IF の 答えは 文字じゃなくて 数値でも いい。数値は " で 囲まねえ。',
      'C2 に =IF(B2>=3000,0,500)。3000 ちょうどは タダだぜ！',
      'D2 に =B2+C2。どっちも D6・C6 まで オートフィルだ！',
    ], [
      'IF\'s answers don\'t have to be text; numbers work too. Numbers don\'t get wrapped in ".',
      '=IF(B2>=3000,0,500) in C2. Exactly 3000 ships free!',
      '=B2+C2 in D2. AutoFill both down to row 6!',
    ]),
    check: (c) =>
      first(
        ...ORDERS.map(([, v], i) => expectNum(c, `C${i + 2}`, v >= 3000 ? 0 : 500, 'IF')),
        ...ORDERS.map(([, v], i) => expectNum(c, `D${i + 2}`, v + (v >= 3000 ? 0 : 500), 'formula')),
      ),
    reward: { exp: 85, gold: 100, skill: 'ifcalc' },
    thanks: tra([
      'よっしゃあ！ 送料も 請求額も 一発で 出たぜ！',
      '金額を 書きかえても、送料が 勝手に 0 と 500 を 切り替える……こいつぁ 便利だ！',
      'これで 今日の 荷物も ぜんぶ 出発できる。ありがとよ！',
    ], [
      'All right! Shipping and totals, done in one go!',
      'Change the amount, and the shipping switches between 0 and 500 by itself... Now that\'s handy!',
      'Now all of today\'s packages can head out. Thanks!',
    ]),
  },

  port_nested: {
    id: 'port_nested',
    town: 'ifport',
    npc: 'ロープ教官',
    title: tr('航海士試験の評価', 'Grading the Navigator Exam'),
    intro: tra([
      '本官は 航海士学校の ロープ教官で ある！',
      '試験の 評価は、80点以上が A、60点以上が B、それ未満が C と 決まっている。',
      'だが……IF は「正しい」「違う」の 2つにしか 分けられん。3つに 分ける 方法が わからんのだ……！',
    ], [
      'I am Instructor Rope of the Navigation School!',
      'Exam grades are set: 80 or more is an A, 60 or more is a B, and anything less is a C.',
      'But... IF can only split things into two: true or false. I have no idea how to split them into three...!',
    ]),
    task: tra(['C2:C6 に 評価（80以上 → A、60以上 → B、それ未満 → C）を 出そう', 'IF の 中に、もう1つ IF を 入れる'], [
      'In C2:C6, show the grade (80+ → A, 60+ → B, otherwise → C)',
      'Put another IF inside the IF',
    ]),
    grid: () => makeGrid(8, 3, [tra<(string | number)[]>(['候補生', '点数', '評価'], ['Cadet', 'Score', 'Grade']), ...CADETS.map(([n, v]) => [n, v])], ['A1', 'B1', 'C1']),
    colWidths: [90, 60, 60],
    hints: tra([
      'まず 80点以上か 判定し、A でなければ……「違うとき」の 場所で もう一度 判定する。',
      '=IF(B2>=80,"A", ここに もう1つの IF ) という 形に なる。',
      'C2 に =IF(B2>=80,"A",IF(B2>=60,"B","C")) → C6 まで オートフィル。カッコの 数に 注意だ！',
    ], [
      'First check whether it\'s 80 or more, and if it\'s not an A... check again in the "if false" spot.',
      'It takes the shape =IF(B2>=80,"A", another IF goes here ).',
      '=IF(B2>=80,"A",IF(B2>=60,"B","C")) in C2 → AutoFill down to C6. Watch the number of parentheses!',
    ]),
    check: (c) => eachVal(c, CADETS.map(([, v], i) => [`C${i + 2}`, grade(v)]), 'IF'),
    reward: { exp: 90, gold: 100, skill: 'nestif' },
    thanks: tra([
      '見事で ある！ IF の 中に IF……「入れ子」と いうのだな。',
      '60点ちょうどの ホバシラは B、58点の カジは C。1点も まちがいが ない！',
      '本官も 今日から 採点に 迷わん。敬礼！',
    ], [
      'Splendid! An IF inside an IF... They call it "nesting," do they?',
      'Spar, with exactly 60, gets a B, and Rudder, with 58, gets a C. Not a single mistake!',
      'From today, I shall never hesitate when grading. Salute!',
    ]),
  },

  port_andor: {
    id: 'port_andor',
    town: 'ifport',
    npc: '天気予報士カザミ',
    title: tr('出航できる日', 'Days to Set Sail'),
    intro: tra([
      'あら、いらっしゃい。気象台の カザミよ。',
      '船が 出航できるのは「風速が 10未満」かつ「波が 2m未満」の 日だけ。',
      'それと「風速 15以上」または「波 3m以上」なら 警報を 出すの。2つの 条件を いっしょに 見るのって、むずかしくて……。',
    ], [
      'Oh, welcome. I\'m Kazami from the weather station.',
      'Ships can only sail on days when the wind is under 10 AND the waves are under 2 m.',
      'And if the wind is 15 or more OR the waves are 3 m or more, I issue an alert. Looking at two conditions at once is so hard...',
    ]),
    task: tra([
      'D2:D7 に、風速 10未満 かつ 波 2未満 なら「出航」、違えば「欠航」',
      'E2:E7 に、風速 15以上 または 波 3以上 なら「警報」、違えば「なし」',
    ], [
      'In D2:D7, show "Sail" if the wind is under 10 AND the waves are under 2, otherwise "Stay"',
      'In E2:E7, show "Alert" if the wind is 15 or more OR the waves are 3 or more, otherwise "None"',
    ]),
    grid: () => makeGrid(9, 5, [tra<(string | number)[]>(['曜日', '風速(m)', '波(m)', '出航', '警報'], ['Day', 'Wind (m)', 'Waves (m)', 'Sail?', 'Alert?']), ...WEATHER.map(([d, w, h]) => [d, w, h])], ['A1', 'B1', 'C1', 'D1', 'E1']),
    colWidths: [50, 70, 60, 60, 60],
    hints: tra([
      '「かつ（両方）」は AND、「または（どちらか）」は OR。どちらも TRUE / FALSE を 返すわ。',
      'IF の 条件の 場所に 入れるの。=IF(AND(B2<10,C2<2),"出航","欠航")',
      '警報は =IF(OR(B2>=15,C2>=3),"警報","なし")。どちらも 7行目まで オートフィルね。',
    ], [
      '"AND (both)" is AND, and "OR (either one)" is OR. Both return TRUE / FALSE.',
      'Put them in the condition spot of IF. =IF(AND(B2<10,C2<2),"Sail","Stay")',
      'The alert is =IF(OR(B2>=15,C2>=3),"Alert","None"). AutoFill both down to row 7.',
    ]),
    check: (c) =>
      first(
        eachVal(c, WEATHER.map(([, w, h], i) => [`D${i + 2}`, w < 10 && h < 2 ? SAIL : STAY]), 'AND'),
        eachVal(c, WEATHER.map(([, w, h], i) => [`E${i + 2}`, w >= 15 || h >= 3 ? ALERT : NONE]), 'OR'),
      ),
    reward: { exp: 95, gold: 110, skill: 'andor' },
    thanks: tra([
      'すてき！ 水曜日は 波が ちょうど 2m だから 欠航……ちゃんと 判定できてるわ。',
      'AND は「両方」、OR は「どちらか」。条件を 組み合わせれば、どんな ルールも 書けるのね。',
      'これで 毎朝の 予報が 一瞬で 出せるわ。ありがとう！',
    ], [
      'Wonderful! On Wednesday the waves are exactly 2 m, so it\'s Stay... It\'s judging correctly.',
      'AND means "both," and OR means "either." Combine conditions, and you can write any rule.',
      'Now I can put out the forecast every morning in an instant. Thank you!',
    ]),
  },

  port_countif: {
    id: 'port_countif',
    town: 'ifport',
    npc: '港長ミナト',
    title: tr('入港記録の集計', 'Totaling the Arrival Records'),
    intro: tra([
      '港長の ミナトだ。町の 悩みを 次々 片づけて くれているそうだね。',
      '最後に、この 入港記録を 集計してほしい。',
      '「魚を 運んだ 船の数」「魚の 合計」「50箱以上 運んだ 船の数」……聞かれるたびに、職員が 1行ずつ 指で 数えているんだ。',
    ], [
      'I\'m Minato, the harbormaster. I hear you\'ve been solving the town\'s troubles one after another.',
      'Finally, I\'d like you to total up these arrival records.',
      '"How many ships brought fish," "the total of the fish," "how many ships brought 50 crates or more"... Every time someone asks, my staff counts line by line with their fingers.',
    ]),
    task: tra(['F2 に「魚」を 運んだ 船の数', 'F3 に「魚」の 箱数の 合計', 'F4 に 50箱以上 運んだ 船の数'], [
      'In F2, the number of ships that brought "Fish"',
      'In F3, the total number of crates of "Fish"',
      'In F4, the number of ships that brought 50 or more crates',
    ]),
    grid: () =>
      makeGrid(10, 6, [
        tra<(string | number)[]>(['船', '積荷', '箱数', '', '項目', '答え'], ['Ship', 'Cargo', 'Crates', '', 'Item', 'Answer']),
        [...ARRIVALS[0], '', tr('魚の船の数', 'Fish ships')],
        [...ARRIVALS[1], '', tr('魚の合計', 'Fish total')],
        [...ARRIVALS[2], '', tr('50箱以上の船', 'Ships 50+')],
        ...ARRIVALS.slice(3),
      ], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [90, 60, 60, 24, 110, 60],
    hints: tra([
      '条件に 合う セルを 数えるのは COUNTIF。=COUNTIF(B2:B9,"魚")',
      '条件に 合う 行の 合計は SUMIF。=SUMIF(B2:B9,"魚",C2:C9)（条件の範囲、条件、合計する範囲 の 順）',
      '数の 条件は " で 囲んで 書く。=COUNTIF(C2:C9,">=50")',
    ], [
      'To count the cells that match a condition, use COUNTIF. =COUNTIF(B2:B9,"Fish")',
      'To total the rows that match a condition, use SUMIF. =SUMIF(B2:B9,"Fish",C2:C9) (in the order: range to check, condition, range to total)',
      'Write number conditions inside ". =COUNTIF(C2:C9,">=50")',
    ]),
    check: (c) =>
      first(
        expectNum(c, 'F2', ARRIVALS.filter(([, k]) => k === CARGO_FISH).length, 'COUNTIF'),
        expectNum(c, 'F3', ARRIVALS.reduce((a, [, k, n]) => a + (k === CARGO_FISH ? n : 0), 0), 'SUMIF'),
        expectNum(c, 'F4', ARRIVALS.filter(([, , n]) => n >= 50).length, 'COUNTIF'),
      ),
    reward: { exp: 110, gold: 130, skill: 'countif' },
    thanks: tra([
      '見事だ。聞かれた 瞬間に 答えが 出る……もう 指で 数える 必要は ないな。',
      '町の 悩みを すべて 解決して くれて、本当に ありがとう。',
      '桟橋の 結界も とけたはずだ。どうか 幽霊船の 船長を 止めてくれ。港の 未来を たのむ。',
    ], [
      'Excellent. The answer appears the moment someone asks... No more counting on fingers.',
      'Thank you, truly, for solving all of the town\'s troubles.',
      'The barrier on the pier should be gone now. Please stop the ghost ship\'s captain. The harbor\'s future is in your hands.',
    ]),
    notLast: {
      introHead: tra(['港長の ミナトだ。よく 来てくれた。', 'ひとつ、この 入港記録を 集計してほしい。'], [
        'I\'m Minato, the harbormaster. Thank you for coming.',
        'There\'s one thing: I\'d like you to total up these arrival records.',
      ]),
      thanksTail: tra(['港には まだ 困っている 者が いる。', '頭の上に「！」の 出ている 者の 話も、聞いてやってくれ。'], [
        'There are still people in the harbor who need help.',
        'Please listen to anyone with a "!" over their head, too.',
      ]),
    },
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 幽霊船の扉（謎解き）
const CARGO: [string, number][] = named(
  [
    ['木箱', 120],
    ['タル', 80],
    ['網', 100],
    ['帆布', 99],
    ['大砲', 150],
  ],
  ['Crate', 'Barrel', 'Net', 'Canvas', 'Cannon'],
)
const TREASURE_VAL: [string, number][] = named(
  [
    ['王冠', 1200],
    ['指輪', 500],
    ['首かざり', 999],
    ['銀貨', 300],
    ['宝剣', 1000],
    ['古い鍵', 450],
  ],
  ['Crown', 'Ring', 'Necklace', 'Silver Coin', 'Royal Sword', 'Old Key'],
)
const CHESTS: [string, number][] = named(
  [
    ['金貨', 300],
    ['宝石', 500],
    ['金貨', 150],
    ['地図', 50],
    ['金貨', 250],
    ['宝石', 400],
  ],
  ['Gold', 'Jewels', 'Gold', 'Map', 'Gold', 'Jewels'],
)
const COIN = tr('金貨', 'Gold')
const [HEAVY, LIGHT] = tra(['重', '軽'], ['Heavy', 'Light'])
const [R_GOLD, R_SILVER, R_BRONZE] = tra(['金', '銀', '銅'], ['Gold', 'Silver', 'Bronze'])

Object.assign(QUESTS, {
  ship_if: {
    id: 'ship_if',
    kind: 'puzzle',
    town: 'ship',
    npc: '積荷の扉',
    title: tr('積荷の扉', 'Door of Cargo'),
    intro: tra(['扉に、積荷の 重さの 表が 刻まれている。', '「重さ 100 以上の 荷は 重、それ以外は 軽 と 記せ」――と 読める。'], [
      'A table of cargo weights is carved into the door.',
      'It reads: "Mark cargo weighing 100 or more as Heavy, and the rest as Light."',
    ]),
    task: tra(['C2:C6 に、重さが 100以上なら「重」、それ以外は「軽」と 記せ', '※ 手で 書いても、扉は 開かないようだ'], [
      'In C2:C6, mark "Heavy" if the weight is 100 or more, otherwise "Light"',
      '* Writing it by hand doesn\'t seem to open the door',
    ]),
    grid: () => makeGrid(7, 3, [tra<(string | number)[]>(['積荷', '重さ', '区分'], ['Cargo', 'Weight', 'Class']), ...CARGO.map(([n, v]) => [n, v])]),
    colWidths: [80, 60, 60],
    hints: [],
    check: (c) => eachVal(c, CARGO.map(([, v], i) => [`C${i + 2}`, v >= 100 ? HEAVY : LIGHT]), 'IF', true),
    reward: { exp: 60, gold: 0 },
    thanks: tra(['積荷の 文字が 青白く 光り、扉の 鎖が ほどけた！'], [
      'The words on the cargo glow pale blue, and the chains on the door come loose!',
    ]),
  },
  ship_nested: {
    id: 'ship_nested',
    kind: 'puzzle',
    town: 'ship',
    npc: '階級の扉',
    title: tr('階級の扉', 'Door of Ranks'),
    intro: tra(['扉には 宝の 名と 価値が 並んでいる。', '「価値 1000 以上は 金、500 以上は 銀、それ未満は 銅。すべての 宝に 階級を 刻め」――と 読める。'], [
      'The door lists the names and values of treasures.',
      'It reads: "Value 1000 or more is Gold, 500 or more is Silver, and less is Bronze. Carve a rank for every treasure."',
    ]),
    task: tra(['C2:C7 に、価値が 1000以上なら「金」、500以上なら「銀」、それ未満は「銅」と 刻め'], [
      'In C2:C7, carve "Gold" if the value is 1000 or more, "Silver" if 500 or more, otherwise "Bronze"',
    ]),
    grid: () => makeGrid(8, 3, [tra<(string | number)[]>(['宝', '価値', '階級'], ['Treasure', 'Value', 'Rank']), ...TREASURE_VAL.map(([n, v]) => [n, v])]),
    colWidths: [90, 60, 60],
    hints: [],
    check: (c) => eachVal(c, TREASURE_VAL.map(([, v], i) => [`C${i + 2}`, v >= 1000 ? R_GOLD : v >= 500 ? R_SILVER : R_BRONZE]), 'IF', true),
    reward: { exp: 60, gold: 0 },
    thanks: tra(['金・銀・銅の 光が 扉に 宿り、ゆっくりと 開いていく！'], [
      'The light of gold, silver and bronze fills the door, and it slowly opens!',
    ]),
  },
  ship_countif: {
    id: 'ship_countif',
    kind: 'puzzle',
    town: 'ship',
    npc: '宝の扉',
    title: tr('宝の扉', 'Door of Treasure'),
    intro: tra(['船長室へ 続く 最後の扉。', '宝箱の 中身と 価値の 一覧が 刻まれている。', '「金貨の 箱は いくつか。金貨の 価値は 合わせて いくらか」――と 読める。'], [
      'The last door before the captain\'s cabin.',
      'A list of treasure chest contents and their values is carved into it.',
      'It reads: "How many chests hold Gold? What is the Gold worth in all?"',
    ]),
    task: tra(['E2 に「金貨」の 箱の数を 示せ', 'E3 に「金貨」の 価値の 合計を 示せ'], [
      'In E2, show the number of "Gold" chests',
      'In E3, show the total value of the "Gold"',
    ]),
    grid: () =>
      makeGrid(8, 5, [
        tra<(string | number)[]>(['中身', '価値', '', '問い', '答え'], ['Contents', 'Value', '', 'Question', 'Answer']),
        [...CHESTS[0], '', tr('金貨の箱', 'Gold chests')],
        [...CHESTS[1], '', tr('金貨の価値', 'Gold value')],
        ...CHESTS.slice(2),
      ]),
    colWidths: [70, 60, 24, 90, 60],
    hints: [],
    check: (c) =>
      first(
        pz(c, 'E2', CHESTS.filter(([k]) => k === COIN).length, 'COUNTIF'),
        pz(c, 'E3', CHESTS.reduce((a, [k, v]) => a + (k === COIN ? v : 0), 0), 'SUMIF'),
      ),
    reward: { exp: 70, gold: 0 },
    thanks: tra(['金貨が じゃらじゃらと 鳴り響き、船長室の 扉が 開いた……！'], [
      'The gold coins jingle and clatter, and the door to the captain\'s cabin opens...!',
    ]),
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第4章 ルックアップ（検索）
/** 関数を 使っているかだけを 確かめる（値の 判定は 別に 行う） */
const needFn = (c: CheckCtx, cells: string[], fn: string, vague = false) => {
  const a = cells.find((x) => !usesFn(c.raw(x), fn))
  if (!a) return null
  return vague
    ? tr(`${a} の 答えは 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。`, `The answer in ${a} is right, but... the door doesn't react. There seems to be a rule about how to get it.`)
    : tr(`${a} は 合っている！ でも ${fn} を 使って 探してみよう。`, `${a} is right! But try finding it with ${fn}.`)
}

const ADDRESS: [number, string, string][] = tra<[number, string, string][]>(
  [
    [101, 'サガス', '城 1番'],
    [102, 'ヒキダス', '城下 2番'],
    [103, 'シラベ', '港 3番'],
    [104, 'ミツケ', '森 4番'],
    [105, 'サーチ', '丘 5番'],
    [106, 'ケンサ', '川 6番'],
    [107, 'クエリ', '谷 7番'],
  ],
  [
    [101, 'Sagasu', 'Castle 1'],
    [102, 'Fetch', 'Town 2'],
    [103, 'Probe', 'Harbor 3'],
    [104, 'Finder', 'Forest 4'],
    [105, 'Search', 'Hill 5'],
    [106, 'Scan', 'River 6'],
    [107, 'Query', 'Valley 7'],
  ],
)
const PRICE_LIST: [number, string, number][] = tra<[number, string, number][]>(
  [
    [11, 'やくそう', 8],
    [12, 'どくけしそう', 10],
    [13, 'ワープのはね', 25],
    [14, 'せいすい', 20],
    [15, 'まほうのせいすい', 300],
  ],
  [
    [11, 'Herb', 8],
    [12, 'Antidote', 10],
    [13, 'Warp Wing', 25],
    [14, 'Holy Water', 20],
    [15, 'Magic Holy Water', 300],
  ],
)
const ORDER_CODES = [14, 11, 15, 12]
const RANKS: [number, string][] = tra<[number, string][]>(
  [
    [0, '見習い'],
    [60, '兵士'],
    [80, '騎士'],
    [95, '近衛'],
  ],
  [
    [0, 'Trainee'],
    [60, 'Soldier'],
    [80, 'Knight'],
    [95, 'Guard'],
  ],
)
const SOLDIERS: [string, number][] = named(
  [
    ['ヤリ', 72],
    ['タテ', 95],
    ['ユミ', 58],
    ['オノ', 80],
    ['ツエ', 88],
  ],
  ['Lance', 'Shield', 'Bow', 'Axe', 'Staff'],
)
const rankOf = (n: number) => [...RANKS].reverse().find(([t]) => n >= t)![1]
const CATALOG: [number, string][] = tra<[number, string][]>(
  [
    [201, '表計算の書'],
    [202, '関数大全'],
    [203, '参照の秘術'],
    [204, '条件の海図'],
    [205, '検索の地図'],
  ],
  [
    [201, 'Book of Sheets'],
    [202, 'All the Functions'],
    [203, 'Secrets of Reference'],
    [204, 'Chart of Conditions'],
    [205, 'Map of Searching'],
  ],
)
const CARDS = [203, 208, 201, 205, 210]
const KNIGHTS: [string, string, number][] = tra<[string, string, number][]>(
  [
    ['アーサ', '剣', 7],
    ['ベディ', '槍', 3],
    ['ガウェ', '弓', 12],
    ['ラン', '盾', 5],
    ['パーシ', '剣', 9],
    ['トリス', '弓', 1],
  ],
  [
    ['Arth', 'Sword', 7],
    ['Bedi', 'Spear', 3],
    ['Gawe', 'Bow', 12],
    ['Lanse', 'Shield', 5],
    ['Perci', 'Sword', 9],
    ['Tris', 'Bow', 1],
  ],
)
const STOCK: [string, number][] = named(
  [
    ['パン', 40],
    ['ワイン', 12],
    ['チーズ', 25],
    ['リンゴ', 60],
    ['ハチミツ', 8],
  ],
  ['Bread', 'Wine', 'Cheese', 'Apples', 'Honey'],
)
const WANTS = tra(['チーズ', 'ミルク', 'パン', 'ハチミツ', 'サカナ'], ['Cheese', 'Milk', 'Bread', 'Honey', 'Fish'])
const stockOf = (k: string) => STOCK.find(([n]) => n === k)?.[1] ?? NONE
const UNLISTED = tr('未登録', 'Unlisted')

Object.assign(QUESTS, {
  lookup_vlookup: {
    id: 'lookup_vlookup',
    town: 'lookup',
    npc: '郵便屋ポスト',
    title: tr('宛名さがし', 'Finding the Addressee'),
    intro: tra([
      'あっ、旅の方！ 郵便屋の ポストです！',
      'この 手紙、宛先が「105番」としか 書いてなくて……住所録の 中から、105番の 人を 探さなきゃ いけないんです。',
      'いつもは 上から 1行ずつ 指で たどるんですけど、呪いのせいか、何回 探しても 見つからないんです……！',
    ], [
      'Oh, a traveler! I\'m Post, the mail carrier!',
      'This letter only says "No. 105" for the address... I have to find person No. 105 in the address book.',
      'I usually trace it line by line from the top with my finger, but maybe it\'s the curse... No matter how many times I look, I can\'t find them...!',
    ]),
    task: tra(['F2 に、E2 の 番号（105）の 人の 名前を 出そう', '=VLOOKUP(探す値, 範囲, 何列目, FALSE) を 使う'], [
      'In F2, show the name of the person with E2\'s number (105)',
      'Use =VLOOKUP(value to find, range, column number, FALSE)',
    ]),
    grid: () => makeGrid(10, 6, [tra<(string | number)[]>(['番号', '名前', '住所', '', '探す番号', '名前'], ['No.', 'Name', 'Address', '', 'Find No.', 'Name']), [...ADDRESS[0], '', 105], ...ADDRESS.slice(1)], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [60, 80, 80, 24, 80, 80],
    hints: tra([
      'VLOOKUP は「表の 左端の 列で 探して、同じ行の 右の 列を 取り出す」関数です。',
      '範囲は 表 ぜんたい A2:C8。名前は 範囲の 左から 2列目。',
      'F2 に =VLOOKUP(E2,A2:C8,2,FALSE)。最後の FALSE は「ぴったり 同じ 値を 探す」という 意味です。',
    ], [
      'VLOOKUP is a function that "searches the leftmost column of a table and pulls out a column to the right in the same row."',
      'The range is the whole table, A2:C8. The name is the 2nd column from the left of the range.',
      '=VLOOKUP(E2,A2:C8,2,FALSE) in F2. The FALSE at the end means "find an exact match."',
    ]),
    check: (c) => expectVal(c, 'F2', ADDRESS[4][1], 'VLOOKUP'),
    reward: { exp: 120, gold: 130, skill: 'vlookup' },
    thanks: tra([
      'サーチさん！ 丘の 5番地ですね！',
      '番号を 入れるだけで 名前が 出てくる……。これなら 何百人 いても 一瞬です！',
      'さっそく 届けてきます。ありがとうございました！',
    ], [
      'Mr. Search! Number 5 on the Hill!',
      'Just enter the number, and the name pops out... Even with hundreds of people, it\'s instant!',
      'I\'ll go deliver it right away. Thank you so much!',
    ]),
  },

  lookup_col: {
    id: 'lookup_col',
    town: 'lookup',
    npc: '道具屋のカタログ',
    title: tr('注文書の転記', 'Copying the Order Form'),
    intro: tra([
      'いらっしゃい。道具屋の カタログよ。',
      'お城から 注文書が 届いたの。品番しか 書いてないから、右の 商品表を 見て 品名と 単価を 書き写すんだけど……',
      '1行ずつ 目で 探して 写していると、行を まちがえて しまうのよ。何か いい 方法は ないかしら？',
    ], [
      'Welcome. I\'m Catalog, the shopkeeper.',
      'An order form came from the castle. It only has item numbers, so I look at the product list on the right and copy out the names and prices...',
      'But when I search by eye and copy line by line, I end up on the wrong line. Isn\'t there a better way?',
    ]),
    task: tra(['B2:B5 に 品名、C2:C5 に 単価を、商品表（F2:H6）から 取り出そう', '1つ 作って 下へ コピー。商品表の 範囲は $ で 固定'], [
      'Pull the item names into B2:B5 and the prices into C2:C5 from the product list (F2:H6)',
      'Build one and copy it down. Lock the product list range with $',
    ]),
    grid: () => makeGrid(8, 8, [tra<(string | number)[]>(['品番', '品名', '単価', '', '', '品番', '品名', '単価'], ['Code', 'Item', 'Price', '', '', 'Code', 'Item', 'Price']), [ORDER_CODES[0], '', '', '', '', ...PRICE_LIST[0]], ...PRICE_LIST.slice(1).map((p, i) => [ORDER_CODES[i + 1] ?? '', '', '', '', '', ...p])], ['A1', 'B1', 'C1', 'F1', 'G1', 'H1']),
    colWidths: [50, 110, 60, 20, 20, 50, 110, 60],
    hints: tra([
      '品名は 商品表（F2:H6）の 2列目、単価は 3列目。',
      '下へ コピーしても 商品表が ずれないように、$F$2:$H$6 と 固定するのが コツよ。',
      'B2 に =VLOOKUP(A2,$F$2:$H$6,2,FALSE)、C2 に =VLOOKUP(A2,$F$2:$H$6,3,FALSE)。どちらも 5行目まで オートフィル。',
    ], [
      'The item name is the 2nd column of the product list (F2:H6), and the price is the 3rd.',
      'The trick is to lock it as $F$2:$H$6 so the product list doesn\'t shift when you copy down.',
      '=VLOOKUP(A2,$F$2:$H$6,2,FALSE) in B2 and =VLOOKUP(A2,$F$2:$H$6,3,FALSE) in C2. AutoFill both down to row 5.',
    ]),
    check: (c) =>
      first(
        ...ORDER_CODES.map((code, i) => expectVal(c, `B${i + 2}`, PRICE_LIST.find(([k]) => k === code)![1], 'VLOOKUP')),
        ...ORDER_CODES.map((code, i) => expectNum(c, `C${i + 2}`, PRICE_LIST.find(([k]) => k === code)![2], 'VLOOKUP')),
      ),
    reward: { exp: 130, gold: 140, skill: 'colindex' },
    thanks: tra([
      'まあ、品名も 単価も ぴったり！',
      '列番号を 変えるだけで、同じ 表から 別の 情報が 取り出せるのね。',
      '商品表を 固定するのも 忘れずに……サンショウの 人たちが 言ってた「$」って これのことね。',
    ], [
      'Oh my, the names and prices are spot on!',
      'Just change the column number, and you can pull different information from the same table.',
      'And don\'t forget to lock the product list... So this is the "$" the people in Refton were talking about.',
    ]),
  },

  lookup_approx: {
    id: 'lookup_approx',
    town: 'lookup',
    npc: '兵士長ハンテイ',
    title: tr('兵士の階級', 'Soldiers\' Ranks'),
    intro: tra([
      '本官は 兵士長の ハンテイである！',
      '試験の 点数で 階級を 決める。0点から 見習い、60点から 兵士、80点から 騎士、95点から 近衛だ。',
      'だが「72点は……60以上で 80未満だから……」と 1人ずつ 考えていては 日が 暮れる！',
    ], [
      'I am Captain Hantei!',
      'Ranks are set by exam score: Trainee from 0, Soldier from 60, Knight from 80, and Guard from 95.',
      'But thinking it through for each person, "72 is... 60 or more but under 80, so..." will take all day!',
    ]),
    task: tra(['C2:C6 に、点数に 応じた 階級を 出そう（階級表は E2:F5）', 'VLOOKUP の 4つ目を TRUE に すると「以下で いちばん 近い 値」を 探せる'], [
      'In C2:C6, show the rank for each score (the rank table is E2:F5)',
      'Set the 4th part of VLOOKUP to TRUE to find "the closest value at or below"',
    ]),
    grid: () => makeGrid(8, 6, [tra<(string | number)[]>(['兵士', '点数', '階級', '', '点数', '階級'], ['Soldier', 'Score', 'Rank', '', 'Score', 'Rank']), ...SOLDIERS.map(([n, v], i) => [n, v, '', '', ...(RANKS[i] ?? [])])], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [60, 60, 70, 24, 60, 70],
    hints: tra([
      '4つ目を TRUE（近似一致）に すると、ぴったりの 値が なくても「探す値 以下で いちばん 大きい 値」の 行が 見つかる。',
      '72点なら 60の 行 → 兵士。階級表は 小さい順に 並べておくのが ルールだ。',
      'C2 に =VLOOKUP(B2,$E$2:$F$5,2,TRUE) → C6 まで オートフィル。',
    ], [
      'Set the 4th part to TRUE (approximate match), and even without an exact value, it finds the row with "the largest value at or below the one you\'re looking for."',
      'For 72, that\'s the 60 row → Soldier. The rule is to sort the rank table from smallest to largest.',
      '=VLOOKUP(B2,$E$2:$F$5,2,TRUE) in C2 → AutoFill down to C6.',
    ]),
    check: (c) => eachVal(c, SOLDIERS.map(([, v], i) => [`C${i + 2}`, rankOf(v)]), 'VLOOKUP'),
    reward: { exp: 140, gold: 150, skill: 'approx' },
    thanks: tra([
      '見事で ある！ 95点の タテは 近衛、58点の ユミは 見習いだ。',
      '「以上・未満」の 区切りを 表に しておけば、IF を 何個も 重ねなくて よいのだな。',
      '階級表を 書きかえれば 基準も すぐ 変えられる。敬礼！',
    ], [
      'Splendid! Shield, with 95, is a Guard, and Bow, with 58, is a Trainee.',
      'Put the "at least / under" cutoffs in a table, and there\'s no need to stack IF after IF.',
      'Change the rank table, and the standards change right away too. Salute!',
    ]),
  },

  lookup_iferror: {
    id: 'lookup_iferror',
    town: 'lookup',
    npc: '司書ショコ',
    title: tr('貸出カードの整理', 'Sorting the Library Cards'),
    intro: tra([
      'こんにちは……。図書館の 司書、ショコです。',
      '貸出カードの 番号から 本の 名前を 出したいのですが、目録に ない 番号が まじっていて……',
      'そこだけ「#N/A」という 不気味な 文字が 出るんです。……これも 城の 書庫の 呪いでしょうか。',
    ], [
      'Hello... I\'m Shoko, the librarian.',
      'I want to show the book titles from the library card numbers, but some of the numbers aren\'t in the catalog...',
      'Only those show this eerie "#N/A." ...Is this the curse of the castle library, too?',
    ]),
    task: tra(['B2:B6 に、番号の 本の 名前を 出そう（目録は D2:E6）', '目録に ない 番号は「未登録」と 出す'], [
      'In B2:B6, show the title of each book by number (the catalog is D2:E6)',
      'Show "Unlisted" for numbers that aren\'t in the catalog',
    ]),
    grid: () => makeGrid(8, 5, [tra<(string | number)[]>(['番号', '書名', '', '番号', '書名'], ['No.', 'Title', '', 'No.', 'Title']), ...CARDS.map((n, i) => [n, '', '', ...(CATALOG[i] ?? [])])], ['A1', 'B1', 'D1', 'E1']),
    colWidths: [60, 100, 24, 60, 110],
    hints: tra([
      'VLOOKUP で 見つからないと #N/A エラーに なる。',
      'IFERROR(計算, エラーの ときの 値) で 包むと、エラーの ときだけ 別の 値を 出せる。',
      'B2 に =IFERROR(VLOOKUP(A2,$D$2:$E$6,2,FALSE),"未登録") → B6 まで オートフィル。',
    ], [
      'When VLOOKUP can\'t find something, you get a #N/A error.',
      'Wrap it in IFERROR(calculation, value if error), and you can show something else only when there\'s an error.',
      '=IFERROR(VLOOKUP(A2,$D$2:$E$6,2,FALSE),"Unlisted") in B2 → AutoFill down to B6.',
    ]),
    check: (c) =>
      first(
        eachVal(c, CARDS.map((n, i) => [`B${i + 2}`, CATALOG.find(([k]) => k === n)?.[1] ?? UNLISTED]), 'IFERROR'),
        needFn(c, CARDS.map((_, i) => `B${i + 2}`), 'VLOOKUP'),
      ),
    reward: { exp: 140, gold: 150, skill: 'iferror' },
    thanks: tra([
      '#N/A が 消えて「未登録」に……！ ほっとしました。',
      'エラーを こわがらずに、出たときの 答えを 先に 決めておく……。IFERROR、覚えておきます。',
      '目録に ない 本は、あとで 登録しておきますね。',
    ], [
      'The #N/A is gone, and it says "Unlisted"...! What a relief.',
      'Don\'t fear errors; decide ahead of time what to show when they appear... I\'ll remember IFERROR.',
      'I\'ll add the books that aren\'t in the catalog later.',
    ]),
  },

  lookup_xlookup: {
    id: 'lookup_xlookup',
    town: 'lookup',
    npc: '騎士団の書記ロール',
    title: tr('騎士番号の名簿', 'The Knight Roster'),
    intro: tra([
      '騎士団の 書記、ロールだ。',
      '名簿は 左から「名前・部隊・騎士番号」の 順。番号から 名前を 引きたいのだが……',
      'VLOOKUP は 探す列より 左を 取り出せない、と 聞いた。名簿を 並べかえる わけにも いかん。困った。',
    ], [
      'I\'m Roll, clerk of the Knights.',
      'The roster runs "Name, Unit, Knight No." from left to right. I want to look up names by number, but...',
      'I\'ve heard VLOOKUP can\'t pull out columns to the left of the one it searches. And I can\'t go rearranging the roster. I\'m stuck.',
    ]),
    task: tra(['F2 に、騎士番号 5 の 騎士の 名前を 出そう', 'F3 に、騎士番号 12 の 騎士の 部隊を 出そう', 'XLOOKUP(探す値, 探す列, 取り出す列) を 使う'], [
      'In F2, show the name of knight No. 5',
      'In F3, show the unit of knight No. 12',
      'Use XLOOKUP(value to find, column to search, column to return)',
    ]),
    grid: () => makeGrid(9, 6, [tra<(string | number)[]>(['名前', '部隊', '騎士番号', '', '騎士番号', '答え'], ['Name', 'Unit', 'Knight No.', '', 'Knight No.', 'Answer']), [...KNIGHTS[0], '', 5], [...KNIGHTS[1], '', 12], ...KNIGHTS.slice(2)], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [70, 50, 70, 24, 70, 70],
    hints: tra([
      'XLOOKUP は「探す列」と「取り出す列」を 別々に 指定する。だから 左の 列も 取り出せる。',
      '名前なら =XLOOKUP(E2,C2:C7,A2:A7)。探すのは C列、取り出すのは A列。',
      '部隊なら 取り出す列を B2:B7 に。F3 に =XLOOKUP(E3,C2:C7,B2:B7)。',
    ], [
      'XLOOKUP lets you set "the column to search" and "the column to return" separately. That\'s why it can return columns to the left.',
      'For the name: =XLOOKUP(E2,C2:C7,A2:A7). It searches column C and returns column A.',
      'For the unit, change the return column to B2:B7. =XLOOKUP(E3,C2:C7,B2:B7) in F3.',
    ]),
    check: (c) => first(expectVal(c, 'F2', KNIGHTS[3][0], 'XLOOKUP'), expectVal(c, 'F3', KNIGHTS[2][1], 'XLOOKUP')),
    reward: { exp: 150, gold: 160, skill: 'xlookup' },
    thanks: tra([
      '5番は ラン、12番は 弓部隊の ガウェ か。名簿を 並べかえずに 済んだ！',
      '探す列と 取り出す列を 別に 決められる……XLOOKUP、なんと 自由な 関数だ。',
      '騎士団の 記録も、これで 迷わず 引ける。感謝する。',
    ], [
      'No. 5 is Lanse, and No. 12 is Gawe of the Bow unit. I didn\'t have to rearrange the roster!',
      'You can choose the column to search and the column to return separately... What a free-spirited function XLOOKUP is.',
      'Now the Knights\' records can be looked up without hesitation. You have my thanks.',
    ]),
  },

  lookup_minister: {
    id: 'lookup_minister',
    town: 'lookup',
    npc: '大臣サガス',
    title: tr('城の在庫台帳', 'The Castle Stock Ledger'),
    intro: tra([
      '大臣の サガスで ございます。城下の 悩みを 次々と 解決して くださって いるそうで。',
      '最後に お願いが。晩餐会の 注文表に、城の 在庫を 書き入れたいのです。',
      'ただ、在庫台帳に ない 品も 頼まれておりまして……「なし」と 出したうえで、取り寄せが 必要な 品の 数も 知りたいのです。',
    ], [
      'I am Minister Sagasu. I hear you\'ve been solving the townspeople\'s troubles one after another.',
      'One last request. I\'d like to fill in the castle\'s stock on the banquet order sheet.',
      'However, some items requested aren\'t in the stock ledger... I want to show "None" for those, and also know how many items need to be ordered.',
    ]),
    task: tra(['B2:B6 に 在庫数を 出そう（在庫台帳は F2:G6）。台帳に ない 品は「なし」', 'B8 に「なし」の 品の 数を 出そう'], [
      'In B2:B6, show the stock (the stock ledger is F2:G6). Items not in the ledger show "None"',
      'In B8, show the number of "None" items',
    ]),
    grid: () => makeGrid(9, 7, [tra<(string | number)[]>(['品名', '在庫', '', '', '', '品名', '在庫'], ['Item', 'Stock', '', '', '', 'Item', 'Stock']), ...WANTS.map((w, i) => [w, '', '', '', '', ...(STOCK[i] ?? [])]), [], [tr('取り寄せ', 'To order')]], ['A1', 'B1', 'F1', 'G1', 'A8']),
    colWidths: [80, 60, 20, 20, 20, 80, 60],
    hints: tra([
      'XLOOKUP の 4つ目に「見つからない ときの 値」を 書ける。IFERROR で 包まなくて いい。',
      'B2 に =XLOOKUP(A2,$F$2:$F$6,$G$2:$G$6,"なし") → B6 まで オートフィル。',
      'B8 は COUNTIF で「なし」を 数える。=COUNTIF(B2:B6,"なし")',
    ], [
      'You can write "the value if not found" as the 4th part of XLOOKUP. No need to wrap it in IFERROR.',
      '=XLOOKUP(A2,$F$2:$F$6,$G$2:$G$6,"None") in B2 → AutoFill down to B6.',
      'For B8, count "None" with COUNTIF. =COUNTIF(B2:B6,"None")',
    ]),
    check: (c) =>
      first(
        eachVal(c, WANTS.map((w, i) => [`B${i + 2}`, stockOf(w)] as [string, string | boolean]), 'XLOOKUP'),
        expectNum(c, 'B8', WANTS.filter((w) => stockOf(w) === NONE).length, 'COUNTIF'),
      ),
    reward: { exp: 170, gold: 180, skill: 'notfound' },
    thanks: tra([
      'チーズ 25、パン 40、ハチミツ 8……。ミルクと サカナは 取り寄せ、ですな。',
      '見つからない ときの 答えまで 決めておける。これなら 台帳が どれだけ 大きくても 困りません。',
      '城下の 悩みは これで すべて……。どうか、城の 大書庫に 巣くう ミツカラーヌを 止めてください。',
    ], [
      'Cheese 25, Bread 40, Honey 8... and Milk and Fish need to be ordered, I see.',
      'You can even decide the answer for when it\'s not found. Now no ledger is too big to handle.',
      'That\'s all of the townspeople\'s troubles... Please, stop Notfoundra, who nests in the castle\'s Great Library.',
    ]),
    notLast: {
      introHead: tra(['大臣の サガスで ございます。よく お越しくださいました。', 'お願いが ございます。晩餐会の 注文表に、城の 在庫を 書き入れたいのです。'], [
        'I am Minister Sagasu. Thank you for coming.',
        'I have a request. I\'d like to fill in the castle\'s stock on the banquet order sheet.',
      ]),
      thanksTail: tra(['城下には まだ 困っている 者が おります。どうか、頭の上に「！」の 出ている 者の 話も 聞いてやって ください。'], [
        'There are still people in town who need help. Please listen to anyone with a "!" over their head, too.',
      ]),
    },
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 城の大書庫の扉（謎解き）
const SHELVES: [number, string, string][] = tra<[number, string, string][]>(
  [
    [301, '星の書', '北'],
    [302, '風の書', '東'],
    [303, '水の書', '南'],
    [304, '火の書', '西'],
    [305, '土の書', '中'],
  ],
  [
    [301, 'Book of Stars', 'North'],
    [302, 'Book of Wind', 'East'],
    [303, 'Book of Water', 'South'],
    [304, 'Book of Fire', 'West'],
    [305, 'Book of Earth', 'Center'],
  ],
)
const AUTHORS: [number, string, string][] = tra<[number, string, string][]>(
  [
    [401, '月の書', 'ルナ'],
    [402, '陽の書', 'ソル'],
    [403, '雲の書', 'クモ'],
    [404, '雷の書', 'ライ'],
    [405, '霧の書', 'キリ'],
  ],
  [
    [401, 'Book of the Moon', 'Luna'],
    [402, 'Book of the Sun', 'Sol'],
    [403, 'Book of Clouds', 'Nimbus'],
    [404, 'Book of Thunder', 'Rai'],
    [405, 'Book of Mist', 'Kiri'],
  ],
)
const SEALED: [number, string][] = tra<[number, string][]>(
  [
    [501, '始まりの書'],
    [502, '中の書'],
    [503, '終わりの書'],
    [504, '禁じられた書'],
  ],
  [
    [501, 'Book of Beginnings'],
    [502, 'Book of the Middle'],
    [503, 'Book of Endings'],
    [504, 'Forbidden Book'],
  ],
)
const SEEK = [503, 509, 501, 504]

Object.assign(QUESTS, {
  lib_shelf: {
    id: 'lib_shelf',
    kind: 'puzzle',
    town: 'library',
    npc: '棚の扉',
    title: tr('棚の扉', 'Door of Shelves'),
    intro: tra(['扉に 本の 目録が 刻まれている。', '「304番の 書は いずこの 棚に 眠る？ 目録から 引き 示せ」――と 読める。'], [
      'A catalog of books is carved into the door.',
      'It reads: "On which shelf does book No. 304 sleep? Look it up in the catalog and show it."',
    ]),
    task: tra(['F2 に、E2 の 番号の 本が ある 棚を 示せ', '※ 目で 探して 書いても、扉は 開かないようだ'], [
      'In F2, show the shelf where the book with E2\'s number is kept',
      '* Searching by eye and writing it in doesn\'t seem to open the door',
    ]),
    grid: () => makeGrid(7, 6, [tra<(string | number)[]>(['番号', '書名', '棚', '', '番号', '棚'], ['No.', 'Title', 'Shelf', '', 'No.', 'Shelf']), [...SHELVES[0], '', 304], ...SHELVES.slice(1)]),
    colWidths: [60, 70, 50, 24, 60, 50],
    hints: [],
    check: (c) => expectVal(c, 'F2', SHELVES[3][2], 'VLOOKUP', true),
    reward: { exp: 80, gold: 0 },
    thanks: tra(['「西」の 文字が 浮かび、書架が 左右に 開いた！'], ['The word "West" appears, and the bookshelves slide apart!']),
  },
  lib_left: {
    id: 'lib_left',
    kind: 'puzzle',
    town: 'library',
    npc: '著者の扉',
    title: tr('著者の扉', 'Door of Authors'),
    intro: tra(['扉には 本の 番号・書名・著者が 並んでいる。', '「ライが 著した 書の 番号を 示せ」――と 読める。', '番号は 著者より 左に ある……。'], [
      'The door lists each book\'s number, title and author.',
      'It reads: "Show the number of the book written by Rai."',
      'The number is to the left of the author...',
    ]),
    task: tra(['F2 に、E2 の 著者が 書いた 本の 番号を 示せ'], ['In F2, show the number of the book written by E2\'s author']),
    grid: () => makeGrid(7, 6, [tra<(string | number)[]>(['番号', '書名', '著者', '', '著者', '番号'], ['No.', 'Title', 'Author', '', 'Author', 'No.']), [...AUTHORS[0], '', AUTHORS[3][2]], ...AUTHORS.slice(1)]),
    colWidths: [60, 70, 60, 24, 60, 60],
    hints: [],
    check: (c) => expectNum(c, 'F2', 404, 'XLOOKUP', 'F2', true),
    reward: { exp: 80, gold: 0 },
    thanks: tra(['404 の 数字が 光り、扉の 錠が はずれた！'], ['The number 404 glows, and the lock on the door comes off!']),
  },
  lib_missing: {
    id: 'lib_missing',
    kind: 'puzzle',
    town: 'library',
    npc: '封印の扉',
    title: tr('封印の扉', 'Door of Seals'),
    intro: tra(['書庫の 最奥へ 続く 扉。', '「求める 書の 名を 記せ。目録に なき 書には『なし』と 記せ」――と 読める。', '1つの 式を すべてに 映せ、とも 刻まれている。'], [
      'The door to the deepest part of the library.',
      'It reads: "Write the name of each book sought. For a book not in the catalog, write None."',
      'It also says to reflect a single formula into them all.',
    ]),
    task: tra(['B2:B5 に 本の 名前を 示せ（目録は E2:F5）', '目録に ない 番号には「なし」と 記せ'], [
      'In B2:B5, show the name of each book (the catalog is E2:F5)',
      'Write "None" for numbers that aren\'t in the catalog',
    ]),
    grid: () => makeGrid(7, 6, [tra<(string | number)[]>(['番号', '書名', '', '', '番号', '書名'], ['No.', 'Title', '', '', 'No.', 'Title']), ...SEEK.map((n, i) => [n, '', '', '', ...SEALED[i]])]),
    colWidths: [60, 100, 20, 20, 60, 100],
    hints: [],
    check: (c) =>
      first(
        eachVal(c, SEEK.map((n, i) => [`B${i + 2}`, SEALED.find(([k]) => k === n)?.[1] ?? NONE]), 'IFERROR', true),
        needFn(c, SEEK.map((_, i) => `B${i + 2}`), 'VLOOKUP', true),
      ),
    reward: { exp: 100, gold: 0 },
    thanks: tra(['封印の 鎖が 1本ずつ ほどけ、最奥の 扉が 開いた……！'], [
      'One by one, the chains of the seal come loose, and the deepest door opens...!',
    ]),
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第5章 ピボリア（複数条件の 集計）
/** 第5章の 表に 出てくる 言葉の 英語（条件の 文字にも 使うので、データ・表・判定で 同じ 言葉に そろえる） */
const EN_WORD: Record<string, string> = {
  北: 'North',
  南: 'South',
  東: 'East',
  西: 'West',
  昼: 'Day',
  夜: 'Night',
  パン: 'Bread',
  肉: 'Meat',
  魚: 'Fish',
  東店: 'East',
  西店: 'West',
  赤組: 'Red',
  白組: 'White',
  小麦: 'Wheat',
  果物: 'Fruit',
  金貨: 'Gold',
  銀貨: 'Silver',
  古: 'Old',
  新: 'New',
  宝石: 'Jewel',
  金塊: 'Ingot',
  冠: 'Crown',
  剣: 'Sword',
}
const w1 = (x: string) => tr(x, EN_WORD[x] ?? x)
const w = <T extends unknown[]>(rows: T[]): T[] => rows.map((r) => r.map((x) => (typeof x === 'string' ? w1(x) : x)) as T)
const PATROL: [string, string][] = w([
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
])
const MARKET: [string, string, number][] = w([
  ['パン', '東店', 120],
  ['肉', '西店', 300],
  ['パン', '西店', 80],
  ['魚', '東店', 200],
  ['パン', '東店', 150],
  ['肉', '東店', 250],
  ['パン', '西店', 90],
  ['パン', '東店', 60],
])
const TAXES: [string, number][] = w([
  ['東', 1200],
  ['西', 800],
  ['東', 600],
  ['東', 1500],
  ['南', 2000],
  ['東', 1000],
  ['西', 1300],
  ['東', 400],
])
const CLASSES: [string, number][] = w([
  ['赤組', 70],
  ['白組', 85],
  ['赤組', 90],
  ['白組', 60],
  ['赤組', 80],
  ['白組', 95],
  ['赤組', 60],
])
const REGION_TAX: [string, number][] = w([
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
])
const REGIONS = ['北', '南', '東', '西'].map(w1)
const HARVEST: [string, string, number][] = w([
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
])
const count2 = <T extends unknown[]>(rows: T[], f: (r: T) => boolean) => rows.filter(f).length
const sumIf = <T extends unknown[]>(rows: T[], f: (r: T) => boolean, v: (r: T) => number) => rows.filter(f).reduce((a, r) => a + v(r), 0)

Object.assign(QUESTS, {
  pivo_countifs: {
    id: 'pivo_countifs',
    town: 'pivoria',
    npc: '衛兵長カゾエ',
    title: tr('夜の見回り', 'The Night Patrol'),
    intro: tra([
      '衛兵長の カゾエだ。王都の 見回りの 記録を まとめている。',
      '陛下に「北地区の 夜の 見回りは 何回か」と 聞かれたのだが……',
      '「北」で 数えると 昼も まざる。「夜」で 数えると 南も まざる。2つの 条件を 同時に 満たす 数が 出せんのだ！',
    ], [
      'I\'m Kazoe, captain of the guard. I keep the records of the capital\'s patrols.',
      'His Majesty asked me, "How many night patrols were there in the North district?" But...',
      'Count by "North" and the day patrols get mixed in. Count by "Night" and the South gets mixed in. I can\'t get the number that meets both conditions at once!',
    ]),
    task: tra(['E2 に、北地区の「夜」の 見回り回数を 出そう', 'E3 に、北地区の「昼」の 見回り回数を 出そう', '=COUNTIFS(範囲1, 条件1, 範囲2, 条件2) を 使う'], [
      'In E2, show the number of "Night" patrols in the North district',
      'In E3, show the number of "Day" patrols in the North district',
      'Use =COUNTIFS(range1, condition1, range2, condition2)',
    ]),
    grid: () => makeGrid(12, 5, [tra<(string | number)[]>(['地区', '時間帯', '', '条件', '回数'], ['District', 'Time', '', 'Condition', 'Count']), [...PATROL[0], '', tr('北・夜', 'North/Night')], [...PATROL[1], '', tr('北・昼', 'North/Day')], ...PATROL.slice(2)], ['A1', 'B1', 'D1', 'E1']),
    colWidths: [60, 70, 24, 70, 60],
    hints: tra([
      'COUNTIF は 条件が 1つ。COUNTIFS（最後に S）は 条件を いくつも 並べられる。',
      '「地区の 範囲と 条件」「時間帯の 範囲と 条件」を ペアで 書く。',
      'E2 に =COUNTIFS(A2:A11,"北",B2:B11,"夜")。E3 は "夜" を "昼" に。',
    ], [
      'COUNTIF takes one condition. COUNTIFS (with an S at the end) lets you line up as many as you like.',
      'Write them in pairs: "the district range and condition," "the time range and condition."',
      '=COUNTIFS(A2:A11,"North",B2:B11,"Night") in E2. For E3, change "Night" to "Day".',
    ]),
    check: (c) =>
      first(
        expectNum(c, 'E2', count2(PATROL, ([a, b]) => a === w1('北') && b === w1('夜')), 'COUNTIFS'),
        expectNum(c, 'E3', count2(PATROL, ([a, b]) => a === w1('北') && b === w1('昼')), 'COUNTIFS'),
      ),
    reward: { exp: 190, gold: 200, skill: 'countifs' },
    thanks: tra([
      '北の 夜は 3回、昼は 2回か。……すばらしい、陛下にも すぐ ご報告できる！',
      '条件を ペアで 並べるだけで、いくつでも しぼりこめるのだな。',
      '見回りの 穴も 一目で わかる。感謝するぞ、旅の者。',
    ], [
      '3 at night and 2 by day in the North... Splendid. I can report to His Majesty right away!',
      'Just line up conditions in pairs, and you can narrow things down as much as you like.',
      'I can spot gaps in the patrols at a glance, too. You have my thanks, traveler.',
    ]),
  },

  pivo_sumifs: {
    id: 'pivo_sumifs',
    town: 'pivoria',
    npc: '市場頭アキナ',
    title: tr('市場の売上', 'Market Sales'),
    intro: tra([
      'あら、いいところに！ 市場を 仕切っている アキナよ。',
      '王宮から「東店の パンの 売上だけ 合計して 出しなさい」って 言われたの。',
      'SUMIF だと 条件は 1つだけでしょう？「パン」で しぼると 西店の 分まで 入っちゃうのよ……。',
    ], [
      'Oh, perfect timing! I\'m Akina. I run the market.',
      'The palace told me, "Total up the Bread sales at the East shop only."',
      'SUMIF only takes one condition, right? If I narrow it down by "Bread," the West shop\'s sales get mixed in...',
    ]),
    task: tra(['F2 に、東店の パンの 売上の 合計を 出そう', '=SUMIFS(合計する範囲, 範囲1, 条件1, 範囲2, 条件2) を 使う'], [
      'In F2, show the total Bread sales at the East shop',
      'Use =SUMIFS(range to total, range1, condition1, range2, condition2)',
    ]),
    grid: () => makeGrid(10, 6, [tra<(string | number)[]>(['品目', '店', '売上', '', '条件', '売上合計'], ['Item', 'Shop', 'Sales', '', 'Condition', 'Total']), [...MARKET[0], '', tr('パン・東店', 'Bread/East')], ...MARKET.slice(1)], ['A1', 'B1', 'C1', 'E1', 'F1']),
    colWidths: [60, 60, 60, 24, 90, 70],
    hints: tra([
      'SUMIFS は「合計する 範囲」を いちばん 最初に 書く。SUMIF（最後に 書く）と 順番が ちがうので 注意！',
      '合計するのは C2:C9。条件は「A列が パン」と「B列が 東店」。',
      'F2 に =SUMIFS(C2:C9,A2:A9,"パン",B2:B9,"東店")',
    ], [
      'SUMIFS puts "the range to total" first of all. Careful: the order is different from SUMIF (where it goes last)!',
      'Total C2:C9. The conditions are "column A is Bread" and "column B is East."',
      '=SUMIFS(C2:C9,A2:A9,"Bread",B2:B9,"East") in F2',
    ]),
    check: (c) => expectNum(c, 'F2', sumIf(MARKET, ([a, b]) => a === w1('パン') && b === w1('東店'), (r) => r[2]), 'SUMIFS'),
    reward: { exp: 200, gold: 210, skill: 'sumifs' },
    thanks: tra([
      '東店の パンは 330G！ 120 と 150 と 60……ぴったりね。',
      '合計する 範囲が 先、あとは 条件の ペアを 並べるだけ。覚えたわ！',
      'これで 店ごと・品目ごとの 報告も こわくないわ。ありがとう！',
    ], [
      'Bread at the East shop: 330G! 120, 150 and 60... spot on.',
      'The range to total comes first, then you just line up pairs of conditions. Got it!',
      'Now reports by shop and by item don\'t scare me at all. Thank you!',
    ]),
  },

  pivo_compare: {
    id: 'pivo_compare',
    town: 'pivoria',
    npc: '税務官ゼイム',
    title: tr('大口の納税', 'Large Tax Payments'),
    intro: tra([
      '……税務官の ゼイムです。',
      '東地区の「1000G 以上の 大口の 納税」だけを 調べよ、と 命じられました。',
      '地区の 条件と、金額の 条件。数えるのも 合計するのも、1件ずつ 目で 見ていては 間違えて しまいます……。',
    ], [
      '...I\'m Zeimu, the tax officer.',
      'I\'ve been ordered to look into only the "large payments of 1000G or more" in the East district.',
      'A district condition and an amount condition. Whether counting or totaling, checking each one by eye, I\'m bound to make mistakes...',
    ]),
    task: tra(['E2 に、東地区で 1000G 以上の 納税の 件数を 出そう', 'E3 に、その 合計金額を 出そう', '「1000以上」の 条件は ">=1000" と " で 囲む'], [
      'In E2, show the number of payments of 1000G or more in the East district',
      'In E3, show their total amount',
      'Write the "1000 or more" condition in quotes, as ">=1000"',
    ]),
    grid: () => makeGrid(10, 5, [tra<(string | number)[]>(['地区', '金額', '', '東・1000以上', ''], ['District', 'Amount', '', 'East, 1000+', '']), [...TAXES[0], '', tr('件数', 'Count')], [...TAXES[1], '', tr('合計', 'Total')], ...TAXES.slice(2)], ['A1', 'B1', 'D1']),
    colWidths: [60, 70, 24, 70, 70],
    hints: tra([
      '数値の 条件も 使える。「1000以上」は ">=1000"。イフポートで 覚えた 書き方と 同じ。',
      '件数は =COUNTIFS(A2:A9,"東",B2:B9,">=1000")',
      '合計は =SUMIFS(B2:B9,A2:A9,"東",B2:B9,">=1000")。合計する 範囲と 条件の 範囲が 同じ 列でも かまわない。',
    ], [
      'You can use number conditions too. "1000 or more" is ">=1000". The same way you learned in Ifport.',
      'The count is =COUNTIFS(A2:A9,"East",B2:B9,">=1000")',
      'The total is =SUMIFS(B2:B9,A2:A9,"East",B2:B9,">=1000"). It\'s fine for the range to total and a condition range to be the same column.',
    ]),
    check: (c) =>
      first(
        expectNum(c, 'E2', count2(TAXES, ([a, v]) => a === w1('東') && v >= 1000), 'COUNTIFS'),
        expectNum(c, 'E3', sumIf(TAXES, ([a, v]) => a === w1('東') && v >= 1000, (r) => r[1]), 'SUMIFS'),
      ),
    reward: { exp: 210, gold: 220, skill: 'ifscompare' },
    thanks: tra([
      '3件で 3700G……。ちょうど 1000G の 納税も ちゃんと 入って いますね。「以上」ですから。',
      '条件に 比べる 記号を 入れれば、金額の しぼりこみも 一瞬……。',
      '帳簿を めくる 夜が、これで 少し 短く なりそうです。',
    ], [
      '3 payments, 3700G... The payment of exactly 1000G is included too. It\'s "or more," after all.',
      'Put a comparison symbol in the condition, and narrowing down by amount takes no time...',
      'My nights of flipping through ledgers should get a little shorter now.',
    ]),
  },

  pivo_average: {
    id: 'pivo_average',
    town: 'pivoria',
    npc: '学者マナブ',
    title: tr('組ごとの成績', 'Scores by Team'),
    intro: tra([
      'やあ、王立学院の 学者、マナブだ。',
      '赤組と 白組で 試験を したのだが、「赤組の 平均点」と「白組の 最高点」を 出したい。',
      'AVERAGE や MAX だと 両方の 組が まざって しまう……。条件つきの 平均や 最大は ないものかね？',
    ], [
      'Hello, I\'m Manabu, a scholar at the Royal Academy.',
      'We gave an exam to the Red and White teams, and I want "the Red team\'s average" and "the White team\'s top score."',
      'But AVERAGE and MAX mix both teams together... Is there no such thing as an average or maximum with a condition?',
    ]),
    task: tra(['E2 に、赤組の 平均点を 出そう（AVERAGEIF）', 'E3 に、白組の 最高点を 出そう（MAXIFS）'], [
      'In E2, show the Red team\'s average score (AVERAGEIF)',
      'In E3, show the White team\'s top score (MAXIFS)',
    ]),
    grid: () => makeGrid(9, 5, [tra<(string | number)[]>(['組', '点数', '', '', ''], ['Team', 'Score', '', '', '']), [...CLASSES[0], '', tr('赤組 平均', 'Red avg')], [...CLASSES[1], '', tr('白組 最高', 'White max')], ...CLASSES.slice(2)], ['A1', 'B1']),
    colWidths: [60, 60, 24, 80, 60],
    hints: tra([
      '=AVERAGEIF(条件の範囲, 条件, 平均する範囲)。SUMIF と 同じ 並び。',
      '=MAXIFS(最大を 探す範囲, 条件の範囲, 条件)。こちらは SUMIFS と 同じ 並びで、探す範囲が 先。',
      'E2 に =AVERAGEIF(A2:A8,"赤組",B2:B8)、E3 に =MAXIFS(B2:B8,A2:A8,"白組")',
    ], [
      '=AVERAGEIF(range to check, condition, range to average). The same order as SUMIF.',
      '=MAXIFS(range to find the max in, range to check, condition). This follows the SUMIFS order, with the range to search first.',
      '=AVERAGEIF(A2:A8,"Red",B2:B8) in E2 and =MAXIFS(B2:B8,A2:A8,"White") in E3',
    ]),
    check: (c) =>
      first(
        expectNum(c, 'E2', sumIf(CLASSES, ([k]) => k === w1('赤組'), (r) => r[1]) / count2(CLASSES, ([k]) => k === w1('赤組')), 'AVERAGEIF'),
        expectNum(c, 'E3', Math.max(...CLASSES.filter(([k]) => k === w1('白組')).map((r) => r[1])), 'MAXIFS'),
      ),
    reward: { exp: 210, gold: 220, skill: 'averageif' },
    thanks: tra([
      '赤組の 平均は 75点、白組の 最高は 95点か。見事だ！',
      '合計・個数・平均・最大……どれも 条件つきに できるのだな。MINIFS で 最低点も 出せる、と。',
      '引数の 並び順の ちがいも、論文に まとめて おこう。',
    ], [
      'The Red team\'s average is 75, and the White team\'s top score is 95. Splendid!',
      'Total, count, average, max... any of them can take a condition. And MINIFS gives the lowest score, I see.',
      'I\'ll write up the differences in argument order in a paper, too.',
    ]),
  },

  pivo_summary: {
    id: 'pivo_summary',
    town: 'pivoria',
    npc: '書記官ショウケイ',
    title: tr('地区別の集計表', 'Totals by District'),
    intro: tra([
      '書記官の ショウケイと 申します。',
      '税の 記録から「地区ごとの 合計」の 表を 作りたいのです。北・南・東・西……',
      '地区ごとに 式を 書き直していては、地区が 増えるたびに 大仕事。1つの 式で すませる 方法は ありませんか？',
    ], [
      'I\'m Shokei, a palace secretary.',
      'I want to make a table of "totals by district" from the tax records. North, South, East, West...',
      'If I rewrite the formula for each district, every new district means a big job. Isn\'t there a way to do it with one formula?',
    ]),
    task: tra(['F2:F5 に、E列の 地区ごとの 税の 合計を 出そう', '条件に 地区の セル（E2）を 使い、1つ 作って 下へ コピー。範囲は $ で 固定'], [
      'In F2:F5, show the total tax for each district in column E',
      'Use the district cell (E2) as the condition, build one formula and copy it down. Lock the ranges with $',
    ]),
    grid: () => makeGrid(12, 6, [tra<(string | number)[]>(['地区', '税', '', '', '地区', '合計'], ['District', 'Tax', '', '', 'District', 'Total']), ...REGION_TAX.map((r, i) => [...r, '', '', REGIONS[i] ?? ''])], ['A1', 'B1', 'E1', 'F1']),
    colWidths: [60, 60, 20, 20, 60, 70],
    hints: tra([
      '条件は "北" と 書くかわりに、北と 書いた セル（E2）を 指定できる。',
      '下へ コピーすると E2 → E3 → E4 と 地区が 変わる。でも 記録の 範囲は ずれては 困るので $ で 固定。',
      'F2 に =SUMIFS($B$2:$B$11,$A$2:$A$11,E2) → F5 まで オートフィル。',
    ], [
      'Instead of writing "North" as the condition, you can point to the cell that says North (E2).',
      'Copy it down, and the district changes: E2 → E3 → E4. But the record ranges mustn\'t shift, so lock them with $.',
      '=SUMIFS($B$2:$B$11,$A$2:$A$11,E2) in F2 → AutoFill down to F5.',
    ]),
    check: (c) => first(...REGIONS.map((k, i) => expectNum(c, `F${i + 2}`, sumIf(REGION_TAX, ([a]) => a === k, (r) => r[1]), 'SUMIFS'))),
    reward: { exp: 220, gold: 230, skill: 'summary' },
    thanks: tra([
      '北 900、南 800、東 1100、西 700……一瞬で 表が できました！',
      '地区の 名前を 変えれば 式は そのまま。地区が 増えても 1行 足すだけですね。',
      'これは まるで「ピボットテーブル」の 手作り版……あ、いえ、王宮の 古い 言い伝えです。',
    ], [
      'North 900, South 800, East 1100, West 700... The table was done in an instant!',
      'Change the district names and the formula stays the same. Even with more districts, I just add a row.',
      'This is like a handmade "pivot table"... Oh, never mind, that\'s just an old palace legend.',
    ]),
  },

  pivo_crosstab: {
    id: 'pivo_crosstab',
    town: 'pivoria',
    npc: '宰相ヒョウマ',
    title: tr('王国の収穫表', 'The Kingdom\'s Harvest Table'),
    intro: tra([
      '宰相の ヒョウマで ございます。陛下に 代わり、お礼と お願いを。',
      '王国の 収穫を「地区 × 作物」の 表に まとめて 陛下に お見せしたいのです。',
      '縦に 地区、横に 作物。……ですが 宝物庫の 魔物の 呪いで、記録は バラバラ。4マス それぞれに 式を 書いていては 日が 暮れます。',
    ], [
      'I am Hyoma, the chancellor. On His Majesty\'s behalf, I bring thanks and a request.',
      'I wish to present the kingdom\'s harvest to His Majesty as a "district × crop" table.',
      'Districts down the side, crops across the top. ...But thanks to the curse of the treasury monster, the records are scattered. Writing a formula in each of the 4 cells would take all day.',
    ]),
    task: tra(['F2:G3 に、地区（E列）× 作物（1行目）ごとの 収穫量の 合計を 出そう', '1つの 式を 作って 4マスに コピー。地区は 列を、作物は 行を $ で 固定'], [
      'In F2:G3, show the total harvest for each district (column E) × crop (row 1)',
      'Build one formula and copy it to all 4 cells. Lock the column for the district and the row for the crop with $',
    ]),
    grid: () =>
      makeGrid(12, 7, [tra<(string | number)[]>(['地区', '作物', '量', '', '', '小麦', '果物'], ['District', 'Crop', 'Amount', '', '', 'Wheat', 'Fruit']), [...HARVEST[0], '', w1('北')], [...HARVEST[1], '', w1('南')], ...HARVEST.slice(2)], ['A1', 'B1', 'C1', 'F1', 'G1', 'E2', 'E3']),
    colWidths: [50, 60, 50, 20, 50, 60, 60],
    hints: tra([
      '条件は 2つ。地区は E2（左の 見出し）、作物は F1（上の 見出し）。',
      '右へ コピーしても E列を 見続けるよう $E2、下へ コピーしても 1行目を 見続けるよう F$1。サンショウで 覚えた 複合参照だ。',
      'F2 に =SUMIFS($C$2:$C$11,$A$2:$A$11,$E2,$B$2:$B$11,F$1) → G3 まで コピー。',
    ], [
      'There are two conditions. The district is E2 (the heading on the left), and the crop is F1 (the heading on top).',
      'Use $E2 so it keeps looking at column E when copied right, and F$1 so it keeps looking at row 1 when copied down. The mixed references you learned in Refton.',
      '=SUMIFS($C$2:$C$11,$A$2:$A$11,$E2,$B$2:$B$11,F$1) in F2 → copy to G3.',
    ]),
    check: (c) =>
      first(
        ...['北', '南'].map(w1).flatMap((area, i) =>
          ['小麦', '果物'].map(w1).map((crop, j) =>
            expectNum(c, `${'FG'[j]}${i + 2}`, sumIf(HARVEST, ([a, b]) => a === area && b === crop, (r) => r[2]), 'SUMIFS'),
          ),
        ),
      ),
    reward: { exp: 240, gold: 250, skill: 'crosstab' },
    thanks: tra([
      '北の 小麦 60、果物 70。南の 小麦 65、果物 90……！ 陛下も お喜びに なりましょう。',
      '縦と 横の 見出しを 条件に して、1つの 式で 表ぜんぶを 埋める……これぞ 集計の 極意。',
      'ですが 王都の 記録を バラバラに した 張本人は、王宮の 宝物庫に 居座る 魔物「バラバラン」。どうか、王国を 救って くだされ。',
    ], [
      'North: Wheat 60, Fruit 70. South: Wheat 65, Fruit 90...! His Majesty will be delighted.',
      'Use the side and top headings as conditions and fill the whole table with one formula... This is the secret art of totals.',
      'But the one who scattered the capital\'s records is the monster "Scatteron," squatting in the palace treasury. Please, save the kingdom.',
    ]),
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 王宮の宝物庫の扉（謎解き）
const COINS: [string, string][] = w([
  ['金貨', '古'],
  ['銀貨', '古'],
  ['金貨', '新'],
  ['金貨', '古'],
  ['銀貨', '新'],
  ['金貨', '古'],
  ['金貨', '新'],
])
const JEWELS: [string, number][] = w([
  ['宝石', 12],
  ['金塊', 30],
  ['宝石', 6],
  ['宝石', 15],
  ['金塊', 8],
  ['宝石', 10],
  ['宝石', 4],
])
const VAULT: [string, string, number][] = w([
  ['東', '冠', 2],
  ['西', '剣', 5],
  ['東', '剣', 3],
  ['西', '冠', 4],
  ['東', '冠', 1],
  ['西', '剣', 2],
  ['東', '剣', 6],
])

Object.assign(QUESTS, {
  trs_count: {
    id: 'trs_count',
    kind: 'puzzle',
    town: 'treasury',
    npc: '金貨の扉',
    title: tr('金貨の扉', 'Door of Gold Coins'),
    intro: tra(['扉に 硬貨の 目録が 刻まれている。', '「古き 金貨は いくつ 眠る？ 数を 示せ」――と 読める。', '金貨で あり、しかも 古い もの……。'], [
      'A list of coins is carved into the door.',
      'It reads: "How many old gold coins sleep here? Show the number."',
      'Coins that are Gold, and Old as well...',
    ]),
    task: tra(['E2 に、「金貨」で「古」の 硬貨の 数を 示せ'], ['In E2, show the number of coins that are "Gold" and "Old"']),
    grid: () => makeGrid(9, 5, [tra<(string | number)[]>(['種類', '年代', '', '古い金貨', ''], ['Type', 'Age', '', 'Old gold', '']), ...COINS], ['A1', 'B1']),
    colWidths: [60, 50, 24, 70, 60],
    hints: [],
    check: (c) => pz(c, 'E2', count2(COINS, ([a, b]) => a === w1('金貨') && b === w1('古')), 'COUNTIFS'),
    reward: { exp: 110, gold: 0 },
    thanks: tra(['「3」の 数字が 金色に 光り、扉が 開いた！'], ['The number "3" glows gold, and the door opens!']),
  },
  trs_sum: {
    id: 'trs_sum',
    kind: 'puzzle',
    town: 'treasury',
    npc: '重さの扉',
    title: tr('重さの扉', 'Door of Weights'),
    intro: tra(['天秤の 紋章が 刻まれた 扉。', '「重さ 10 以上の 宝石、その 重さの 和を 示せ」――と 読める。'], [
      'A door carved with the crest of a scale.',
      'It reads: "Show the sum of the weights of the jewels weighing 10 or more."',
    ]),
    task: tra(['E2 に、重さ 10 以上の「宝石」の 重さの 合計を 示せ'], ['In E2, show the total weight of the "Jewel" items weighing 10 or more']),
    grid: () => makeGrid(9, 5, [tra<(string | number)[]>(['宝', '重さ', '', '重い宝石', ''], ['Treasure', 'Weight', '', 'Heavy jewels', '']), ...JEWELS], ['A1', 'B1']),
    colWidths: [60, 50, 24, 70, 60],
    hints: [],
    check: (c) => pz(c, 'E2', sumIf(JEWELS, ([a, v]) => a === w1('宝石') && v >= 10, (r) => r[1]), 'SUMIFS'),
    reward: { exp: 120, gold: 0 },
    thanks: tra(['天秤が つりあい、扉の 錠が はずれた！'], ['The scale balances, and the lock on the door comes off!']),
  },
  trs_cross: {
    id: 'trs_cross',
    kind: 'puzzle',
    town: 'treasury',
    npc: '王冠の扉',
    title: tr('王冠の扉', 'Door of Crowns'),
    intro: tra(['宝物庫の 最奥へ 続く 扉。', '「東西の 部屋に 眠る 冠と 剣、その 数を 表に 記せ」――と 読める。', '1つの 式を 4つの 枠すべてに 映せ、とも 刻まれている。'], [
      'The door to the deepest part of the treasury.',
      'It reads: "Record in the table the number of crowns and swords sleeping in the East and West rooms."',
      'It also says to reflect a single formula into all four boxes.',
    ]),
    task: tra(['F2:G3 に、部屋（E列）× 宝（1行目）ごとの 数を 示せ'], ['In F2:G3, show the count for each room (column E) × treasure (row 1)']),
    grid: () => makeGrid(9, 7, [tra<(string | number)[]>(['部屋', '宝', '数', '', '', '冠', '剣'], ['Room', 'Treasure', 'Count', '', '', 'Crown', 'Sword']), [...VAULT[0], '', w1('東')], [...VAULT[1], '', w1('西')], ...VAULT.slice(2)]),
    colWidths: [50, 50, 40, 20, 50, 50, 50],
    hints: [],
    check: (c) =>
      first(
        ...['東', '西'].map(w1).flatMap((room, i) =>
          ['冠', '剣'].map(w1).map((t, j) => pz(c, `${'FG'[j]}${i + 2}`, sumIf(VAULT, ([a, b]) => a === room && b === t, (r) => r[2]), 'SUMIFS')),
        ),
      ),
    reward: { exp: 140, gold: 0 },
    thanks: tra(['4つの 枠が 同時に 輝き、王冠の 扉が 重々しく 開いた……！'], [
      'All four boxes shine at once, and the Door of Crowns slowly, heavily opens...!',
    ]),
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 第6章 テキストリア（文字列）
const GUEST_NAMES: [string, string][] = tra<[string, string][]>(
  [
    ['山田', '太郎'],
    ['佐藤', '花子'],
    ['鈴木', '一郎'],
    ['田中', '美咲'],
  ],
  [
    ['John', 'Smith'],
    ['Mary', 'Brown'],
    ['Ken', 'Lee'],
    ['Amy', 'Clark'],
  ],
)
const ITEM_CODES = ['TX-1023', 'NB-2201', 'KS-0450', 'TX-3310']
const PHONES = ['03-1234-5678', '03-8765-4321', '03-2468-1357', '03-5555-0001']
const SIGNS = tra(['パン屋モジモジ', 'テキストリア中央市場', '宿屋ひらがな', 'カタカナ雑貨店本店'], ['Bakery Moji', 'Textria Central Market', 'Hiragana Inn', 'Katakana General Store'])
/** 看板に 入る 文字数（英語は 1文字が 細いので 多め） */
const SIGN_MAX = tra(8, 12)
const MESSY = tra(['  山田 花子', '佐藤  次郎 ', ' 鈴木   一郎'], ['  Mary Brown', 'Ken  Lee ', ' Amy   Clark'])
const COMPANIES = tra(['株式会社モジ', '株式会社テキスト', 'ヨミカキ株式会社'], ['Moji Corporation', 'Textria Corporation', 'The Corporation of Scribes'])
/** 会社名の 略し方（SUBSTITUTE で 置きかえる 文字） */
const [CORP, CORP_SHORT] = tra(['株式会社', '(株)'], ['Corporation', 'Corp.'])
const LONG = tr('長い', 'Long')
const EMAILS = ['taro@moji.jp', 'hanako@text.co', 'ichiro@kaki.ne']
const trim = (t: string) => t.trim().replace(/ +/g, ' ')

/** & で つないでいるか（CONCATENATE でも よい） */
const needJoin = (c: CheckCtx, cells: string[], vague = false) => {
  const a = cells.find((x) => !c.raw(x).includes('&') && !usesFn(c.raw(x), 'CONCATENATE'))
  if (!a) return null
  return vague
    ? tr(`${a} の 答えは 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。`, `The answer in ${a} is right, but... the door doesn't react. There seems to be a rule about how to get it.`)
    : tr(`${a} は 合っている！ でも 文字を そのまま 書かずに、& で つないで 作ってみよう。`, `${a} is right! But instead of typing the text, build it by joining with &.`)
}

Object.assign(QUESTS, {
  text_concat: {
    id: 'text_concat',
    town: 'textria',
    npc: '宿帳係フミ',
    title: tr('宿帳の名前', 'Names for the Register'),
    intro: tra([
      'いらっしゃいませ。宿場の 宿帳係、フミと 申します。',
      '宿帳には 名字と 名前が 別の 欄に 書いてあるのですが、お部屋の 札には「山田 太郎」のように 1つに して 書きたいのです。',
      '1人ずつ 書き写していたら、文字化けの 呪いで 名前が 化けて しまって……。',
    ], [
      'Welcome. I\'m Fumi, keeper of the guest register.',
      'The register has first and last names in separate columns, but I want to write them together on the room tags, like "John Smith."',
      'When I copied them out one by one, the garbling curse scrambled the names...',
    ]),
    task: tra(['C2:C5 に「名字 名前」（間に 空白）を 作ろう', '文字と 文字は「&」で つなぐ。空白は " " と 書く'], [
      'In C2:C5, make "First Last" (with a space between)',
      'Join text with "&". Write a space as " "',
    ]),
    grid: () => makeGrid(6, 3, [tra<(string | number)[]>(['名字', '名前', '札の名前'], ['First', 'Last', 'Tag Name']), ...GUEST_NAMES], ['A1', 'B1', 'C1']),
    colWidths: [60, 60, 110],
    hints: tra([
      '「&」は 文字と 文字を つなぐ 記号。=A2&B2 なら「山田太郎」。',
      '間に 空白を はさむには、空白の 文字 " " を まん中に つなぐ。',
      'C2 に =A2&" "&B2 → C5 まで オートフィル。',
    ], [
      '"&" is the symbol that joins text to text. =A2&B2 gives "JohnSmith."',
      'To put a space between them, join the space text " " in the middle.',
      '=A2&" "&B2 in C2 → AutoFill down to C5.',
    ]),
    check: (c) => first(eachVal(c, GUEST_NAMES.map(([a, b], i) => [`C${i + 2}`, `${a} ${b}`])), needJoin(c, GUEST_NAMES.map((_, i) => `C${i + 2}`))),
    reward: { exp: 260, gold: 260, skill: 'concat' },
    thanks: tra([
      '「山田 太郎」「佐藤 花子」……きれいに つながりました！',
      '名字や 名前を 直せば、札の 名前も 自動で 変わるのですね。',
      'もう 書き写して 化けさせる 心配は ありません。ありがとうございます！',
    ], [
      '"John Smith," "Mary Brown"... They\'re joined perfectly!',
      'If I fix a first or last name, the tag name changes automatically too.',
      'No more worrying about garbling them while copying. Thank you!',
    ]),
  },

  text_leftright: {
    id: 'text_leftright',
    town: 'textria',
    npc: '倉庫番コード',
    title: tr('商品コードの分解', 'Splitting Product Codes'),
    intro: tra([
      'おう、倉庫番の コードだ。',
      '荷物の 商品コードは「TX-1023」みたいに、左の 2文字が 産地、右の 4文字が 品番なんだ。',
      '産地ごと・品番ごとに 棚を 分けたいんだが、1つずつ 目で 読んで 書き分けるのは 骨が 折れるぜ。',
    ], [
      'Hey, I\'m Code, the warehouse keeper.',
      'Product codes look like "TX-1023": the left 2 letters are the origin, and the right 4 digits are the item number.',
      'I want to sort the shelves by origin and item number, but reading each one by eye and writing them out is backbreaking work.',
    ]),
    task: tra(['B2:B5 に、コードの 左から 2文字（産地）を 取り出そう', 'C2:C5 に、コードの 右から 4文字（品番）を 取り出そう'], [
      'In B2:B5, pull out the left 2 characters of each code (origin)',
      'In C2:C5, pull out the right 4 characters of each code (item number)',
    ]),
    grid: () => makeGrid(6, 3, [tra<(string | number)[]>(['コード', '産地', '品番'], ['Code', 'Origin', 'Item No.']), ...ITEM_CODES.map((x) => [x])], ['A1', 'B1', 'C1']),
    colWidths: [90, 60, 60],
    hints: tra([
      '=LEFT(文字列, 文字数) で 左から、=RIGHT(文字列, 文字数) で 右から 取り出せる。',
      '産地は 左の 2文字 → LEFT(A2,2)。品番は 右の 4文字 → RIGHT(A2,4)。',
      'B2 に =LEFT(A2,2)、C2 に =RIGHT(A2,4)。どちらも 5行目まで オートフィル。',
    ], [
      '=LEFT(text, count) takes from the left, and =RIGHT(text, count) takes from the right.',
      'The origin is the left 2 characters → LEFT(A2,2). The item number is the right 4 → RIGHT(A2,4).',
      '=LEFT(A2,2) in B2 and =RIGHT(A2,4) in C2. AutoFill both down to row 5.',
    ]),
    check: (c) =>
      first(
        eachVal(c, ITEM_CODES.map((x, i) => [`B${i + 2}`, x.slice(0, 2)]), 'LEFT'),
        eachVal(c, ITEM_CODES.map((x, i) => [`C${i + 2}`, x.slice(-4)]), 'RIGHT'),
      ),
    reward: { exp: 270, gold: 270, skill: 'leftright' },
    thanks: tra([
      'TX、NB、KS……品番も 0450 の 頭の 0 まで ちゃんと 残ってるな！',
      '左から 何文字、右から 何文字。決まった 形の コードなら 一発だ。',
      'これで 棚分けも あっという間だぜ。ありがとよ！',
    ], [
      'TX, NB, KS... and the item numbers even kept the leading 0 in 0450!',
      'So many from the left, so many from the right. For codes with a fixed shape, it\'s one shot.',
      'Sorting the shelves will be a breeze now. Thanks!',
    ]),
  },

  text_mid: {
    id: 'text_mid',
    town: 'textria',
    npc: '通信士デンワ',
    title: tr('電話番号の局番', 'Phone Exchange Codes'),
    intro: tra([
      '……あ、通信所の デンワです。',
      '電話番号「03-1234-5678」の まん中の 4けた「1234」が 局番で、地区ごとに 決まって いるんです。',
      '左からでも 右からでも ない、まん中の 文字だけ 取り出す 方法って あるんでしょうか……？',
    ], [
      '...Oh, I\'m Denwa from the telegraph office.',
      'In the phone number "03-1234-5678," the middle 4 digits, "1234," are the exchange code, and it depends on the district.',
      'Not from the left, not from the right... Is there a way to pull out just the characters in the middle...?',
    ]),
    task: tra(['B2:B5 に、電話番号の まん中の 4けた（4文字目から 4文字）を 取り出そう', '=MID(文字列, 何文字目から, 何文字) を 使う'], [
      'In B2:B5, pull out the middle 4 digits of the phone number (4 characters starting at the 4th)',
      'Use =MID(text, start position, count)',
    ]),
    grid: () => makeGrid(6, 2, [tra<(string | number)[]>(['電話番号', '局番'], ['Phone', 'Exchange']), ...PHONES.map((x) => [x])], ['A1', 'B1']),
    colWidths: [120, 60],
    hints: tra([
      'MID は「何文字目から」「何文字」を 指定して、まん中の 文字を 取り出す。',
      '「03-1234-5678」の 1 は 4文字目（0・3・- の 次）。そこから 4文字。',
      'B2 に =MID(A2,4,4) → B5 まで オートフィル。',
    ], [
      'MID pulls out characters from the middle: you set "start at which character" and "how many."',
      'In "03-1234-5678," the 1 is the 4th character (after 0, 3 and -). Take 4 from there.',
      '=MID(A2,4,4) in B2 → AutoFill down to B5.',
    ]),
    check: (c) => eachVal(c, PHONES.map((x, i) => [`B${i + 2}`, x.slice(3, 7)]), 'MID'),
    reward: { exp: 280, gold: 280, skill: 'mid' },
    thanks: tra([
      '1234、8765、2468、5555……ぜんぶ 局番だけに なりました！',
      '「何文字目から 何文字」……数え方さえ わかれば、どこでも 切り取れるんですね。',
      '地区ごとの 集計も、SUMIFS で すぐ できそうです。',
    ], [
      '1234, 8765, 2468, 5555... They\'re all just the exchange codes now!',
      '"Start at character X, take Y"... Once you know how to count, you can cut anywhere.',
      'Totals by district should be easy with SUMIFS now, too.',
    ]),
  },

  text_len: {
    id: 'text_len',
    town: 'textria',
    npc: '看板屋カンバ',
    title: tr('看板の文字数', 'Letters on a Sign'),
    intro: tra([
      'いらっしゃい！ 看板屋の カンバよ。',
      'うちの 看板は 8文字までしか 入らないの。注文された 店名が 入るか どうか、文字数を 数えたいのよ。',
      '指で 1文字ずつ 数えてたら、途中で 何文字目か わからなく なっちゃって……。',
    ], [
      'Welcome! I\'m Kanba, the sign maker.',
      'My signs only fit so many letters. I want to count the letters to see whether the shop names people order will fit.',
      'When I count one by one on my fingers, I lose track of where I am halfway through...',
    ]),
    task: tra(
      ['B2:B5 に、店名の 文字数を 出そう（LEN）', `C2:C5 に、${SIGN_MAX}文字より 多ければ「長い」、そうでなければ「OK」と 出そう`],
      ['In B2:B5, show the number of characters in each shop name (LEN)', `In C2:C5, show "Long" if it has more than ${SIGN_MAX} characters, otherwise "OK"`],
    ),
    grid: () => makeGrid(6, 3, [tra<(string | number)[]>(['店名', '文字数', '判定'], ['Shop Name', 'Length', 'Check']), ...SIGNS.map((x) => [x])], ['A1', 'B1', 'C1']),
    colWidths: [150, 60, 60],
    hints: tra(
      [
        '=LEN(文字列) で 文字数が わかる。空白も 1文字と 数える。',
        '判定は イフポートで 覚えた IF。条件に LEN を そのまま 使える。',
        `B2 に =LEN(A2)。C2 に =IF(LEN(A2)>${SIGN_MAX},"長い","OK")。どちらも 5行目まで オートフィル。`,
      ],
      [
        '=LEN(text) tells you the number of characters. Spaces count as 1 character too.',
        'For the check, use IF, which you learned in Ifport. You can put LEN right in the condition.',
        `=LEN(A2) in B2. =IF(LEN(A2)>${SIGN_MAX},"Long","OK") in C2. AutoFill both down to row 5.`,
      ],
    ),
    check: (c) =>
      first(
        ...SIGNS.map((x, i) => expectNum(c, `B${i + 2}`, x.length, 'LEN')),
        eachVal(c, SIGNS.map((x, i) => [`C${i + 2}`, x.length > SIGN_MAX ? LONG : 'OK']), 'IF'),
      ),
    reward: { exp: 280, gold: 280, skill: 'len' },
    thanks: tra([
      '中央市場は 10文字、雑貨店本店は 9文字で「長い」……お客さんに 相談しなきゃ。',
      '文字数を 数える だけなら LEN、判定まで するなら IF と 組み合わせる。覚えたわ！',
      '看板づくりが はかどるわ。ありがとう！',
    ], [
      '"Textria Central Market" and "Katakana General Store" are 22 characters each: "Long"... I\'ll have to talk to those customers.',
      'Just counting characters is LEN; to check them too, combine it with IF. Got it!',
      'Sign making is going to go so smoothly now. Thank you!',
    ]),
  },

  text_clean: {
    id: 'text_clean',
    town: 'textria',
    npc: '書記ナラベ',
    title: tr('名簿の清書', 'Tidying the Roster'),
    intro: tra([
      '書記の ナラベです。宿場の 名簿を 清書しているのですが……。',
      '名前の 前後や 間に、よけいな 空白が 入っていて、並べると ガタガタなのです。',
      'それに、会社名の「株式会社」は 長いので「(株)」に したい。1つずつ 消して 書き直すのは、もう うんざりです。',
    ], [
      'I\'m Narabe, a scribe. I\'m making a clean copy of the town roster, but...',
      'There are extra spaces before, after and inside the names, so they look all crooked when lined up.',
      'And "Corporation" in the company names is long, so I want to make it "Corp." I\'m sick of erasing and rewriting them one by one.',
    ]),
    task: tra(['B2:B4 に、A列の 名前から よけいな 空白を 取り除こう（TRIM）', 'D2:D4 に、C列の「株式会社」を「(株)」に 置きかえよう（SUBSTITUTE）'], [
      'In B2:B4, remove the extra spaces from the names in column A (TRIM)',
      'In D2:D4, replace "Corporation" in column C with "Corp." (SUBSTITUTE)',
    ]),
    grid: () => makeGrid(5, 4, [tra<(string | number)[]>(['名前（元）', '名前（清書）', '会社名（元）', '会社名（略）'], ['Name (raw)', 'Name (clean)', 'Company (raw)', 'Company (short)']), ...MESSY.map((x, i) => [x, '', COMPANIES[i]])], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [110, 100, 130, 110],
    hints: tra([
      '=TRIM(文字列) は、前後の 空白を 消し、間の 空白も 1つに そろえる。',
      '=SUBSTITUTE(文字列, 探す文字, 置きかえる文字) で 文字を 置きかえる。',
      'B2 に =TRIM(A2)、D2 に =SUBSTITUTE(C2,"株式会社","(株)")。どちらも 4行目まで オートフィル。',
    ], [
      '=TRIM(text) removes the spaces at the start and end, and squeezes the spaces in between down to one.',
      '=SUBSTITUTE(text, text to find, replacement) replaces text.',
      '=TRIM(A2) in B2 and =SUBSTITUTE(C2,"Corporation","Corp.") in D2. AutoFill both down to row 4.',
    ]),
    check: (c) =>
      first(
        eachVal(c, MESSY.map((x, i) => [`B${i + 2}`, trim(x)]), 'TRIM'),
        eachVal(c, COMPANIES.map((x, i) => [`D${i + 2}`, x.replace(CORP, CORP_SHORT)]), 'SUBSTITUTE'),
      ),
    reward: { exp: 290, gold: 290, skill: 'clean' },
    thanks: tra([
      '名前が ぴしっと そろいました！ (株)モジ、ヨミカキ(株)……後ろに ある 株式会社も ちゃんと 置きかわって いますね。',
      '空白を 消す TRIM と、文字を 置きかえる SUBSTITUTE。清書の 二大道具です。',
      'これで 名簿も 見違えるように なりました。感謝します。',
    ], [
      'The names are lined up perfectly! Moji Corp., The Corp. of Scribes... Even the one in the middle got replaced.',
      'TRIM to remove spaces and SUBSTITUTE to replace text. The two great tools of a clean copy.',
      'The roster looks like a different thing now. I\'m grateful.',
    ]),
  },

  text_find: {
    id: 'text_find',
    town: 'textria',
    npc: '宿場長カキコ',
    title: tr('手紙のあて先', 'Letter Addresses'),
    intro: tra([
      '宿場長の カキコです。町の 悩みを 次々と 解いて くださって ありがとう。',
      '最後に お願いが。伝書鳩の あて先は「taro@moji.jp」のように、@ の 前が 名前、後ろが 町の 印なの。',
      '@ の 位置は 人によって ちがうから、何文字目で 切るか 決められなくて……。',
    ], [
      'I\'m Kakiko, the warden. Thank you for solving the town\'s troubles one after another.',
      'One last request. Carrier pigeon addresses look like "taro@moji.jp": before the @ is the name, and after it is the town\'s mark.',
      'The @ is in a different place for each person, so I can\'t decide which character to cut at...',
    ]),
    task: tra(['B2:B4 に、@ より 前（名前）を 取り出そう', 'C2:C4 に、@ より 後ろ（町の 印）を 取り出そう', '=FIND("@", A2) で @ が 何文字目か わかる'], [
      'In B2:B4, pull out the part before the @ (the name)',
      'In C2:C4, pull out the part after the @ (the town\'s mark)',
      '=FIND("@", A2) tells you which character the @ is',
    ]),
    grid: () => makeGrid(5, 3, [tra<(string | number)[]>(['あて先', '名前', '町の印'], ['Address', 'Name', 'Town Mark']), ...EMAILS.map((x) => [x])], ['A1', 'B1', 'C1']),
    colWidths: [130, 70, 80],
    hints: tra([
      'FIND("@",A2) は @ が 何文字目かを 返す。taro@… なら 5。',
      '名前は @ の 1つ 手前まで → =LEFT(A2,FIND("@",A2)-1)',
      '町の印は 全体の 文字数から @ までを 引いた 分 → =RIGHT(A2,LEN(A2)-FIND("@",A2))。どちらも 4行目まで オートフィル。',
    ], [
      'FIND("@",A2) returns which character the @ is. For taro@..., that\'s 5.',
      'The name goes up to one before the @ → =LEFT(A2,FIND("@",A2)-1)',
      'The town\'s mark is the total length minus everything up to the @ → =RIGHT(A2,LEN(A2)-FIND("@",A2)). AutoFill both down to row 4.',
    ]),
    check: (c) =>
      first(
        eachVal(c, EMAILS.map((x, i) => [`B${i + 2}`, x.split('@')[0]]), 'FIND'),
        eachVal(c, EMAILS.map((x, i) => [`C${i + 2}`, x.split('@')[1]]), 'FIND'),
      ),
    reward: { exp: 310, gold: 310, skill: 'find' },
    thanks: tra([
      'taro、hanako、ichiro……@ の 位置が ちがっても、ぴったり 切り分けられたわ！',
      '場所を 探す FIND と、切り取る LEFT・RIGHT。組み合わせれば、どんな 文字でも 自由自在ね。',
      'でも 町の 文字を 化けさせている 張本人は、北の 活版印刷所に 住みついた「モジバケーラ」。どうか、止めて ちょうだい。',
    ], [
      'taro, hanako, ichiro... Even with the @ in different places, they split perfectly!',
      'FIND to locate a position, and LEFT and RIGHT to cut. Combine them, and any text is yours to command.',
      'But the one garbling our letters is "Mojibakera," who moved into the print shop to the north. Please, stop it.',
    ]),
    notLast: {
      introHead: tra(['宿場長の カキコです。ようこそ、テキストリアへ。', 'お願いが あるの。伝書鳩の あて先は「taro@moji.jp」のように、@ の 前が 名前、後ろが 町の 印なの。'], [
        'I\'m Kakiko, the warden. Welcome to Textria.',
        'I have a request. Carrier pigeon addresses look like "taro@moji.jp": before the @ is the name, and after it is the town\'s mark.',
      ]),
      thanksTail: tra(['宿場には まだ 文字の 呪いで 困っている 人が いるの。頭の上に「！」の 出ている 人の 話も、聞いてあげて。'], [
        'There are still people in town troubled by the letter curse. Please listen to anyone with a "!" over their head, too.',
      ]),
    },
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 活版印刷所の扉（謎解き）
const SECRETS: [string, string][] = tra<[string, string][]>(
  [
    ['合言葉:ヨミ', 'ヨミ'],
    ['鍵:カキ', 'カキ'],
    ['ひみつの言葉:ソロバン', 'ソロバン'],
  ],
  [
    ['Password:READ', 'READ'],
    ['Key:WRITE', 'WRITE'],
    ['Secret word:ABACUS', 'ABACUS'],
  ],
)

Object.assign(QUESTS, {
  prt_join: {
    id: 'prt_join',
    kind: 'puzzle',
    town: 'printing',
    npc: '活字の扉',
    title: tr('活字の扉', 'Door of Type'),
    intro: tra(['扉に 2つの 活字が はめこまれている。', '「左の 字と 右の 字を つなぎ、扉に 命じよ」――と 読める。'], [
      'Two pieces of type are set into the door.',
      'It reads: "Join the left letters and the right letters, and command the door."',
    ]),
    task: tra(['C2 に、A2 と B2 の 文字を つないだ 言葉を 示せ', '※ 自分で 書き写しても、扉は 開かないようだ'], [
      'In C2, show the word made by joining the text in A2 and B2',
      '* Copying it out yourself doesn\'t seem to open the door',
    ]),
    grid: () => makeGrid(3, 3, [tra<(string | number)[]>(['左の字', '右の字', '命令'], ['Left', 'Right', 'Command']), tra(['ヒラ', 'ケ'], ['OP', 'EN'])]),
    colWidths: [60, 60, 80],
    hints: [],
    check: (c) => first(expectVal(c, 'C2', tr('ヒラケ', 'OPEN'), undefined, true), needJoin(c, ['C2'], true)),
    reward: { exp: 140, gold: 0 },
    thanks: tra(['「ヒラケ」の 文字が 光り、扉が 開いた！'], ['The word "OPEN" glows, and the door opens!']),
  },
  prt_mid: {
    id: 'prt_mid',
    kind: 'puzzle',
    town: 'printing',
    npc: '隠し字の扉',
    title: tr('隠し字の扉', 'Door of Hidden Letters'),
    intro: tra(['扉に 意味の ない 文字の 列が 刻まれている。', '「4番目の 字より 2字、そこに 鍵は 眠る」――と 読める。'], [
      'A meaningless string of letters is carved into the door.',
      'It reads: "From the 4th letter, take 2. There the key sleeps."',
    ]),
    task: tra(['B2 に、A2 の 4文字目から 2文字を 示せ'], ['In B2, show 2 characters of A2 starting at the 4th']),
    grid: () => makeGrid(3, 2, [tra<(string | number)[]>(['文字の列', '鍵'], ['Letters', 'Key']), [tr('アイウカギエオ', 'QZXGOWV')]]),
    colWidths: [130, 60],
    hints: [],
    check: (c) => expectVal(c, 'B2', tr('カギ', 'GO'), 'MID', true),
    reward: { exp: 150, gold: 0 },
    thanks: tra(['「カギ」の 文字が 浮かび、錠が はずれた！'], ['The letters "GO" rise up, and the lock comes off!']),
  },
  prt_find: {
    id: 'prt_find',
    kind: 'puzzle',
    town: 'printing',
    npc: '合言葉の扉',
    title: tr('合言葉の扉', 'Door of Passwords'),
    intro: tra(['印刷所の 最奥へ 続く 扉。', '「『:』の 後ろに 真の 言葉 あり。3つ すべてを 1つの 式で 示せ」――と 読める。'], [
      'The door to the deepest part of the print shop.',
      'It reads: "After the \':\' lies the true word. Show all three with a single formula."',
    ]),
    task: tra(['B2:B4 に、「:」より 後ろの 言葉を 示せ'], ['In B2:B4, show the word after the ":"']),
    grid: () => makeGrid(5, 2, [tra<(string | number)[]>(['刻まれた文', '言葉'], ['Inscription', 'Word']), ...SECRETS.map(([x]) => [x])]),
    colWidths: [170, 80],
    hints: [],
    check: (c) => first(eachVal(c, SECRETS.map(([, w], i) => [`B${i + 2}`, w]), 'FIND', true)),
    reward: { exp: 170, gold: 0 },
    thanks: tra(['3つの 言葉が 同時に 響き、最奥の 扉が 開いた……！'], ['The three words ring out at once, and the deepest door opens...!']),
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
const VILLAGERS: [string, string][] = named(
  [
    ['ムラオサ', '2001/12/1'],
    ['ハタケ', '2018/10/11'],
    ['イズミ', '2016/10/9'],
    ['モリ', '2010/4/1'],
  ],
  ['Muraosa', 'Hatake', 'Izumi', 'Mori'],
)
const [OPEN_DAY, AWARD] = tra(['営業', '表彰'], ['Open', 'Award'])

Object.assign(QUESTS, {
  date_add: {
    id: 'date_add',
    town: 'koyomi',
    npc: '飛脚ハヤテ',
    title: tr('お届け予定日', 'Delivery Dates'),
    intro: tra([
      'おっと、旅の人！ 飛脚の ハヤテだ。',
      '荷物は「受付の日から 何日後に 届けるか」で 約束してる。予定日を 帳面に 書きたいんだが……',
      '暦の 呪いで、10月の 次が 何月だったか、31日の 次が 何日だったか、さっぱり わからなく なっちまった！',
    ], [
      'Whoa there, traveler! I\'m Hayate, the courier.',
      'I promise deliveries as "so many days after the day I take the order." I want to write the due dates in my notebook, but...',
      'Thanks to the calendar curse, I can\'t remember what month comes after October, or what day comes after the 31st!',
    ]),
    task: tra(['C2:C5 に、受付日（A列）の 日数（B列）後の 日付を 出そう', '日付は 足し算・引き算が できる。=A2+B2'], [
      'In C2:C5, show the date that is the number of days (column B) after the order date (column A)',
      'You can add and subtract dates. =A2+B2',
    ]),
    grid: () => makeGrid(6, 3, [tra<(string | number)[]>(['受付日', '日数', '届け予定日'], ['Order Date', 'Days', 'Delivery Date']), ...ORDERS7], ['A1', 'B1', 'C1']),
    colWidths: [90, 50, 100],
    hints: tra([
      '表計算の 日付は「1日 ＝ 1」の 数として 扱われている。だから 足せば 何日後、引けば 何日前。',
      '月や 年を またいでも、表計算ソフトが 暦どおりに 計算してくれる。',
      'C2 に =A2+B2 → C5 まで オートフィル。',
    ], [
      'In a spreadsheet, dates are treated as numbers where 1 day = 1. So add to get days later, subtract to get days before.',
      'Even across months and years, the spreadsheet calculates by the calendar for you.',
      '=A2+B2 in C2 → AutoFill down to C5.',
    ]),
    check: (c) => eachVal(c, ORDERS7.map(([d, n], i) => [`C${i + 2}`, addDays(d, n)]), undefined),
    reward: { exp: 330, gold: 320, skill: 'dateadd' },
    thanks: tra([
      '10月20日の 14日後は 11月3日、28日の 5日後は 11月2日……月を またいでも ばっちりだ！',
      '日付は 数と 同じように 足せる……こりゃ 便利だな。',
      'これで お客さんとの 約束を 破らずに すむぜ。ありがとよ！',
    ], [
      '14 days after Oct 20 is Nov 3, and 5 days after the 28th is Nov 2... Spot on, even across months!',
      'You can add dates just like numbers... Now that\'s handy.',
      'Now I won\'t break my promises to customers. Thanks!',
    ]),
  },

  date_diff: {
    id: 'date_diff',
    town: 'koyomi',
    npc: '鍛冶屋の弟子ノコリ',
    title: tr('締め切りまで あと何日', 'Days Until the Deadline'),
    intro: tra([
      'あ、あの……鍛冶屋の 弟子の ノコリです。',
      '注文の 締め切りが いくつも あって、それぞれ「今日から あと何日か」を 知りたいんです。',
      'カレンダーを 指で 数えてたら、途中で 何日目か わからなく なって……。',
    ], [
      'Um, h-hello... I\'m Nokori, the blacksmith\'s apprentice.',
      'I have lots of order deadlines, and I want to know "how many days from today" for each one.',
      'When I count on the calendar with my finger, I lose track of which day I\'m on...',
    ]),
    task: tra(['B2:B5 に、締め切り（A列）まで 今日（E1）から あと何日かを 出そう', '1つ 作って 下へ コピー。今日の セルは $ で 固定'], [
      'In B2:B5, show how many days there are from today (E1) until each deadline (column A)',
      'Build one and copy it down. Lock today\'s cell with $',
    ]),
    grid: () => makeGrid(6, 5, [tra<(string | number)[]>(['締め切り', 'あと何日', '', '今日', TODAY7], ['Deadline', 'Days Left', '', 'Today', TODAY7]), ...DEADLINES.map((d) => [d])], ['A1', 'B1', 'D1']),
    colWidths: [100, 70, 20, 50, 100],
    hints: tra([
      '日付どうしを 引き算すると、間の 日数が 出る。締め切り − 今日。',
      '下へ コピーしても 今日の セル（E1）が ずれないよう $E$1 に する。',
      'B2 に =A2-$E$1 → B5 まで オートフィル。',
    ], [
      'Subtract one date from another, and you get the number of days between. Deadline − today.',
      'Make it $E$1 so today\'s cell (E1) doesn\'t shift when you copy down.',
      '=A2-$E$1 in B2 → AutoFill down to B5.',
    ]),
    check: (c) => first(...DEADLINES.map((d, i) => expectNum(c, `B${i + 2}`, daysBetween(TODAY7, d), 'formula'))),
    reward: { exp: 340, gold: 330, skill: 'datediff' },
    thanks: tra([
      'あと 5日、21日、31日、75日……！ いちばん 急ぐのは 10月15日の 注文ですね。',
      '引き算するだけで 日数が 出る。今日の セルを 書きかえれば、毎日 使えますね！',
      '師匠に 怒られずに すみそうです。ありがとうございます！',
    ], [
      '5, 21, 31 and 75 days left...! The most urgent is the order due Oct 15.',
      'Just subtract to get the days. Change the "today" cell, and I can use it every day!',
      'Looks like I won\'t get scolded by my master. Thank you!',
    ]),
  },

  date_parts: {
    id: 'date_parts',
    town: 'koyomi',
    npc: 'お祝い係ハレ',
    title: tr('誕生月のお祝い', 'Birthday Celebrations'),
    intro: tra([
      'こんにちは！ 村の お祝い係、ハレです。',
      '毎月、その月が 誕生日の 人を お祝いするんですけど、名簿の 誕生日が「1995/4/12」みたいに 年・月・日 ぜんぶ くっついてて……',
      '月と 日だけ 取り出す 方法って ないですか？',
    ], [
      'Hello! I\'m Hare, the village party planner.',
      'Every month we celebrate everyone with a birthday that month, but the birthdays in the register are all stuck together, like "1995/4/12"...',
      'Is there a way to pull out just the month and the day?',
    ]),
    task: tra(['B2:B5 に、誕生日の「月」を 取り出そう（MONTH）', 'C2:C5 に、誕生日の「日」を 取り出そう（DAY）'], [
      'In B2:B5, pull out the "month" of each birthday (MONTH)',
      'In C2:C5, pull out the "day" of each birthday (DAY)',
    ]),
    grid: () => makeGrid(6, 3, [tra<(string | number)[]>(['誕生日', '月', '日'], ['Birthday', 'Month', 'Day']), ...BIRTHDAYS.map((d) => [d])], ['A1', 'B1', 'C1']),
    colWidths: [100, 50, 50],
    hints: tra([
      '=YEAR(日付) で 年、=MONTH(日付) で 月、=DAY(日付) で 日を 数として 取り出せる。',
      '月は =MONTH(A2)、日は =DAY(A2)。',
      'B2 に =MONTH(A2)、C2 に =DAY(A2)。どちらも 5行目まで オートフィル。',
    ], [
      '=YEAR(date) gives the year, =MONTH(date) the month, and =DAY(date) the day, as numbers.',
      'The month is =MONTH(A2), and the day is =DAY(A2).',
      '=MONTH(A2) in B2 and =DAY(A2) in C2. AutoFill both down to row 5.',
    ]),
    check: (c) =>
      first(
        ...BIRTHDAYS.map((d, i) => expectNum(c, `B${i + 2}`, D(d).getUTCMonth() + 1, 'MONTH')),
        ...BIRTHDAYS.map((d, i) => expectNum(c, `C${i + 2}`, D(d).getUTCDate(), 'DAY')),
      ),
    reward: { exp: 340, gold: 330, skill: 'dateparts' },
    thanks: tra([
      '4月、12月、7月、1月……日も ちゃんと 出ました！',
      '月が 数に なれば、COUNTIF で「今月 誕生日の 人数」も 数えられますね！',
      'お祝いの 準備が はかどります。ありがとう！',
    ], [
      'April, December, July, January... and the days came out right too!',
      'Once the month is a number, I can count "how many birthdays this month" with COUNTIF, too!',
      'Party prep is going to go so smoothly. Thank you!',
    ]),
  },

  date_weekday: {
    id: 'date_weekday',
    town: 'koyomi',
    npc: '市場番ヨウビ',
    title: tr('市場の休み', 'Market Holidays'),
    intro: tra([
      '市場番の ヨウビじゃ。',
      'この 村の 市場は、土曜と 日曜が 休み。じゃが 暦の 呪いで、日付から 曜日が わからなく なってしもうた。',
      '「その日は 開いとるか」と 聞かれても、答えられんのじゃ……。',
    ], [
      'I\'m Yobi, keeper of the market.',
      'This village\'s market is closed on Saturdays and Sundays. But thanks to the calendar curse, I can\'t tell the day of the week from a date anymore.',
      'When people ask, "Is it open that day?", I can\'t answer...',
    ]),
    task: tra(['B2:B6 に、土曜・日曜なら「休み」、それ以外は「営業」と 出そう', '=WEEKDAY(日付, 2) は 月曜が 1、土曜が 6、日曜が 7'], [
      'In B2:B6, show "Closed" for Saturday or Sunday, otherwise "Open"',
      '=WEEKDAY(date, 2) gives Monday 1, Saturday 6 and Sunday 7',
    ]),
    grid: () => makeGrid(7, 2, [tra<(string | number)[]>(['日付', '市場'], ['Date', 'Market']), ...MARKET_DAYS.map((d) => [d])], ['A1', 'B1']),
    colWidths: [100, 60],
    hints: tra([
      'WEEKDAY は 曜日を 数で 返す。2つ目に 2 を 書くと 月曜 1 〜 日曜 7。',
      '土日は 6 と 7、つまり「6以上」。IF の 条件に WEEKDAY(A2,2)>=6 と 書く。',
      'B2 に =IF(WEEKDAY(A2,2)>=6,"休み","営業") → B6 まで オートフィル。',
    ], [
      'WEEKDAY returns the day of the week as a number. With 2 as the second part, Monday is 1 through Sunday 7.',
      'Saturday and Sunday are 6 and 7, so "6 or more." Write WEEKDAY(A2,2)>=6 as the IF condition.',
      '=IF(WEEKDAY(A2,2)>=6,"Closed","Open") in B2 → AutoFill down to B6.',
    ]),
    check: (c) => eachVal(c, MARKET_DAYS.map((d, i) => [`B${i + 2}`, weekday2(d) >= 6 ? CLOSED : OPEN_DAY]), 'WEEKDAY'),
    reward: { exp: 350, gold: 340, skill: 'weekday' },
    thanks: tra([
      '3日と 4日が 休みで、あとは 営業……そうじゃ、そうじゃった！',
      '曜日を 数に すれば、IF で 判断できる。「6以上は 休み」とは わかりやすい。',
      '客に 聞かれても もう 迷わん。礼を 言うぞ。',
    ], [
      'Closed on the 3rd and 4th, open the rest... That\'s right, that\'s how it was!',
      'Turn the weekday into a number, and IF can decide. "6 or more is closed" is easy to understand.',
      'I won\'t hesitate when customers ask anymore. You have my thanks.',
    ]),
  },

  date_edate: {
    id: 'date_edate',
    town: 'koyomi',
    npc: '契約係ツキミ',
    title: tr('契約の更新日', 'Contract Renewal Dates'),
    intro: tra([
      '契約係の ツキミと 申します。',
      '畑の 貸し借りの 契約は「○か月ごとに 更新」で、お代は「その月の 末日」に 締めます。',
      '月によって 30日だったり 31日だったり、2月は 28日だったり……もう 頭が こんがらがって しまって。',
    ], [
      'I\'m Tsukimi, the contracts clerk.',
      'Field rental contracts "renew every so many months," and payment is settled "on the last day of that month."',
      'Some months have 30 days, some 31, and February has 28... My head is all in knots.',
    ]),
    task: tra(['C2:C4 に、開始日（A列）の 月数（B列）後の 更新日を 出そう（EDATE）', 'D2:D4 に、開始日の 月の 末日を 出そう（EOMONTH）'], [
      'In C2:C4, show the renewal date, the number of months (column B) after the start date (column A) (EDATE)',
      'In D2:D4, show the last day of the start date\'s month (EOMONTH)',
    ]),
    grid: () => makeGrid(5, 4, [tra<(string | number)[]>(['開始日', '月数', '更新日', '月末'], ['Start', 'Months', 'Renewal', 'Month End']), ...CONTRACTS], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [100, 50, 100, 100],
    hints: tra([
      '=EDATE(日付, 月数) で ○か月後の 同じ日。その月に ない 日（4月31日 など）は 月末に なる。',
      '=EOMONTH(日付, 0) で その月の 末日。1 に すると 翌月の 末日。',
      'C2 に =EDATE(A2,B2)、D2 に =EOMONTH(A2,0)。どちらも 4行目まで オートフィル。',
    ], [
      '=EDATE(date, months) gives the same day so many months later. A day that doesn\'t exist in that month (like April 31) becomes the month\'s last day.',
      '=EOMONTH(date, 0) gives the last day of that month. Make it 1 for the last day of the next month.',
      '=EDATE(A2,B2) in C2 and =EOMONTH(A2,0) in D2. AutoFill both down to row 4.',
    ]),
    check: (c) =>
      first(
        eachVal(c, CONTRACTS.map(([d, n], i) => [`C${i + 2}`, addMonths(d, n)]), 'EDATE'),
        eachVal(c, CONTRACTS.map(([d], i) => [`D${i + 2}`, monthEnd(d)]), 'EOMONTH'),
      ),
    reward: { exp: 360, gold: 350, skill: 'edate' },
    thanks: tra([
      '3月31日の 1か月後は 4月30日……4月に 31日が ないことまで 考えて くれるのですね！',
      '何日 足すか ではなく、何か月 足すか。暦に 合わせた 計算が できるのですね。',
      '契約の 帳面が すっきりしました。ありがとうございます。',
    ], [
      'One month after March 31 is April 30... It even knows April has no 31st!',
      'Not how many days to add, but how many months. It calculates by the calendar.',
      'My contract book is all tidied up. Thank you.',
    ]),
  },

  date_datedif: {
    id: 'date_datedif',
    town: 'koyomi',
    npc: '村長トキワ',
    title: tr('勤続のお祝い', 'Years of Service'),
    intro: tra([
      '村長の トキワじゃ。村の 暦を 次々と 取り戻して くれて、礼を 言う。',
      '最後に 頼みが ある。村に 来てから 10年 以上 たつ 者を 表彰したいのじゃ。',
      'じゃが「何年 たったか」を 引き算で 出そうと すると、日数に なって しまって……。',
    ], [
      'I am Tokiwa, the village chief. Thank you for restoring our calendar piece by piece.',
      'One last request. I wish to honor those who have lived in the village for 10 years or more.',
      'But when I try to get "how many years" by subtracting, it comes out in days...',
    ]),
    task: tra(['B2:B5 に、入村日（A列）から 今日（E1）までの 年数（満年数）を 出そう', 'C2:C5 に、10年 以上なら「表彰」、それ以外は「-」と 出そう'], [
      'In B2:B5, show the number of full years from the move-in date (column A) to today (E1)',
      'In C2:C5, show "Award" for 10 years or more, otherwise "-"',
    ]),
    grid: () => makeGrid(6, 5, [tra<(string | number)[]>(['入村日', '年数', '表彰', '今日', TODAY7], ['Moved In', 'Years', 'Award?', 'Today', TODAY7]), ...VILLAGERS.map(([, d]) => [d])], ['A1', 'B1', 'C1', 'D1']),
    colWidths: [100, 50, 60, 50, 100],
    hints: tra([
      '=DATEDIF(開始日, 終了日, "Y") で 満年数。"M" なら 満月数、"D" なら 日数。',
      '今日の セルは コピーしても ずれないよう $E$1。',
      'B2 に =DATEDIF(A2,$E$1,"Y")、C2 に =IF(B2>=10,"表彰","-")。どちらも 5行目まで オートフィル。',
    ], [
      '=DATEDIF(start date, end date, "Y") gives full years. "M" gives full months, and "D" gives days.',
      'Make today\'s cell $E$1 so it doesn\'t shift when copied.',
      '=DATEDIF(A2,$E$1,"Y") in B2 and =IF(B2>=10,"Award","-") in C2. AutoFill both down to row 5.',
    ]),
    check: (c) =>
      first(
        ...VILLAGERS.map(([, d], i) => expectNum(c, `B${i + 2}`, fullYears(d, TODAY7), 'DATEDIF')),
        eachVal(c, VILLAGERS.map(([, d], i) => [`C${i + 2}`, fullYears(d, TODAY7) >= 10 ? AWARD : '-']), 'IF'),
      ),
    reward: { exp: 380, gold: 370, skill: 'datedif' },
    thanks: tra([
      '24年、7年、10年、16年……2016年10月9日の 者は、きのうで ちょうど 10年じゃな。',
      '「満何年」は DATEDIF。引き算と ちがって、誕生日を 迎えたかまで 見て くれるのじゃな。',
      'じゃが 村の 暦を 狂わせた 張本人は、北の 時計塔に 棲む「シメキリス」。どうか、時を 取り戻して くれ。',
    ], [
      '24, 7, 10 and 16 years... The one who came on Oct 9, 2016 reached exactly 10 years yesterday.',
      'For "full years," use DATEDIF. Unlike subtraction, it even checks whether the anniversary has passed.',
      'But the one who threw our calendar into chaos is "Deadlinus," who lives in the clock tower to the north. Please, take back our time.',
    ]),
    notLast: {
      introHead: tra(['村長の トキワじゃ。よう 来てくれた。', '頼みが ある。村に 来てから 10年 以上 たつ 者を 表彰したいのじゃ。'], [
        'I am Tokiwa, the village chief. Thank you for coming.',
        'I have a request. I wish to honor those who have lived in the village for 10 years or more.',
      ]),
      thanksTail: tra(['村には まだ 困っている 者が おる。頭の上に「！」の 出ている 者の 話も 聞いてやってくれ。'], [
        'There are still people in the village who need help. Please listen to anyone with a "!" over their head, too.',
      ]),
    },
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
    title: tr('百日の扉', 'Door of a Hundred Days'),
    intro: tra(['扉に 日付と 数字が 刻まれている。', '「始まりの日より 百日の 後、その 日付を 示せ」――と 読める。'], [
      'A date and a number are carved into the door.',
      'It reads: "One hundred days after the day of beginning: show that date."',
    ]),
    task: tra(['C2 に、A2 の 日付の B2 日後の 日付を 示せ'], ['In C2, show the date B2 days after the date in A2']),
    grid: () => makeGrid(3, 3, [tra<(string | number)[]>(['始まりの日', '日数', '百日の後'], ['Start Day', 'Days', '100 Days On']), ['2026/1/1', 100]]),
    colWidths: [100, 50, 100],
    hints: [],
    check: (c) => expectVal(c, 'C2', addDays('2026/1/1', 100), undefined, true),
    reward: { exp: 160, gold: 0 },
    thanks: [tr(`「${addDays('2026/1/1', 100)}」の 文字が 光り、扉が 開いた！`, `The date "${addDays('2026/1/1', 100)}" glows, and the door opens!`)],
  },
  clk_weekday: {
    id: 'clk_weekday',
    kind: 'puzzle',
    town: 'clock',
    npc: '曜日の扉',
    title: tr('曜日の扉', 'Door of Weekdays'),
    intro: tra(['扉に 7つの 穴が 並び、1つの 日付が 刻まれている。', '「この日は 月より 数えて 幾つめの 日か。その 数を 示せ」――と 読める。'], [
      'Seven holes line the door, and a single date is carved into it.',
      'It reads: "Counting from Monday, which day is this? Show the number."',
    ]),
    task: tra(['B2 に、A2 の 日付の 曜日を 月曜 1 〜 日曜 7 の 数で 示せ'], [
      'In B2, show the weekday of A2\'s date as a number, Monday 1 through Sunday 7',
    ]),
    grid: () => makeGrid(3, 2, [tra<(string | number)[]>(['日付', '曜日の数'], ['Date', 'Weekday No.']), ['2026/12/25']]),
    colWidths: [100, 70],
    hints: [],
    check: (c) => expectNum(c, 'B2', weekday2('2026/12/25'), 'WEEKDAY', 'B2', true),
    reward: { exp: 170, gold: 0 },
    thanks: tra(['7つの 穴の 1つに 光が ともり、錠が はずれた！'], ['Light fills one of the seven holes, and the lock comes off!']),
  },
  clk_months: {
    id: 'clk_months',
    kind: 'puzzle',
    town: 'clock',
    npc: '月日の扉',
    title: tr('月日の扉', 'Door of Months and Days'),
    intro: tra(['時計塔の 最上階へ 続く 扉。', '「3つの 時の 間、満ちた 月の 数を 示せ。1つの 式を すべてに 映せ」――と 読める。'], [
      'The door to the top floor of the clock tower.',
      'It reads: "Between the three spans of time, show the number of full months. Reflect a single formula into them all."',
    ]),
    task: tra(['C2:C4 に、開始日（A列）から 終了日（B列）までの 満月数を 示せ'], [
      'In C2:C4, show the number of full months from the start date (column A) to the end date (column B)',
    ]),
    grid: () => makeGrid(5, 3, [tra<(string | number)[]>(['開始日', '終了日', '満ちた月'], ['Start', 'End', 'Full Months']), ...TERMS]),
    colWidths: [100, 100, 70],
    hints: [],
    check: (c) => first(...TERMS.map(([a, b], i) => expectNum(c, `C${i + 2}`, fullMonths(a, b), 'DATEDIF', `C${i + 2}`, true))),
    reward: { exp: 190, gold: 0 },
    thanks: tra(['時計塔の 鐘が 1つ 鳴り、最上階への 扉が 開いた……！'], [
      'The clock tower bell rings once, and the door to the top floor opens...!',
    ]),
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 最終章 ホープ（エラーの 直し方と 総まとめ）
const SUPPLY: [number, number][] = [
  [120, 4],
  [90, 0],
  [60, 3],
  [80, 0],
]
const WATCH: [string, number | string][] = tra<[string, number | string][]>(
  [
    ['月', 12],
    ['火', '休み'],
    ['水', 9],
    ['木', 15],
    ['金', '休み'],
  ],
  [
    ['Mon', 12],
    ['Tue', 'Closed'],
    ['Wed', 9],
    ['Thu', 15],
    ['Fri', 'Closed'],
  ],
)
const SCRIBE_SCORES = [72, 55, 88, 64]
const MAP_COST = [300, 450, 120, 800]
const RATE_F = 0.1
/** 部隊の 名前（英語版は 英語で 条件に 使う） */
const UNIT_EN: Record<string, string> = { 北隊: 'North', 南隊: 'South', 西隊: 'West', 遊撃隊: 'Raiders', 兵糧: 'Rations' }
const unit = (x: string) => tr(x, UNIT_EN[x])
const UNITS: [string, string, number][] = (
  [
    ['西隊', '兵糧', 60],
    ['南隊', '兵糧', 25],
    ['北隊', '兵糧', 40],
    ['北隊', '兵糧', 70],
    ['南隊', '兵糧', 30],
    ['西隊', '兵糧', 50],
    ['北隊', '兵糧', 10],
    ['南隊', '兵糧', 20],
  ] as [string, string, number][]
).map(([a, b, n]) => [unit(a), unit(b), n])
const UNIT_NAMES = ['北隊', '南隊', '西隊'].map(unit)
const ROSTER: [string, number][] = (
  [
    ['北隊', 38],
    ['南隊', 27],
    ['西隊', 33],
    ['遊撃隊', 22],
  ] as [string, number][]
).map(([a, n]) => [unit(a), n])
const [ENOUGH, SHORT] = tra(['十分', '不足'], ['Enough', 'Short'])

/** 数か「-」か（0 で 割る 行は「-」） */
const divOrDash = (c: CheckCtx, a: string, want: number | string) => (typeof want === 'number' ? expectNum(c, a, want) : expectVal(c, a, want))
const needErrFix = (c: CheckCtx, cells: string[]) => {
  const a = cells.find((x) => !usesFn(c.raw(x), 'IFERROR') && !usesFn(c.raw(x), 'IF'))
  return a ? tr(`${a} は 合っている！ でも IFERROR（または IF）で エラーを 防ぐ 形に しよう。`, `${a} is right! But make it prevent the error with IFERROR (or IF).`) : null
}

Object.assign(QUESTS, {
  err_div0: {
    id: 'err_div0',
    town: 'hope',
    npc: '補給係ワリザン',
    title: tr('1人あたりの食料', 'Food per Person'),
    intro: tra([
      '補給係の ワリザンだ。魔王城へ 向かう 部隊に、食料を 分けている。',
      '「食料 ÷ 人数」で 1人あたりを 出したいんだが……まだ 人が 集まって いない 部隊が あってな。',
      'そこだけ「#DIV/0!」という 不気味な 文字が 出る。魔王の 呪いか？',
    ], [
      'I\'m Warizan, the supply officer. I\'m dividing food among the units heading for the Demon Lord\'s castle.',
      'I want "food ÷ people" to get the amount per person... but some units haven\'t gathered their people yet.',
      'Only those show this eerie "#DIV/0!" Is it the Demon Lord\'s curse?',
    ]),
    task: tra(['C2:C5 に、1人あたりの 食料（A ÷ B）を 出そう', '人数が 0 で 割れない 行は「-」と 出す（IFERROR）'], [
      'In C2:C5, show the food per person (A ÷ B)',
      'For rows that can\'t be divided because there are 0 people, show "-" (IFERROR)',
    ]),
    grid: () => makeGrid(6, 3, [tra<(string | number)[]>(['食料', '人数', '1人あたり'], ['Food', 'People', 'Per Person']), ...SUPPLY], ['A1', 'B1', 'C1']),
    colWidths: [60, 60, 80],
    hints: tra([
      '#DIV/0! は「0 で 割った」という エラー。人数が 0 の 行で 出る。呪いでは ない。',
      'IFERROR(計算, エラーの ときの 値) で 包めば、エラーの ときだけ「-」に できる。',
      'C2 に =IFERROR(A2/B2,"-") → C5 まで オートフィル。',
    ], [
      '#DIV/0! is the error for "divided by 0." It shows up in rows with 0 people. It\'s not a curse.',
      'Wrap it in IFERROR(calculation, value if error), and you can show "-" only when there\'s an error.',
      '=IFERROR(A2/B2,"-") in C2 → AutoFill down to C5.',
    ]),
    check: (c) => first(...SUPPLY.map(([a, b], i) => divOrDash(c, `C${i + 2}`, b === 0 ? '-' : a / b)), needErrFix(c, SUPPLY.map((_, i) => `C${i + 2}`))),
    reward: { exp: 420, gold: 400, skill: 'diverr' },
    thanks: tra([
      '30、-、20、-……。不気味な 文字が 消えた！',
      '#DIV/0! は 0 で 割った 合図だったのか。呪いじゃ なかったんだな。',
      'エラーが 出たら、まず その 意味を 読む。戦いと 同じだ。',
    ], [
      '30, -, 20, -... The eerie text is gone!',
      'So #DIV/0! was a sign that I\'d divided by 0. It wasn\'t a curse after all.',
      'When an error appears, first read what it means. Just like in battle.',
    ]),
  },

  err_value: {
    id: 'err_value',
    town: 'hope',
    npc: '見張り番ミハル',
    title: tr('見張りの合計', 'Watch Totals'),
    intro: tra([
      '見張り番の ミハルです。今週 見つけた 魔物の 数を 合計しているのですが……。',
      'B7 に =B2+B3+B4+B5+B6 と 書いたら「#VALUE!」に なって しまいました。',
      '「休み」の 日が あるからでしょうか……？',
    ], [
      'I\'m Miharu, the lookout. I\'m totaling the number of monsters spotted this week, but...',
      'I wrote =B2+B3+B4+B5+B6 in B7, and it turned into "#VALUE!"',
      'Could it be because of the "Closed" days...?',
    ]),
    task: tra(['B7 の 式を 直して、魔物の 数の 合計を 出そう', '+ で 足すと、文字（休み）が まざって #VALUE! に なる。SUM は 文字を 飛ばして 足す'], [
      'Fix the formula in B7 to get the total number of monsters',
      'Adding with + mixes in text (Closed) and gives #VALUE!. SUM skips text when it adds',
    ]),
    grid: () => {
      const g = makeGrid(8, 2, [tra<(string | number)[]>(['曜日', '魔物の数'], ['Day', 'Monsters']), ...WATCH, [tr('合計', 'Total')]], ['A1', 'B1', 'A7'])
      g[6][1].raw = '=B2+B3+B4+B5+B6'
      return g
    },
    colWidths: [60, 80],
    hints: tra([
      '#VALUE! は「計算できない 種類の 値（文字など）が まざっている」という エラー。',
      '+ は 1つずつ 足すので、「休み」を 足そうとして 失敗する。SUM なら 数だけを 足してくれる。',
      'B7 を =SUM(B2:B6) に 書きかえる。',
    ], [
      '#VALUE! is the error for "a value that can\'t be calculated (like text) is mixed in."',
      '+ adds things one by one, so it fails when it tries to add "Closed." SUM adds only the numbers.',
      'Rewrite B7 as =SUM(B2:B6).',
    ]),
    check: (c) => expectNum(c, 'B7', WATCH.reduce((a, [, v]) => a + (typeof v === 'number' ? v : 0), 0), 'SUM'),
    reward: { exp: 420, gold: 400, skill: 'valueerr' },
    thanks: tra([
      '合計 36 体……！ 「休み」の 日は ちゃんと 飛ばされて いますね。',
      '+ は 文字に つまずく けど、SUM は 数だけを 拾う。使い分けが 大事なんですね。',
      'これで 魔物の 動きを 正しく 報告できます。',
    ], [
      'A total of 36...! The "Closed" days were skipped properly.',
      '+ trips over text, but SUM picks up only the numbers. Using the right one matters.',
      'Now I can report the monsters\' movements correctly.',
    ]),
  },

  err_name: {
    id: 'err_name',
    town: 'hope',
    npc: '書記兵カクミス',
    title: tr('書き損じの式', 'Botched Formulas'),
    intro: tra([
      '書記兵の カクミスです……。',
      '訓練の 点数表を 作ったのですが、D2 も D3 も「#NAME?」に なって しまって。',
      '自分で 書いた 式なのに、どこが 間違って いるのか わからないんです。',
    ], [
      'I\'m Kakumisu, a scribe...',
      'I made a table of training scores, but both D2 and D3 turned into "#NAME?"',
      'I wrote the formulas myself, but I can\'t tell what\'s wrong with them.',
    ]),
    task: tra(['D2 の 式を 直して、点数の 合計を 出そう（今は =SUMM(A2:A5)）', 'D3 の 式を 直して、A2 が 60以上なら「OK」、それ以外は「NG」と 出そう（今は =IF(A2>=60,OK,NG)）'], [
      'Fix the formula in D2 to get the total score (it\'s =SUMM(A2:A5) now)',
      'Fix the formula in D3 to show "OK" if A2 is 60 or more, otherwise "NG" (it\'s =IF(A2>=60,OK,NG) now)',
    ]),
    grid: () => {
      const g = makeGrid(6, 4, [tra<(string | number)[]>(['点数', '', '', ''], ['Score', '', '', '']), ...SCRIBE_SCORES.map((v, i) => [v, '', i === 0 ? tr('合計', 'Total') : i === 1 ? tr('判定', 'Check') : ''])], ['A1', 'C2', 'C3'])
      g[1][3].raw = '=SUMM(A2:A5)'
      g[2][3].raw = '=IF(A2>=60,OK,NG)'
      return g
    },
    colWidths: [60, 20, 50, 80],
    hints: tra([
      '#NAME? は「その 名前を 知らない」という エラー。関数名の 打ちまちがいや、" を 付け忘れた 文字で 出る。',
      'D2 は SUMM ではなく SUM。D3 は 文字の OK・NG を " で 囲む。',
      'D2 に =SUM(A2:A5)、D3 に =IF(A2>=60,"OK","NG")。',
    ], [
      '#NAME? is the error for "I don\'t know that name." It shows up with a misspelled function name or text missing its ".',
      'D2 should be SUM, not SUMM. In D3, wrap the text OK and NG in ".',
      '=SUM(A2:A5) in D2 and =IF(A2>=60,"OK","NG") in D3.',
    ]),
    check: (c) => first(expectNum(c, 'D2', SCRIBE_SCORES.reduce((a, b) => a + b, 0), 'SUM'), expectVal(c, 'D3', SCRIBE_SCORES[0] >= 60 ? 'OK' : 'NG', 'IF')),
    reward: { exp: 430, gold: 410, skill: 'nameerr' },
    thanks: tra([
      '合計 279、判定は「OK」……！ ちゃんと 出ました！',
      '#NAME? が 出たら、関数名の つづりと、" の 付け忘れを 確かめる。覚えました！',
      'わたしの 書き損じ、魔王の せいに しないで よかった……。',
    ], [
      'A total of 279, and the check says "OK"...! They work!',
      'When #NAME? appears, check the spelling of the function name and for missing ". Got it!',
      'Glad I didn\'t blame my own mistakes on the Demon Lord...',
    ]),
  },

  err_ref: {
    id: 'err_ref',
    town: 'hope',
    npc: '地図係ツナギ',
    title: tr('消えた参照', 'The Missing Reference'),
    intro: tra([
      '地図係の ツナギよ。道ごとの 通行税を 計算してたの。',
      '税率を 書いた 列を うっかり 消したら、式が ぜんぶ「#REF!」に なっちゃって……。',
      '税率は E1 に 書き直したわ。式を どう 直せば いいかしら？',
    ], [
      'I\'m Tsunagi, the mapmaker. I was calculating the toll tax for each road.',
      'I accidentally deleted the column with the tax rate, and every formula turned into "#REF!"...',
      'I\'ve rewritten the tax rate in E1. How should I fix the formulas?',
    ]),
    task: tra(['C2:C5 の 式を 直して、通行料（B列）× 税率（E1）を 出そう', '1つ 直して 下へ コピー。税率の セルは $ で 固定'], [
      'Fix the formulas in C2:C5 to show the toll (column B) × the tax rate (E1)',
      'Fix one and copy it down. Lock the tax rate cell with $',
    ]),
    grid: () => {
      const g = makeGrid(6, 5, [tra<(string | number)[]>(['道', '通行料', '税', '税率', RATE_F], ['Road', 'Toll', 'Tax', 'Rate', RATE_F]), ...MAP_COST.map((v, i) => [tr(`${['北', '東', '南', '西'][i]}の道`, `${['North', 'East', 'South', 'West'][i]} Rd`), v])], ['A1', 'B1', 'C1', 'D1'])
      for (let i = 0; i < MAP_COST.length; i++) g[i + 1][2].raw = `=B${i + 2}*#REF!`
      return g
    },
    colWidths: [70, 60, 60, 50, 50],
    hints: tra([
      '#REF! は「参照先の セルが 消えた」という エラー。行や 列を 削除すると 出る。',
      '消えた 参照を、新しい 税率の セル E1 に 付けかえる。コピーするので $E$1。',
      'C2 に =B2*$E$1 → C5 まで オートフィル。',
    ], [
      '#REF! is the error for "the referenced cell is gone." It shows up when you delete rows or columns.',
      'Reconnect the lost reference to the new tax rate cell, E1. You\'ll copy it, so make it $E$1.',
      '=B2*$E$1 in C2 → AutoFill down to C5.',
    ]),
    check: (c) => first(...MAP_COST.map((v, i) => expectNum(c, `C${i + 2}`, v * RATE_F, 'formula'))),
    reward: { exp: 440, gold: 420, skill: 'referr' },
    thanks: tra([
      '30、45、12、80……税が ちゃんと 出たわ！',
      '#REF! は「行き先が 消えた」合図。消す 前に、その セルを 使っている 式が ないか 確かめるのね。',
      'ふう、地図の 帳面が 元どおりに なったわ。',
    ], [
      '30, 45, 12, 80... The taxes came out right!',
      '#REF! is the sign that "the destination is gone." Before deleting, check whether any formula uses that cell.',
      'Phew, my map ledger is back to normal.',
    ]),
  },

  err_report: {
    id: 'err_report',
    town: 'hope',
    npc: '兵站長マトメ',
    title: tr('出陣前の兵糧', 'Rations Before Marching'),
    intro: tra([
      '兵站長の マトメだ。魔王城へ 出陣する 前に、部隊ごとの 兵糧を 確かめたい。',
      '記録は バラバラ。北隊・南隊・西隊の 合計を 出して、100袋 以上 あれば「十分」、なければ「不足」と 判定したい。',
      'ピボリアや イフポートで 覚えた 魔法を、組み合わせて くれないか。',
    ], [
      'I\'m Matome, the quartermaster. Before marching on the Demon Lord\'s castle, I want to check each unit\'s rations.',
      'The records are scattered. I want the totals for the North, South and West units, and to judge "Enough" if there are 100 bags or more, otherwise "Short."',
      'Could you combine the magic you learned in Pivoria and Ifport?',
    ]),
    task: tra(['F2:F4 に、部隊（E列）ごとの 兵糧の 合計を 出そう（SUMIFS、範囲は $ で 固定）', 'G2:G4 に、100 以上なら「十分」、それ以外は「不足」と 出そう'], [
      'In F2:F4, show the total rations for each unit (column E) (SUMIFS; lock the ranges with $)',
      'In G2:G4, show "Enough" if it\'s 100 or more, otherwise "Short"',
    ]),
    grid: () => makeGrid(10, 7, [tra<(string | number)[]>(['部隊', '品', '袋', '', '部隊', '合計', '判定'], ['Unit', 'Item', 'Bags', '', 'Unit', 'Total', 'Check']), ...UNITS.map((r, i) => [...r, '', UNIT_NAMES[i] ?? ''])], ['A1', 'B1', 'C1', 'E1', 'F1', 'G1']),
    colWidths: [50, 50, 40, 20, 50, 50, 50],
    hints: tra([
      '合計は =SUMIFS(合計する範囲, 条件の範囲, 条件)。条件は E2 の 部隊名。',
      '下へ コピーするので 記録の 範囲は $ で 固定。=SUMIFS($C$2:$C$9,$A$2:$A$9,E2)',
      '判定は =IF(F2>=100,"十分","不足")。どちらも 4行目まで オートフィル。',
    ], [
      'The total is =SUMIFS(range to total, range to check, condition). The condition is the unit name in E2.',
      'Since you\'ll copy it down, lock the record ranges with $. =SUMIFS($C$2:$C$9,$A$2:$A$9,E2)',
      'The check is =IF(F2>=100,"Enough","Short"). AutoFill both down to row 4.',
    ]),
    check: (c) =>
      first(
        ...UNIT_NAMES.map((u, i) => expectNum(c, `F${i + 2}`, sumIf(UNITS, ([a]) => a === u, (r) => r[2]), 'SUMIFS')),
        eachVal(c, UNIT_NAMES.map((u, i) => [`G${i + 2}`, sumIf(UNITS, ([a]) => a === u, (r) => r[2]) >= 100 ? ENOUGH : SHORT]), 'IF'),
      ),
    reward: { exp: 460, gold: 440, skill: 'combine' },
    thanks: tra([
      '北隊 120、南隊 75、西隊 110。南隊が「不足」か……すぐに 補給を 回そう。',
      '集計して、判定する。2つの 魔法を 組み合わせれば、報告書が 一瞬で できあがる。',
      'これで 出陣できる。ありがとう、旅の者。',
    ], [
      'North 120, South 75, West 110. So the South unit is "Short"... I\'ll send supplies right away.',
      'Total, then judge. Combine two kinds of magic, and the report is done in an instant.',
      'Now we can march. Thank you, traveler.',
    ]),
  },

  err_final: {
    id: 'err_final',
    town: 'hope',
    npc: '砦の長ガンバル',
    title: tr('出陣の号令', 'The Call to March'),
    intro: tra([
      '砦の長、ガンバルだ。7つの 町を 救った 噂は、ここまで 届いて おる。',
      '最後に 頼みが ある。出陣の 号令を、名簿から 自動で 作りたいのだ。',
      '総勢 何名かを 計算して、「総勢 ○ 名、出陣！」と 1つの 文に したい。人数が 変わっても、文が 自動で 変わるように な。',
    ], [
      'I\'m Ganbaru, commander of the fort. Word that you saved seven towns has reached even here.',
      'One last request. I want to make the call to march automatically from the roster.',
      'I want to calculate the total number of troops and make it one sentence: "All ○ troops, march!" And the sentence should change by itself if the numbers change.',
    ]),
    task: tra(['B6 に、人数の 合計を 出そう', 'A8 に、「総勢 」と B6 と「 名、出陣!」を つないだ 文を 作ろう'], [
      'In B6, show the total number of troops',
      'In A8, make a sentence joining "All ", B6 and " troops, march!"',
    ]),
    grid: () => makeGrid(9, 2, [tra<(string | number)[]>(['部隊', '人数'], ['Unit', 'Troops']), ...ROSTER, [tr('合計', 'Total')], [], ['']], ['A1', 'B1', 'A6']),
    colWidths: [180, 60],
    hints: tra([
      '合計は =SUM(B2:B5)。',
      '文字と 数も「&」で つなげる。文字の 部分は " で 囲む。空白も 文字の うち。',
      'A8 に ="総勢 "&B6&" 名、出陣!"',
    ], [
      'The total is =SUM(B2:B5).',
      'Text and numbers can also be joined with "&". Wrap the text parts in ". Spaces count as text too.',
      '="All "&B6&" troops, march!" in A8',
    ]),
    check: (c) => {
      const total = ROSTER.reduce((a, [, v]) => a + v, 0)
      return first(expectNum(c, 'B6', total, 'SUM'), expectVal(c, 'A8', tr(`総勢 ${total} 名、出陣!`, `All ${total} troops, march!`)), needJoin(c, ['A8']))
    },
    reward: { exp: 500, gold: 500, skill: 'message' },
    thanks: tra([
      '「総勢 120 名、出陣!」……うむ、見事な 号令だ！',
      '数を 計算して、文に 組みこむ。これまでの 力が、すべて つながったな。',
      '魔王レフエラーの 城は、北の 結界の 向こうだ。どうか……この 世界の「時間」を 取り戻して くれ。',
    ], [
      '"All 120 troops, march!"... Hm, a splendid call!',
      'Calculate a number and work it into a sentence. Everything you\'ve learned has come together.',
      'Demon Lord Referror\'s castle lies beyond the northern barrier. Please... take back this world\'s "time."',
    ]),
    notLast: {
      introHead: tra(['砦の長、ガンバルだ。7つの 町を 救った 噂は、ここまで 届いて おる。', '頼みが ある。出陣の 号令を、名簿から 自動で 作りたいのだ。'], [
        'I\'m Ganbaru, commander of the fort. Word that you saved seven towns has reached even here.',
        'I have a request. I want to make the call to march automatically from the roster.',
      ]),
      thanksTail: tra(['砦には まだ 困っている 者が いる。頭の上に「！」の 出ている 者の 話も 聞いてやってくれ。'], [
        'There are still people at the fort who need help. Please listen to anyone with a "!" over their head, too.',
      ]),
    },
  },
} satisfies Record<string, QuestDef>)

// ---------------------------------------------------------------- 魔王城の扉（謎解き）
const RATIONS: [number, number][] = [
  [50, 5],
  [40, 0],
  [36, 4],
]
const CASTLE_PRICES: [string, number][] = named(
  [
    ['剣', 120],
    ['盾', 80],
    ['薬', 15],
  ],
  ['Sword', 'Shield', 'Potion'],
)
const CASTLE_ORDERS: [string, number][] = named(
  [
    ['盾', 2],
    ['薬', 5],
    ['剣', 1],
  ],
  ['Shield', 'Potion', 'Sword'],
)
const SEALS: [string, number][] = named(
  [
    ['表の封印', 12],
    ['計算の封印', 18],
    ['参照の封印', 9],
    ['条件の封印', 15],
    ['検索の封印', 21],
    ['集計の封印', 14],
    ['文字の封印', 11],
  ],
  ['Seal of Tables', 'Seal of Math', 'Seal of Reference', 'Seal of Conditions', 'Seal of Searching', 'Seal of Totals', 'Seal of Text'],
)

Object.assign(QUESTS, {
  cst_iferror: {
    id: 'cst_iferror',
    kind: 'puzzle',
    town: 'castle',
    npc: '割れぬ扉',
    title: tr('割れぬ扉', 'Unbreakable Door'),
    intro: tra(['扉に「÷」の 紋章と 数字が 刻まれている。', '「割れるものは 割り、割れぬものには 0 を 刻め。1つの 式を すべてに 映せ」――と 読める。'], [
      'A "÷" crest and numbers are carved into the door.',
      'It reads: "Divide what can be divided, and carve 0 for what cannot. Reflect a single formula into them all."',
    ]),
    task: tra(['C2:C4 に、A ÷ B を 示せ。割れない（0 で 割る）ときは 0'], [
      'In C2:C4, show A ÷ B. When it can\'t be divided (dividing by 0), show 0',
    ]),
    grid: () => makeGrid(5, 3, [tra<(string | number)[]>(['数', '割る数', '答え'], ['Number', 'Divisor', 'Answer']), ...RATIONS]),
    colWidths: [50, 60, 60],
    hints: [],
    check: (c) => first(...RATIONS.map(([a, b], i) => expectNum(c, `C${i + 2}`, b === 0 ? 0 : a / b, 'IFERROR', `C${i + 2}`, true))),
    reward: { exp: 200, gold: 0 },
    thanks: tra(['3つの 答えが 光り、扉の 紋章が 割れた！'], ['The three answers glow, and the crest on the door cracks apart!']),
  },
  cst_lookup: {
    id: 'cst_lookup',
    kind: 'puzzle',
    town: 'castle',
    npc: '代価の扉',
    title: tr('代価の扉', 'Door of Prices'),
    intro: tra(['扉に 品の 値段表と、注文の 帳面が 刻まれている。', '「品の 値を 表より 引き、数を 掛けて 代価を 示せ。1つの 式を すべてに 映せ」――と 読める。'], [
      'A price list and an order ledger are carved into the door.',
      'It reads: "Look up the price of each item in the list, multiply by the count, and show the cost. Reflect a single formula into them all."',
    ]),
    task: tra(['C2:C4 に、品（A列）の 値段を 表（E2:F4）から 引いて、数（B列）を 掛けた 代価を 示せ'], [
      'In C2:C4, look up the price of each item (column A) in the list (E2:F4) and show the cost multiplied by the count (column B)',
    ]),
    grid: () => makeGrid(5, 6, [tra<(string | number)[]>(['品', '数', '代価', '', '品', '値段'], ['Item', 'Qty', 'Cost', '', 'Item', 'Price']), ...CASTLE_ORDERS.map((r, i) => [...r, '', '', ...(CASTLE_PRICES[i] ?? [])])]),
    colWidths: [40, 40, 60, 20, 40, 50],
    hints: [],
    check: (c) => first(...CASTLE_ORDERS.map(([k, n], i) => expectNum(c, `C${i + 2}`, CASTLE_PRICES.find(([p]) => p === k)![1] * n, 'XLOOKUP', `C${i + 2}`, true))),
    reward: { exp: 220, gold: 0 },
    thanks: tra(['代価の 数字が 天秤に 乗り、重い 扉が 開いた！'], ['The costs settle onto the scales, and the heavy door opens!']),
  },
  cst_seals: {
    id: 'cst_seals',
    kind: 'puzzle',
    town: 'castle',
    npc: '七つの封印',
    title: tr('七つの封印', 'The Seven Seals'),
    intro: tra(['玉座の間へ 続く 最後の 扉。7つの 封印が 刻まれている。', '「七つの 力の 和が 百に 届くならば『ヒラケ』、届かぬならば『トジヨ』と 刻め」――と 読める。'], [
      'The last door before the throne room. Seven seals are carved into it.',
      'It reads: "If the sum of the seven powers reaches one hundred, carve OPEN. If it falls short, carve CLOSE."',
    ]),
    task: tra(['B9 に、7つの 力（B2:B8）の 合計が 100 以上なら「ヒラケ」、それ以外は「トジヨ」と 示せ'], [
      'In B9, show "OPEN" if the total of the seven powers (B2:B8) is 100 or more, otherwise "CLOSE"',
    ]),
    grid: () => makeGrid(10, 2, [tra<(string | number)[]>(['封印', '力'], ['Seal', 'Power']), ...SEALS, [tr('命令', 'Command')]]),
    colWidths: [110, 70],
    hints: [],
    check: (c) => expectVal(c, 'B9', SEALS.reduce((a, [, v]) => a + v, 0) >= 100 ? tr('ヒラケ', 'OPEN') : tr('トジヨ', 'CLOSE'), 'IF', true),
    reward: { exp: 260, gold: 0 },
    thanks: tra(['7つの 封印が 次々と 光を 放ち、玉座の間への 扉が 開いた……！'], [
      'One after another, the seven seals give off light, and the door to the throne room opens...!',
    ]),
  },
} satisfies Record<string, QuestDef>)

export const townQuests = (town: string) => Object.values(QUESTS).filter((q) => q.town === town)
