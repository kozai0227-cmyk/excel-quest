import type { Question } from './bosses'
import { tr, tra } from '../game/lang'

/**
 * 戦闘用の「自動生成問題」。呼ぶたびに数値やセル番地が変わるので、
 * 答えを丸暗記しても通用しない。
 */
export type QGen = () => Question

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const COLS = 'ABCDEFGH'
const DAYS = tra(['月', '火', '水', '木', '金', '土', '日'], ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
const EN_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** 「k つ下／右」の 英語（1 なら 単数） */
const cells = (k: number) => `${k} cell${k > 1 ? 's' : ''}`
const shuffled = <T,>(a: T[]) => [...a].sort(() => Math.random() - 0.5)

/** 4択を作る（重複を除き、足りなければ近い数でうめる） */
function choice(q: string, answer: string | number, wrongs: (string | number)[], explain: string): Question {
  const a = String(answer)
  const set = [a]
  for (const w of wrongs) {
    const s = String(w)
    if (!set.includes(s) && s !== 'NaN') set.push(s)
    if (set.length === 4) break
  }
  const n = Number(a)
  for (let k = 1; set.length < 4; k++) {
    const cand = Number.isFinite(n) ? String(n + (k % 2 ? k : -k) * 2) : `${a}${tr('？', '?').repeat(k)}`
    if (!set.includes(cand)) set.push(cand)
  }
  return { type: 'choice', q, choices: set, answer: a, explain }
}

/** 1〜max の数値を n 個（重複なし） */
function nums(n: number, max = 60, min = 1) {
  const out = new Set<number>()
  while (out.size < n) out.add(ri(min, max))
  return [...out]
}

/** 平均が整数になる n 個の数値 */
function avgNums(n: number): { vals: number[]; avg: number } {
  for (;;) {
    const avg = ri(20, 80)
    const vals = Array.from({ length: n - 1 }, () => ri(avg - 25, avg + 25))
    const last = avg * n - vals.reduce((a, b) => a + b, 0)
    if (last >= 1 && last <= 100) return { vals: shuffled([...vals, last]), avg }
  }
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0)

// ---------------------------------------------------------------- セルの基本
export const genAddress: QGen = () => {
  const ci = ri(0, 6)
  const c = COLS[ci]
  const r = ri(2, 30)
  return choice(
    tr(`「${c}${r}」は どこの セル？`, `Where is cell "${c}${r}"?`),
    tr(`${c}列の${r}行目`, `Column ${c}, row ${r}`),
    tra([`${r}列目の${c}行目`, `${c}行の${r}列目`, `${COLS[ci + 1]}列の${r - 1}行目`], [`Column ${r}, row ${c}`, `Row ${c}, column ${r}`, `Column ${COLS[ci + 1]}, row ${r - 1}`]),
    tr('アルファベットが 列（縦）、数字が 行（横）。', 'The letter is the column (vertical), and the number is the row (horizontal).'),
  )
}

export const genNeighbor: QGen = () => {
  const ci = ri(1, 6)
  const r = ri(2, 20)
  const dirs = { 右: [0, 1], 左: [0, -1], 上: [-1, 0], 下: [1, 0] } as const
  const name = pick(Object.keys(dirs) as (keyof typeof dirs)[])
  const at = ([dr, dc]: readonly [number, number]) => `${COLS[ci + dc]}${r + dr}`
  const others = (Object.keys(dirs) as (keyof typeof dirs)[]).filter((k) => k !== name).map((k) => at(dirs[k]))
  const side = { 右: 'to the right of', 左: 'to the left of', 上: 'directly above', 下: 'directly below' }[name]
  return choice(
    tr(`「${COLS[ci]}${r}」の ${name}どなりの セルは？`, `Which cell is ${side} "${COLS[ci]}${r}"?`),
    at(dirs[name]),
    others,
    tr('左右に動くと 列（アルファベット）が、上下に動くと 行（数字）が 変わる。', 'Moving left or right changes the column (letter). Moving up or down changes the row (number).'),
  )
}

export const genRangeWrite: QGen = () => {
  // 範囲の 書き方（: で つなぐ）を 覚える
  const c1 = ri(0, 3)
  const c2 = c1 + ri(0, 2)
  const r1 = ri(1, 5)
  const r2 = r1 + ri(2, 6)
  const a = `${COLS[c1]}${r1}`
  const z = `${COLS[c2]}${r2}`
  return choice(
    tr(`${a} から ${z} までの 範囲を 数式で 指定したい。正しい 書き方は？`, `You want to use the range from ${a} to ${z} in a formula. How do you write it?`),
    `${a}:${z}`,
    [`${a}-${z}`, `${a}~${z}`, `${a}→${z}`],
    tr(`範囲は「左上のセル:右下のセル」と「:（コロン）」で つなぐ。=SUM(${a}:${z}) のように 使う。`, `A range joins "top-left cell:bottom-right cell" with ":" (a colon). Use it like =SUM(${a}:${z}).`),
  )
}

export const genRangeComma: QGen = () => {
  // 「:」は 範囲、「,」は 1つずつ 並べる
  const c = pick([...COLS.slice(0, 4)])
  const n = ri(3, 5)
  const cells = Array.from({ length: n }, (_, i) => `${c}${i + 1}`)
  return pick([
    () =>
      choice(
        tr(`=SUM(${c}1:${c}${n}) と 同じ 意味の 式は？`, `Which formula means the same as =SUM(${c}1:${c}${n})?`),
        `=${cells.join('+')}`,
        [`=${c}1+${c}${n}`, `=SUM(${c}1,${c}${n})`, `=${c}1*${c}${n}`],
        tr(
          `「:」は ${c}1 から ${c}${n} までの すべての セル。「,」で 区切ると ${c}1 と ${c}${n} の 2つだけに なる。`,
          `":" means every cell from ${c}1 to ${c}${n}. Separating them with "," gives just the two cells ${c}1 and ${c}${n}.`,
        ),
      ),
    () =>
      choice(
        tr(`=SUM(${c}1,${c}${n}) が 足すのは？`, `What does =SUM(${c}1,${c}${n}) add up?`),
        tr(`${c}1 と ${c}${n} の 2つだけ`, `Only the two cells ${c}1 and ${c}${n}`),
        tra([`${c}1 から ${c}${n} まで すべて`, `${c}${n} だけ`, 'エラーに なる'], [`Everything from ${c}1 to ${c}${n}`, `Only ${c}${n}`, 'An error']),
        tr(
          `「,」は セルを 1つずつ 並べる 書き方。${c}1 から ${c}${n} まで まとめて 足すなら =SUM(${c}1:${c}${n})。`,
          `"," lists cells one at a time. To add everything from ${c}1 to ${c}${n}, use =SUM(${c}1:${c}${n}).`,
        ),
      ),
  ])()
}

// ---------------------------------------------------------------- オートフィル
export const genSeriesFill: QGen = () => {
  const s = ri(1, 15)
  const d = ri(1, 6)
  const n = ri(4, 9)
  const v = s + (n - 1) * d
  return choice(
    tr(`A1に「${s}」、A2に「${s + d}」を入れ、2つ選んで 下へオートフィル。A${n} は？`, `Put ${s} in A1 and ${s + d} in A2, select both, and AutoFill down. What's in A${n}?`),
    v,
    [v + d, v - d, s * n, s],
    tr(`2つ選ぶと 差（${d}）ずつ 増える連番。${s} → ${s + d} → … → A${n} は ${v}。`, `Select two and you get a series that grows by the difference (${d}). ${s} → ${s + d} → … → A${n} is ${v}.`),
  )
}

export const genCopyFill: QGen = () => {
  const s = ri(2, 40)
  const n = ri(3, 8)
  return choice(
    tr(`A1に「${s}」だけ入れ、1つだけ選んで 下へオートフィル。A${n} は？`, `Put just ${s} in A1, select only that cell, and AutoFill down. What's in A${n}?`),
    s,
    [s + n - 1, s + 1, s * n],
    tr('数字1つだけだと「コピー」になる。連番にするなら 2つ選んでから ドラッグ。', 'A single number just gets copied. To make a series, select two cells before you drag.'),
  )
}

export const genMonthFill: QGen = () => {
  const m = ri(1, 12)
  const k = ri(1, 6)
  const at = (x: number) => tr(`${((x - 1) % 12) + 1}月`, EN_MONTHS[(x - 1) % 12])
  return choice(
    tr(`「${m}月」を 1つ選び、下へ オートフィル。${k}つ下の セルは？`, `Select just "${at(m)}" and AutoFill down. What's ${cells(k)} below?`),
    at(m + k),
    tra([`${m + k}月`, at(m + k + 1), at(m + k - 1), `${m}月`], [at(m + k + 1), at(m + k - 1), at(m), at(m + k + 2)]),
    tr('「月」は 1月〜12月を くり返す。12月の 次は 1月。', 'Months repeat from Jan to Dec. After Dec comes Jan.'),
  )
}

export const genDayFill: QGen = () => {
  const i = ri(0, 6)
  const k = ri(1, 6)
  return choice(
    tr(`「${DAYS[i]}」から 右へ オートフィル。${k}つ右の セルは？`, `AutoFill right from "${DAYS[i]}". What's ${cells(k)} to the right?`),
    DAYS[(i + k) % 7],
    [DAYS[(i + k + 1) % 7], DAYS[(i + k + 6) % 7], DAYS[i]],
    tr('曜日は 月〜日を くり返す。', 'Weekdays repeat from Mon to Sun.'),
  )
}

export const genRelativeRef: QGen = () => {
  const r = ri(2, 6)
  const k = ri(1, 5)
  const t = r + k
  return choice(
    tr(`D${r} の =B${r}*C${r} を 下へ ${k}つ オートフィル。D${t} の 数式は？`, `AutoFill =B${r}*C${r} in D${r} down ${cells(k)}. What's the formula in D${t}?`),
    `=B${t}*C${t}`,
    [`=B${r}*C${r}`, `=B${t}*C${r}`, `=C${t}*D${t}`],
    tr('数式を 下へ コピーすると、行番号も いっしょに ずれる（相対参照）。', 'Copy a formula down and its row numbers shift along with it (relative reference).'),
  )
}

// ---------------------------------------------------------------- 計算
export const genPrecedence: QGen = () => {
  // 暗算の 負担は 小さく（1けたの 数だけ）。知りたいのは「どこから 計算するか」
  const a = ri(1, 9)
  const b = ri(2, 5)
  const c = ri(2, 5)
  const v = pick(['plus', 'paren', 'which'] as const)
  if (v === 'plus')
    return choice(
      tr(`=${a}+${b}*${c} の 結果は？`, `What's the result of =${a}+${b}*${c}?`),
      a + b * c,
      [(a + b) * c, a * b + c, a + b + c],
      tr(`掛け算が 先。${b}×${c}=${b * c}、${a}+${b * c}=${a + b * c}。`, `Multiplication comes first. ${b}×${c}=${b * c}, then ${a}+${b * c}=${a + b * c}.`),
    )
  if (v === 'paren')
    return choice(
      tr(`=(${a}+${b})*${c} の 結果は？`, `What's the result of =(${a}+${b})*${c}?`),
      (a + b) * c,
      [a + b * c, a * b * c, a + b + c],
      tr(`カッコの中が 最優先。${a}+${b}=${a + b}、×${c}=${(a + b) * c}。`, `Parentheses come first. ${a}+${b}=${a + b}, then ×${c}=${(a + b) * c}.`),
    )
  return choice(
    tr('=A1+B1*C1 で、最初に 計算されるのは？', 'In =A1+B1*C1, what is calculated first?'),
    'B1*C1',
    ['A1+B1', 'A1*C1', tr('左から 順番に', 'Left to right, in order')],
    tr(
      '掛け算・割り算が 足し算・引き算より 先。先に 足したいときは =(A1+B1)*C1 と カッコで 囲む。',
      'Multiplication and division come before addition and subtraction. To add first, wrap it in parentheses: =(A1+B1)*C1.',
    ),
  )
}

export const genDivision: QGen = () => {
  const a = ri(2, 9)
  const b = pick([2, 5, 10])
  const c = ri(1, 9)
  return choice(
    tr(`=${a * b}/${b}+${c} の 結果は？`, `What's the result of =${a * b}/${b}+${c}?`),
    a + c,
    [(a * b) / (b + c), a * b + c, a - c, a + c + b].map((x) => Math.round(x * 10) / 10),
    tr(`割り算が 先。${a * b}÷${b}=${a}、${a}+${c}=${a + c}。`, `Division comes first. ${a * b}÷${b}=${a}, then ${a}+${c}=${a + c}.`),
  )
}

export const genSumValues: QGen = () => {
  const n = 3
  const vals = nums(n, 9)
  const c = pick([...COLS.slice(0, 4)])
  const s = sum(vals)
  return choice(
    tr(`${c}1〜${c}${n} に ${vals.join('、')} が 入っている。=SUM(${c}1:${c}${n}) は？`, `${c}1 to ${c}${n} contain ${vals.join(', ')}. What's =SUM(${c}1:${c}${n})?`),
    s,
    [s - vals[n - 1], s + vals[0], Math.max(...vals), s + 10],
    `${vals.join(' + ')} = ${s}${tr('。', '.')}`,
  )
}

export const genAverageValues: QGen = () => {
  // 平均は 暗算させず「どう 計算しているか」を 問う
  const n = ri(3, 6)
  const c = pick([...COLS.slice(0, 4)])
  const r = `${c}1:${c}${n}`
  return choice(
    tr(`=AVERAGE(${r}) と 同じ 答えに なる 式は？（${r} は すべて 数値）`, `Which formula gives the same answer as =AVERAGE(${r})? (${r} are all numbers)`),
    `=SUM(${r})/${n}`,
    [`=SUM(${r})*${n}`, `=SUM(${r})/2`, `=MAX(${r})/${n}`],
    tr(
      `平均は「合計 ÷ 個数」。${r} は ${n}個 なので =SUM(${r})/${n} と 同じ。AVERAGE なら 個数を 数えなくて いい。`,
      `An average is "total ÷ count". ${r} has ${n} cells, so it's the same as =SUM(${r})/${n}. With AVERAGE, you don't have to count them.`,
    ),
  )
}

// ---------------------------------------------------------------- 関数
export const genMaxMin: QGen = () => {
  const vals = nums(ri(4, 6), 99)
  const f = pick(['MAX', 'MIN'] as const)
  const sorted = [...vals].sort((a, b) => a - b)
  const ans = f === 'MAX' ? sorted[sorted.length - 1] : sorted[0]
  const other = f === 'MAX' ? sorted[0] : sorted[sorted.length - 1]
  const second = f === 'MAX' ? sorted[sorted.length - 2] : sorted[1]
  return choice(
    tr(`=${f}(${vals.join(',')}) の 結果は？`, `What's the result of =${f}(${vals.join(',')})?`),
    ans,
    [other, second, sum(vals)],
    tr(`${f === 'MAX' ? 'MAX は 最大値' : 'MIN は 最小値'}。この中では ${ans}。`, `${f === 'MAX' ? 'MAX gives the largest value' : 'MIN gives the smallest value'}. Here, that's ${ans}.`),
  )
}

const TEXTS = tra(['休み', '欠席', 'なし', '未定'], ['Closed', 'Absent', 'None', 'TBD'])
function mixed() {
  const n = ri(5, 7)
  const items: (number | string)[] = []
  for (let i = 0; i < n; i++) {
    const r = Math.random()
    items.push(r < 0.55 ? ri(1, 50) : r < 0.85 ? pick(TEXTS) : '')
  }
  if (!items.some((x) => typeof x === 'number')) items[0] = ri(1, 50)
  return items
}
const showItems = (items: (number | string)[]) => items.map((v) => (v === '' ? tr('（空白）', '(blank)') : v)).join(tr('、', ', '))

export const genCount: QGen = () => {
  const items = mixed()
  const n = items.length
  const cnt = items.filter((x) => typeof x === 'number').length
  const nonEmpty = items.filter((x) => x !== '').length
  return choice(
    tr(`A1〜A${n} に「${showItems(items)}」。=COUNT(A1:A${n}) は？`, `A1 to A${n} contain: ${showItems(items)}. What's =COUNT(A1:A${n})?`),
    cnt,
    [nonEmpty, n, cnt + 1],
    tr(`COUNT は 数値の セルだけを 数える。文字と 空白は 数えない → ${cnt}個。`, `COUNT counts only cells with numbers. Text and blanks don't count → ${cnt}.`),
  )
}

export const genCountA: QGen = () => {
  const items = mixed()
  const n = items.length
  const cnt = items.filter((x) => typeof x === 'number').length
  const nonEmpty = items.filter((x) => x !== '').length
  return choice(
    tr(`A1〜A${n} に「${showItems(items)}」。=COUNTA(A1:A${n}) は？`, `A1 to A${n} contain: ${showItems(items)}. What's =COUNTA(A1:A${n})?`),
    nonEmpty,
    [cnt, n, nonEmpty - 1],
    tr(`COUNTA は 空白以外の セルを すべて 数える（文字も数える）→ ${nonEmpty}個。`, `COUNTA counts every cell that isn't blank (text included) → ${nonEmpty}.`),
  )
}

// ---------------------------------------------------------------- 数式を入力する問題
export const genFormulaSum: QGen = () => {
  const n = ri(4, 6)
  const vals = nums(n, 50)
  return {
    type: 'formula',
    q: tr(`A${n + 1} に A1〜A${n} の 合計を出す 数式を入力せよ！`, `Enter a formula in A${n + 1} for the total of A1 to A${n}!`),
    table: vals.map((v) => [v]),
    target: `A${n + 1}`,
    expect: sum(vals),
    mustUse: 'SUM',
    hint: `=SUM(A1:A${n})`,
    explain: `=SUM(A1:A${n}) → ${sum(vals)}`,
  }
}

export const genFormulaAvg: QGen = () => {
  const n = ri(3, 5)
  const { vals, avg } = avgNums(n)
  return {
    type: 'formula',
    q: tr(`B${n + 1} に B1〜B${n} の 平均を出す 数式を入力せよ！`, `Enter a formula in B${n + 1} for the average of B1 to B${n}!`),
    table: vals.map((v) => ['', v]),
    target: `B${n + 1}`,
    expect: avg,
    mustUse: 'AVERAGE',
    hint: `=AVERAGE(B1:B${n})`,
    explain: `=AVERAGE(B1:B${n}) → ${avg}`,
  }
}

export const genFormulaMaxMin: QGen = () => {
  const n = ri(4, 6)
  const vals = nums(n, 99)
  const f = pick(['MAX', 'MIN'] as const)
  const ans = f === 'MAX' ? Math.max(...vals) : Math.min(...vals)
  return {
    type: 'formula',
    q: tr(`A${n + 1} に A1〜A${n} の ${f === 'MAX' ? '最大値' : '最小値'}を出せ！`, `Get the ${f === 'MAX' ? 'largest' : 'smallest'} value of A1 to A${n} in A${n + 1}!`),
    table: vals.map((v) => [v]),
    target: `A${n + 1}`,
    expect: ans,
    mustUse: f,
    hint: `=${f}(A1:A${n})`,
    explain: `=${f}(A1:A${n}) → ${ans}`,
  }
}

export const genFormulaMul: QGen = () => {
  const price = ri(3, 30) * 10
  const qty = ri(2, 9)
  return {
    type: 'formula',
    q: tr('C2 に 小計（単価×数量）を出す 数式を入力せよ！', 'Enter a formula in C2 for the subtotal (price × qty)!'),
    table: [
      tra(['単価', '数量', '小計'], ['Price', 'Qty', 'Subtotal']),
      [price, qty],
    ],
    target: 'C2',
    expect: price * qty,
    mustUse: '*',
    hint: '=A2*B2',
    explain: `=A2*B2 → ${price}×${qty} = ${price * qty}`,
  }
}

export const genFormulaCount: QGen = () => {
  const items = mixed()
  const n = items.length
  const cnt = items.filter((x) => typeof x === 'number').length
  return {
    type: 'formula',
    q: tr(`A${n + 1} に A1〜A${n} の「数値のセルの個数」を出せ！`, `In A${n + 1}, get how many cells in A1 to A${n} contain numbers!`),
    table: items.map((v) => [v]),
    target: `A${n + 1}`,
    expect: cnt,
    mustUse: 'COUNT',
    hint: `=COUNT(A1:A${n})`,
    explain: `=COUNT(A1:A${n}) → ${cnt}${tr('（文字と空白は 数えない）', ' (text and blanks are not counted)')}`,
  }
}

// ---------------------------------------------------------------- 第2章：参照（$）
const DOLLAR_FORMS = (c: string, r: number) => [`$${c}$${r}`, `${c}$${r}`, `$${c}${r}`, `${c}${r}`]

export const genAbsCopy: QGen = () => {
  // =B2*$E$1 を下へコピー
  const r = ri(2, 4)
  const k = ri(2, 6)
  const t = r + k
  const fix = pick(['E1', 'F1', 'E2', 'G1'])
  const [fc, fr] = [fix[0], Number(fix.slice(1))]
  return choice(
    tr(`C${r} の =B${r}*$${fc}$${fr} を 下へ ${k}つ コピー。C${t} の 数式は？`, `Copy =B${r}*$${fc}$${fr} in C${r} down ${cells(k)}. What's the formula in C${t}?`),
    `=B${t}*$${fc}$${fr}`,
    [`=B${t}*$${fc}$${fr + k}`, `=B${r}*$${fc}$${fr}`, `=B${t}*${fc}${fr + k}`],
    tr('$ が付いた 列・行は コピーしても 動かない。付いていない B は 行が ずれる。', "Columns and rows with $ don't move when copied. B has no $, so its row shifts."),
  )
}

export const genRelShift: QGen = () => {
  // 右や下へコピーしたときの 相対参照のずれ
  const r = ri(2, 6)
  const ci = ri(0, 3)
  const dir = pick(['下', '右'] as const)
  const k = ri(1, 4)
  const src = `${COLS[ci]}${r}`
  const ans = dir === '下' ? `${COLS[ci]}${r + k}` : `${COLS[ci + k]}${r}`
  return choice(
    tr(`=${src}*2 を ${dir}へ ${k}つ コピーすると、参照は どうなる？`, `Copy =${src}*2 ${dir === '下' ? 'down' : 'to the right'} ${cells(k)}. What does the reference become?`),
    `=${ans}*2`,
    [`=${src}*2`, dir === '下' ? `=${COLS[ci + k]}${r}*2` : `=${COLS[ci]}${r + k}*2`, `=${COLS[ci + 1]}${r + 1}*2`],
    tr('相対参照は コピーした方向へ、同じだけ ずれる。', 'A relative reference shifts by the same amount in the direction you copy.'),
  )
}

export const genF4Cycle: QGen = () => {
  const c = pick([...COLS.slice(0, 6)])
  const r = ri(1, 9)
  const f = DOLLAR_FORMS(c, r) // F4 1回→$A$1, 2回→A$1, 3回→$A1, 4回→A1
  const n = ri(1, 4)
  return choice(
    tr(`数式で「${c}${r}」を 選んで F4キーを ${n}回 押すと？`, `In a formula, you select "${c}${r}" and press F4 ${n} time${n > 1 ? 's' : ''}. What do you get?`),
    f[(n - 1) % 4],
    f.filter((_, i) => i !== (n - 1) % 4),
    tr('F4 を押すたびに $A$1 → A$1 → $A1 → A1 と 切り替わる。', 'Each press of F4 cycles $A$1 → A$1 → $A1 → A1.'),
  )
}

export const genMixedMeaning: QGen = () => {
  const c = pick([...COLS.slice(0, 5)])
  const r = ri(1, 9)
  const v = pick(['row', 'col', 'both'] as const)
  const ref = v === 'row' ? `${c}$${r}` : v === 'col' ? `$${c}${r}` : `$${c}$${r}`
  const [row, col, both, none] = tra(['行だけ 固定', '列だけ 固定', '行も列も 固定', 'どちらも 固定しない'], ['Locks the row only', 'Locks the column only', 'Locks both row and column', 'Locks neither'])
  const ans = v === 'row' ? row : v === 'col' ? col : both
  return choice(
    tr(`「${ref}」の 意味は？`, `What does "${ref}" mean?`),
    ans,
    [row, col, both, none],
    tr('$ は すぐ後ろの 列（英字）や 行（数字）を 固定する。', '$ locks the column (letter) or row (number) right after it.'),
  )
}

export const genMixedCopy: QGen = () => {
  // =$A2*B$1 を 右下へコピー
  const dr = ri(1, 4)
  const dc = ri(1, 3)
  const r = 2 + dr
  const c = COLS[1 + dc]
  return choice(
    tr(`B2 の =$A2*B$1 を ${c}${r} に コピー。${c}${r} の 数式は？`, `Copy =$A2*B$1 from B2 to ${c}${r}. What's the formula in ${c}${r}?`),
    `=$A${r}*${c}$1`,
    [`=$A2*B$1`, `=$${COLS[dc]}${r}*${c}$${1 + dr}`, `=A${r}*${c}1`, `=$A${r}*B$1`],
    tr('$A は 列が A のまま、$1 は 行が 1 のまま。それ以外は ずれる。', '$A keeps the column at A, and $1 keeps the row at 1. Everything else shifts.'),
  )
}

export const genShareValue: QGen = () => {
  const total = pick([200, 400, 500, 800, 1000])
  const pct = pick([10, 20, 25, 40, 50])
  const v = (total * pct) / 100
  return choice(
    tr(`B2 に ${v}、合計の B6 に ${total}。構成比 =B2/$B$6 の 結果は？（％表示）`, `B2 has ${v}, and the total in B6 is ${total}. What's the share =B2/$B$6? (as a percentage)`),
    `${pct}%`,
    [`${pct / 10}%`, `${100 - pct}%`, `${pct * 2}%`],
    `${v} ÷ ${total} = ${pct / 100} → ${pct}%${tr('。', '.')}`,
  )
}

export const genRound: QGen = () => {
  const base = ri(10, 99)
  const frac = pick([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const x = base + frac / 10
  const up = frac >= 5
  return choice(
    tr(`=ROUND(${x}, 0) の 結果は？`, `What's the result of =ROUND(${x}, 0)?`),
    up ? base + 1 : base,
    [up ? base : base + 1, x, base * 10 + frac],
    tr(`ROUND(数値, 0) は 小数第1位で 四捨五入。${x} → ${up ? base + 1 : base}。`, `ROUND(number, 0) rounds at the first decimal place. ${x} → ${up ? base + 1 : base}.`),
  )
}

export const genFormulaTax: QGen = () => {
  // 税率を絶対参照で固定させる：コピー先でも 正しく計算できるか
  const rate = pick([8, 10])
  const n = 3
  const prices = nums(n, 50, 5).map((x) => x * 100)
  const table: (string | number)[][] = [[...tra(['価格', '税込', '', '税率'], ['Price', 'With Tax', '', 'Tax Rate']), rate / 100]]
  prices.forEach((p) => table.push([p]))
  return {
    type: 'formula',
    q: tr(`B2 に 税込価格（価格×(1＋税率)）を出せ！ 税率は E1。B3・B4 にも コピーするぞ。`, `Get the price with tax (price × (1 + tax rate)) in B2! The tax rate is in E1. It will be copied to B3 and B4 too.`),
    table,
    target: 'B2',
    expect: prices[0] * (1 + rate / 100),
    copies: [
      { at: 'B3', expect: prices[1] * (1 + rate / 100) },
      { at: 'B4', expect: prices[2] * (1 + rate / 100) },
    ],
    mustUse: '$',
    hint: '=A2*(1+$E$1)',
    explain: tr('=A2*(1+$E$1)。E1 に $ を付けないと、コピーで E2・E3 に ずれてしまう。', '=A2*(1+$E$1). Without $ on E1, copying shifts it to E2 and E3.'),
  }
}

export const genFormulaShare: QGen = () => {
  const n = 3
  const vals = nums(n, 60, 10)
  const total = sum(vals)
  const table: (string | number)[][] = [tra(['売上', '構成比'], ['Sales', 'Share'])]
  vals.forEach((v) => table.push([v]))
  table.push([total])
  return {
    type: 'formula',
    q: tr(`B2 に 構成比（売上÷合計）を出せ！ 合計は A${n + 2}。B3・B4 にも コピーするぞ。`, `Get the share (sales ÷ total) in B2! The total is in A${n + 2}. It will be copied to B3 and B4 too.`),
    table,
    target: 'B2',
    expect: vals[0] / total,
    copies: [
      { at: 'B3', expect: vals[1] / total },
      { at: 'B4', expect: vals[2] / total },
    ],
    mustUse: '$',
    hint: `=A2/$A$${n + 2}`,
    explain: tr(`=A2/$A$${n + 2}（または A$${n + 2}）。合計の セルを 固定するのが コツ。`, `=A2/$A$${n + 2} (or A$${n + 2}). The trick is to lock the total's cell.`),
  }
}

export const genFormulaTimes: QGen = () => {
  // 九九の表：複合参照
  const a = ri(2, 5)
  const b = ri(2, 5)
  const table: (string | number)[][] = [['', a, a + 1], [b], [b + 1]]
  return {
    type: 'formula',
    q: tr('B2 に 掛け算表の 数式を入れよ！（左の数 × 上の数） C2・B3・C3 にも コピーするぞ。', 'Enter the times-table formula in B2! (left number × top number) It will be copied to C2, B3 and C3 too.'),
    table,
    target: 'B2',
    expect: a * b,
    copies: [
      { at: 'C2', expect: (a + 1) * b },
      { at: 'B3', expect: a * (b + 1) },
      { at: 'C3', expect: (a + 1) * (b + 1) },
    ],
    mustUse: '$',
    hint: '=$A2*B$1',
    explain: tr('=$A2*B$1。列を固定した $A と、行を固定した $1 の 組み合わせ（複合参照）。', '=$A2*B$1. It combines $A, which locks the column, with $1, which locks the row (mixed reference).'),
  }
}

export const genFormulaRound: QGen = () => {
  const price = ri(11, 99) * 10 + pick([3, 7])
  const off = pick([0.85, 0.9, 0.75])
  const raw = price * off
  const ans = Math.round(raw)
  return {
    type: 'formula',
    q: tr(`B1 に A1 の ${Math.round((1 - off) * 100)}% 引き（×${off}）を、四捨五入して 整数で 出せ！`, `In B1, get A1 with ${Math.round((1 - off) * 100)}% off (×${off}), rounded to a whole number!`),
    table: [[price]],
    target: 'B1',
    expect: ans,
    mustUse: 'ROUND',
    hint: `=ROUND(A1*${off},0)`,
    explain: `=ROUND(A1*${off},0) → ${ans}`,
  }
}

// ---------------------------------------------------------------- 第3章：条件（IF）
const TF = (b: boolean) => (b ? 'TRUE' : 'FALSE')
type Op = '>=' | '<=' | '>' | '<' | '=' | '<>'
const CMP: Record<Op, (a: number, b: number) => boolean> = {
  '>=': (a, b) => a >= b,
  '<=': (a, b) => a <= b,
  '>': (a, b) => a > b,
  '<': (a, b) => a < b,
  '=': (a, b) => a === b,
  '<>': (a, b) => a !== b,
}
const OP_NAME: Record<Op, string> = tra(
  { '>=': '以上', '<=': '以下', '>': 'より大きい', '<': '未満', '=': '等しい', '<>': '等しくない' },
  { '>=': 'at least', '<=': 'at most', '>': 'greater than', '<': 'less than', '=': 'equal to', '<>': 'not equal to' },
)
const PAIRS: [string, string][] = tra<[string, string][]>(
  [
    ['合格', '不合格'],
    ['大漁', '不漁'],
    ['出航', '欠航'],
    ['○', '×'],
    ['OK', 'NG'],
  ],
  [
    ['Pass', 'Fail'],
    ['Great', 'Poor'],
    ['Sail', 'Stay'],
    ['Yes', 'No'],
    ['OK', 'NG'],
  ],
)
/** しきい値 t の まわりの数（ちょうど t も 出る） */
const around = (t: number, w: number) => pick([t, t + ri(1, w), t - ri(1, w)])

export const genCompare: QGen = () => {
  const op = pick(Object.keys(CMP) as Op[])
  const a = ri(10, 99)
  const b = around(a, 6)
  const r = CMP[op](a, b)
  return choice(
    tr(`A1 に ${a}、B1 に ${b}。=A1${op}B1 の 結果は？`, `A1 has ${a} and B1 has ${b}. What's the result of =A1${op}B1?`),
    TF(r),
    [TF(!r), '#VALUE!', '0'],
    tr(
      `「${op}」は「${OP_NAME[op]}」。${a} ${op} ${b} は ${r ? '正しい → TRUE' : '正しくない → FALSE'}。`,
      `"${op}" means "${OP_NAME[op]}." ${a} ${op} ${b} is ${r ? 'true → TRUE' : 'not true → FALSE'}.`,
    ),
  )
}

export const genOpMeaning: QGen = () => {
  const table: [Op, string[]][] = [
    ['>=', ['>', '≧', '<=']],
    ['<=', ['<', '≦', '>=']],
    ['>', ['>=', '≧', '<']],
    ['<', ['<=', '≦', '>']],
    ['<>', ['!=', '≠', '><']],
  ]
  const [ans, wrongs] = pick(table)
  return choice(
    tr(`「${OP_NAME[ans]}」を 表す 数式の 比較演算子は？`, `Which comparison operator means "${OP_NAME[ans]}" in a formula?`),
    ans,
    wrongs,
    tr('数式では ≧ ≦ ≠ は 使えない。>= <= <> と 書く。', "You can't use ≧ ≦ ≠ in formulas. Write >= <= <>."),
  )
}

export const genIfText: QGen = () => {
  const t = pick([50, 60, 70, 80])
  const x = around(t, 20)
  const [yes, no] = pick(PAIRS)
  const op = pick(['>=', '>'] as const)
  const r = CMP[op](x, t)
  return choice(
    tr(`A1 に ${x}。=IF(A1${op}${t},"${yes}","${no}") の 結果は？`, `A1 has ${x}. What's the result of =IF(A1${op}${t},"${yes}","${no}")?`),
    r ? yes : no,
    [r ? no : yes, 'TRUE', 'FALSE'],
    tr(
      `${x} ${op} ${t} は ${TF(r)} → ${r ? '1つ目' : '2つ目'}の「${r ? yes : no}」。${x === t ? `（ちょうど ${t} は、>= なら 含まれ、> なら 含まれない）` : ''}`,
      `${x} ${op} ${t} is ${TF(r)} → the ${r ? 'first' : 'second'} answer, "${r ? yes : no}".${x === t ? ` (Exactly ${t} is included with >= but not with >.)` : ''}`,
    ),
  )
}

export const genIfNum: QGen = () => {
  const v = pick(['ship', 'bonus'] as const)
  if (v === 'ship') {
    const x = around(3000, 15) === 3000 ? 3000 : pick([ri(20, 29), ri(31, 60)]) * 100
    const r = x >= 3000 ? 0 : 500
    return choice(
      tr(`A1 に ${x}。=IF(A1>=3000,0,500) の 結果は？`, `A1 has ${x}. What's the result of =IF(A1>=3000,0,500)?`),
      r,
      [r === 0 ? 500 : 0, x, x + 500],
      tr(`${x} >= 3000 は ${TF(x >= 3000)} → ${r}（3000以上は 送料 無料）。`, `${x} >= 3000 is ${TF(x >= 3000)} → ${r} (3000 or more ships free).`),
    )
  }
  const t = pick([100, 200])
  const x = around(t, 5)
  const r = x >= t ? x + 100 : x
  return choice(
    tr(`A1 に ${x}。=IF(A1>=${t},A1+100,A1) の 結果は？`, `A1 has ${x}. What's the result of =IF(A1>=${t},A1+100,A1)?`),
    r,
    [x >= t ? x : x + 100, t, t + 100],
    tr(`${x} >= ${t} は ${TF(x >= t)} → ${x >= t ? 'A1+100' : 'A1'} で ${r}。`, `${x} >= ${t} is ${TF(x >= t)} → ${x >= t ? 'A1+100' : 'A1'}, so ${r}.`),
  )
}

export const genNestedIf: QGen = () => {
  const [hi, mid] = pick([
    [80, 60],
    [90, 70],
    [70, 40],
  ])
  const x = pick([around(hi, 8), around(mid, 8), ri(10, mid - 1)])
  const r = x >= hi ? 'A' : x >= mid ? 'B' : 'C'
  return choice(
    tr(`A1 に ${x}。=IF(A1>=${hi},"A",IF(A1>=${mid},"B","C")) の 結果は？`, `A1 has ${x}. What's the result of =IF(A1>=${hi},"A",IF(A1>=${mid},"B","C"))?`),
    r,
    ['A', 'B', 'C', 'FALSE'],
    tr(
      `まず ${x}>=${hi} は ${TF(x >= hi)}。${x >= hi ? '→ A' : `違うので 中の IF へ。${x}>=${mid} は ${TF(x >= mid)} → ${r}`}。`,
      `First, ${x}>=${hi} is ${TF(x >= hi)}. ${x >= hi ? '→ A' : `It's not, so on to the inner IF. ${x}>=${mid} is ${TF(x >= mid)} → ${r}`}.`,
    ),
  )
}

export const genAndOr: QGen = () => {
  const a = ri(1, 20)
  const b = ri(1, 6)
  const t1 = ri(5, 15)
  const t2 = ri(2, 5)
  const fn = pick(['AND', 'OR'] as const)
  const c1 = a < t1
  const c2 = b < t2
  const r = fn === 'AND' ? c1 && c2 : c1 || c2
  return choice(
    tr(`A1 に ${a}、B1 に ${b}。=${fn}(A1<${t1},B1<${t2}) の 結果は？`, `A1 has ${a} and B1 has ${b}. What's the result of =${fn}(A1<${t1},B1<${t2})?`),
    TF(r),
    [TF(!r), '#VALUE!', '1'],
    tr(
      `A1<${t1} は ${TF(c1)}、B1<${t2} は ${TF(c2)}。${fn === 'AND' ? 'AND は 両方 TRUE の ときだけ TRUE' : 'OR は 1つでも TRUE なら TRUE'}。`,
      `A1<${t1} is ${TF(c1)} and B1<${t2} is ${TF(c2)}. ${fn === 'AND' ? 'AND is TRUE only when both are TRUE' : 'OR is TRUE if even one is TRUE'}.`,
    ),
  )
}

const CATCH = tra(['魚', '貝', '海藻', 'カニ'], ['Fish', 'Shell', 'Kelp', 'Crab'])
function catchList(n: number) {
  const items = Array.from({ length: n }, () => pick(CATCH))
  if (!items.includes(CATCH[0])) items[ri(0, n - 1)] = CATCH[0]
  return items
}

export const genCountIfText: QGen = () => {
  const n = ri(5, 7)
  const items = catchList(n)
  const k = pick(items)
  const cnt = items.filter((x) => x === k).length
  return choice(
    tr(`A1〜A${n} に「${items.join('、')}」。=COUNTIF(A1:A${n},"${k}") は？`, `A1 to A${n} contain: ${items.join(', ')}. What's =COUNTIF(A1:A${n},"${k}")?`),
    cnt,
    [n, cnt + 1, cnt - 1 || cnt + 2],
    tr(`「${k}」の セルだけを 数える → ${cnt}個。`, `Count only the "${k}" cells → ${cnt}.`),
  )
}

export const genCountIfNum: QGen = () => {
  const n = ri(5, 7)
  const vals = nums(n, 99)
  const t = pick([30, 50, 60, 70])
  const op = pick(['>=', '<'] as const)
  const cnt = vals.filter((v) => CMP[op](v, t)).length
  return choice(
    tr(`A1〜A${n} に ${vals.join('、')}。=COUNTIF(A1:A${n},"${op}${t}") は？`, `A1 to A${n} contain ${vals.join(', ')}. What's =COUNTIF(A1:A${n},"${op}${t}")?`),
    cnt,
    [n - cnt, n, cnt + 1],
    tr(
      `${t}${OP_NAME[op]}の 数を 数える → ${vals.filter((v) => CMP[op](v, t)).join('、') || 'なし'} で ${cnt}個。条件は "${op}${t}" のように " で 囲む。`,
      `Count the numbers ${OP_NAME[op]} ${t} → ${vals.filter((v) => CMP[op](v, t)).join(', ') || 'none'}, so ${cnt}. Wrap the condition in ", like "${op}${t}".`,
    ),
  )
}

export const genSumIf: QGen = () => {
  const n = ri(4, 5)
  const items = catchList(n)
  const amts = Array.from({ length: n }, () => ri(2, 30))
  const k = pick(items)
  const s = items.reduce((a, x, i) => a + (x === k ? amts[i] : 0), 0)
  const rows = items.map((x, i) => `${x}:${amts[i]}`).join(tr('、', ', '))
  return choice(
    tr(`A列（種類）と B列（数）に「${rows}」。=SUMIF(A1:A${n},"${k}",B1:B${n}) は？`, `Column A (type) and column B (amount) hold: ${rows}. What's =SUMIF(A1:A${n},"${k}",B1:B${n})?`),
    s,
    [sum(amts), items.filter((x) => x === k).length, s + ri(2, 9)],
    tr(`「${k}」の 行の 数だけを 足す → ${s}。`, `Add only the amounts in the "${k}" rows → ${s}.`),
  )
}

// ---- 第3章：数式を入力する問題（コピー先で もう片方の 分岐も 確かめる）
/** しきい値の 上と 下が 必ず 混ざる 3つの数 */
function mixed3(t: number, w: number, step = 1) {
  const up = ri(t / step, (t + w) / step) * step
  const down = ri((t - w) / step, t / step - 1) * step
  return shuffled([up, down, pick([up, down, ri((t - w) / step, (t + w) / step) * step])])
}

export const genFormulaIf: QGen = () => {
  const t = pick([50, 60, 70])
  const [yes, no] = pick(PAIRS)
  const vals = mixed3(t, 30)
  const at = (v: number) => (v >= t ? yes : no)
  return {
    type: 'formula',
    q: tr(`B2 に「A2 が ${t}以上なら "${yes}"、違えば "${no}"」を 出せ！ B3・B4 にも コピーするぞ。`, `In B2, show "${yes}" if A2 is ${t} or more, otherwise "${no}"! It will be copied to B3 and B4 too.`),
    table: [tra(['点数', '判定'], ['Score', 'Result']), ...vals.map((v) => [v])],
    target: 'B2',
    expect: at(vals[0]),
    copies: [
      { at: 'B3', expect: at(vals[1]) },
      { at: 'B4', expect: at(vals[2]) },
    ],
    mustUse: 'IF',
    hint: `=IF(A2>=${t},"${yes}","${no}")`,
    explain: tr(`=IF(A2>=${t},"${yes}","${no}")。文字は " で 囲む。`, `=IF(A2>=${t},"${yes}","${no}"). Wrap text in ".`),
  }
}

export const genFormulaIfNum: QGen = () => {
  const vals = mixed3(3000, 2000, 100)
  const fee = (v: number) => (v >= 3000 ? 0 : 500)
  return {
    type: 'formula',
    q: tr('B2 に 送料を 出せ！（金額が 3000以上なら 0、違えば 500） B3・B4 にも コピーするぞ。', 'Show the shipping in B2! (0 if the amount is 3000 or more, otherwise 500) It will be copied to B3 and B4 too.'),
    table: [tra(['金額', '送料'], ['Amount', 'Shipping']), ...vals.map((v) => [v])],
    target: 'B2',
    expect: fee(vals[0]),
    copies: [
      { at: 'B3', expect: fee(vals[1]) },
      { at: 'B4', expect: fee(vals[2]) },
    ],
    mustUse: 'IF',
    hint: '=IF(A2>=3000,0,500)',
    explain: tr('=IF(A2>=3000,0,500)。答えの ところに 数値も 書ける。', '=IF(A2>=3000,0,500). Numbers can go in the answer spots too.'),
  }
}

export const genFormulaAnd: QGen = () => {
  // 風速 10未満 かつ 波 2未満 なら 出航
  const rows: [number, number][] = shuffled([
    [ri(1, 9), ri(0, 1)],
    [ri(10, 20), ri(0, 1)],
    pick([
      [ri(1, 9), ri(2, 4)],
      [ri(1, 9), ri(0, 1)],
    ]),
  ])
  const [sail, stay] = tra(['出航', '欠航'], ['Sail', 'Stay'])
  const at = ([w, h]: [number, number]) => (w < 10 && h < 2 ? sail : stay)
  return {
    type: 'formula',
    q: tr(
      'C2 に「風速（A）が 10未満 かつ 波（B）が 2未満 なら "出航"、違えば "欠航"」を 出せ！ C3・C4 にも コピー。',
      'In C2, show "Sail" if the wind (A) is under 10 AND the waves (B) are under 2, otherwise "Stay"! It will be copied to C3 and C4.',
    ),
    table: [tra(['風速', '波', '判定'], ['Wind', 'Waves', 'Result']), ...rows],
    target: 'C2',
    expect: at(rows[0]),
    copies: [
      { at: 'C3', expect: at(rows[1]) },
      { at: 'C4', expect: at(rows[2]) },
    ],
    mustUse: 'AND',
    hint: tr('=IF(AND(A2<10,B2<2),"出航","欠航")', '=IF(AND(A2<10,B2<2),"Sail","Stay")'),
    explain: tr('=IF(AND(A2<10,B2<2),"出航","欠航")。「かつ」は AND。', '=IF(AND(A2<10,B2<2),"Sail","Stay"). "And" is AND.'),
  }
}

export const genFormulaCountIf: QGen = () => {
  const n = 6
  const items = catchList(n)
  const k = pick(items)
  return {
    type: 'formula',
    q: tr(`C1 に A1〜A${n} の「${k}」の 数を 出せ！`, `In C1, show how many "${k}" there are in A1 to A${n}!`),
    table: items.map((x) => [x]),
    target: 'C1',
    expect: items.filter((x) => x === k).length,
    mustUse: 'COUNTIF',
    hint: `=COUNTIF(A1:A${n},"${k}")`,
    explain: `=COUNTIF(A1:A${n},"${k}")`,
  }
}

export const genFormulaSumIf: QGen = () => {
  const n = 5
  const items = catchList(n)
  const amts = Array.from({ length: n }, () => ri(2, 30))
  const k = pick(items)
  return {
    type: 'formula',
    q: tr(`D1 に、A列が「${k}」の 行の B列（数）の 合計を 出せ！`, `In D1, show the total of column B (amount) for rows where column A is "${k}"!`),
    table: items.map((x, i) => [x, amts[i]]),
    target: 'D1',
    expect: items.reduce((a, x, i) => a + (x === k ? amts[i] : 0), 0),
    mustUse: 'SUMIF',
    hint: `=SUMIF(A1:A${n},"${k}",B1:B${n})`,
    explain: tr(`=SUMIF(A1:A${n},"${k}",B1:B${n})。条件の範囲 → 条件 → 合計する範囲 の 順。`, `=SUMIF(A1:A${n},"${k}",B1:B${n}). The order is range to check → condition → range to total.`),
  }
}

// ---------------------------------------------------------------- 第4章：検索（VLOOKUP・XLOOKUP）
const BOOKS = tra(
  ['表の書', '関数の書', '参照の書', '条件の書', '検索の書', '集計の書', '書式の書', '印刷の書'],
  ['Tables', 'Functions', 'References', 'Conditions', 'Searching', 'Totals', 'Formatting', 'Printing'],
)
const COL_LETTERS = 'ABCDEFGH'

/** 番号・名前・値段 の 4行の 表（番号は 飛び飛び） */
function lookupTable() {
  const start = ri(1, 5) * 100
  // k * 3 + (0〜2) なので 番号は かならず ちがう
  const ids = shuffled([1, 2, 3, 4, 5, 6].map((k) => start + k * 3 + ri(0, 2))).slice(0, 4)
  const names = shuffled(BOOKS).slice(0, 4)
  const prices = nums(4, 90, 10).map((p) => p * 10)
  return ids.map((id, i) => [id, names[i], prices[i]] as [number, string, number])
}

export const genVlookupPick: QGen = () => {
  const t = lookupTable()
  const row = pick(t)
  const col = pick([2, 3])
  const ans = row[col - 1]
  const other = t.find((r) => r !== row)!
  return choice(
    tr(
      `A1:C4 に「番号・書名・値段」の 表（${t.map((r) => r.join('/')).join('、')}）。=VLOOKUP(${row[0]},A1:C4,${col},FALSE) は？`,
      `A1:C4 holds a "No./Title/Price" table (${t.map((r) => r.join('/')).join(', ')}). What's =VLOOKUP(${row[0]},A1:C4,${col},FALSE)?`,
    ),
    ans,
    [row[col === 2 ? 2 : 1], other[col - 1], '#N/A'],
    tr(
      `左端の 番号 ${row[0]} の 行を 探して、左から ${col}列目（${col === 2 ? '書名' : '値段'}）を 取り出す → ${ans}。`,
      `Find the row with No. ${row[0]} at the left edge and take the ${col === 2 ? '2nd column (Title)' : '3rd column (Price)'} from the left → ${ans}.`,
    ),
  )
}

export const genColIndex: QGen = () => {
  const a = ri(0, 3)
  const b = a + ri(2, 4)
  const k = ri(a + 1, b)
  const n = k - a + 1
  return choice(
    tr(
      `=VLOOKUP(…, ${COL_LETTERS[a]}2:${COL_LETTERS[b]}9, 列番号, FALSE) で ${COL_LETTERS[k]}列を 取り出したい。列番号は？`,
      `You want column ${COL_LETTERS[k]} from =VLOOKUP(…, ${COL_LETTERS[a]}2:${COL_LETTERS[b]}9, column number, FALSE). What's the column number?`,
    ),
    n,
    [k + 1, n - 1 || n + 2, n + 1],
    tr(
      `列番号は 範囲の 左端（${COL_LETTERS[a]}列）を 1 と 数える。${COL_LETTERS[k]}列は ${n}列目。シート全体の 何列目か では ない。`,
      `Column numbers count the left edge of the range (column ${COL_LETTERS[a]}) as 1. Column ${COL_LETTERS[k]} is number ${n}, not its position on the whole sheet.`,
    ),
  )
}

const GRADES: [number, string][] = [
  [0, 'C'],
  [50, 'B'],
  [70, 'A'],
  [90, 'S'],
]
export const genApproxPick: QGen = () => {
  const v = pick([ri(1, 49), ri(50, 69), ri(70, 89), ri(90, 100), pick([50, 70, 90])])
  const g = [...GRADES].reverse().find(([t]) => v >= t)![1]
  return choice(
    tr(`D1:E4 に 区切りの 表（0→C、50→B、70→A、90→S）。=VLOOKUP(${v},D1:E4,2,TRUE) は？`, `D1:E4 holds a cutoff table (0→C, 50→B, 70→A, 90→S). What's =VLOOKUP(${v},D1:E4,2,TRUE)?`),
    g,
    GRADES.map(([, x]) => x).filter((x) => x !== g),
    tr(
      `TRUE（近似一致）は「${v} 以下で いちばん 大きい 値」の 行を 選ぶ → ${g}。区切りの 表は 小さい順に 並べる。`,
      `TRUE (approximate match) picks the row with "the largest value at or below ${v}" → ${g}. Sort cutoff tables smallest first.`,
    ),
  )
}

export const genFormulaVlookup: QGen = () => {
  const t = lookupTable()
  const row = pick(t)
  const col = pick([2, 3])
  return {
    type: 'formula',
    q: tr(`F1 に、E1 の 番号の ${col === 2 ? '書名' : '値段'}を 表（A1:C4）から 取り出せ！`, `In F1, pull the ${col === 2 ? 'title' : 'price'} for E1's number from the table (A1:C4)!`),
    table: t.map((r, i) => (i === 0 ? [...r, '', row[0]] : r)),
    target: 'F1',
    expect: row[col - 1],
    mustUse: 'VLOOKUP',
    hint: `=VLOOKUP(E1,A1:C4,${col},FALSE)`,
    explain: tr(
      `=VLOOKUP(E1,A1:C4,${col},FALSE)。${col === 2 ? '書名は 2列目' : '値段は 3列目'}。FALSE は 完全一致。`,
      `=VLOOKUP(E1,A1:C4,${col},FALSE). The ${col === 2 ? 'title is the 2nd column' : 'price is the 3rd column'}. FALSE means an exact match.`,
    ),
  }
}

export const genFormulaXlookup: QGen = () => {
  const t = lookupTable()
  const row = pick(t)
  // 名前 → 番号（番号は 左の 列）
  return {
    type: 'formula',
    q: tr(`F1 に、E1 の 書名の「番号」を 出せ！（番号は 書名より 左の A列）`, `In F1, show the "No." for E1's title! (The number is in column A, left of the title)`),
    table: t.map((r, i) => (i === 0 ? [...r, '', row[1]] : r)),
    target: 'F1',
    expect: row[0],
    mustUse: 'XLOOKUP',
    hint: '=XLOOKUP(E1,B1:B4,A1:A4)',
    explain: tr(
      '=XLOOKUP(E1,B1:B4,A1:A4)。探す列（B）と 取り出す列（A）を 別々に 指定するので、左の 列も 取り出せる。',
      '=XLOOKUP(E1,B1:B4,A1:A4). You set the column to search (B) and the column to return (A) separately, so it can return a column to the left.',
    ),
  }
}

export const genFormulaIferror: QGen = () => {
  const t = lookupTable()
  const missing = Math.random() < 0.6
  const id = missing ? t[0][0] + 1000 : pick(t)[0]
  const hit = t.find((r) => r[0] === id)
  return {
    type: 'formula',
    q: tr(`F1 に、E1 の 番号の 書名を 出せ！ 表に なければ "なし" と 出すこと。`, `In F1, show the title for E1's number! If it's not in the table, show "None".`),
    table: t.map((r, i) => (i === 0 ? [...r, '', id] : r)),
    target: 'F1',
    expect: hit ? hit[1] : tr('なし', 'None'),
    mustUse: 'IFERROR',
    hint: tr('=IFERROR(VLOOKUP(E1,A1:C4,2,FALSE),"なし")', '=IFERROR(VLOOKUP(E1,A1:C4,2,FALSE),"None")'),
    explain: tr(
      '=IFERROR(VLOOKUP(E1,A1:C4,2,FALSE),"なし")。見つからない #N/A の ときだけ "なし" に なる。XLOOKUP の 4つ目に "なし" でも いい。',
      '=IFERROR(VLOOKUP(E1,A1:C4,2,FALSE),"None"). It becomes "None" only when the #N/A not-found error appears. Putting "None" as the 4th part of XLOOKUP works too.',
    ),
  }
}

// ---------------------------------------------------------------- 第5章：複数条件の 集計（SUMIFS・COUNTIFS）
const AREAS = tra(['北', '南'], ['North', 'South'])
const TIMES = tra(['昼', '夜'], ['Day', 'Night'])
/** 地区・時間帯（・数）の 記録。どの 組み合わせも 1回は 出る */
function patrolRows(n: number) {
  const rows: [string, string, number][] = [
    [AREAS[0], TIMES[0], 0],
    [AREAS[0], TIMES[1], 0],
    [AREAS[1], TIMES[0], 0],
    [AREAS[1], TIMES[1], 0],
  ]
  while (rows.length < n) rows.push([pick(AREAS), pick(TIMES), 0])
  return shuffled(rows).map(([a, t]) => [a, t, ri(1, 9) * 10] as [string, string, number])
}

export const genCountifsPick: QGen = () => {
  const rows = patrolRows(6)
  const a = pick(AREAS)
  const t = pick(TIMES)
  const cnt = rows.filter((r) => r[0] === a && r[1] === t).length
  const onlyA = rows.filter((r) => r[0] === a).length
  const onlyT = rows.filter((r) => r[1] === t).length
  return choice(
    tr(
      `A列（地区）と B列（時間）に「${rows.map((r) => r[0] + r[1]).join('、')}」。=COUNTIFS(A1:A6,"${a}",B1:B6,"${t}") は？`,
      `Column A (district) and column B (time) hold: ${rows.map((r) => `${r[0]}/${r[1]}`).join(', ')}. What's =COUNTIFS(A1:A6,"${a}",B1:B6,"${t}")?`,
    ),
    cnt,
    [onlyA, onlyT, cnt + 1],
    tr(
      `「${a}」で、しかも「${t}」の 行だけを 数える → ${cnt}個。片方だけ 満たす 行は 数えない。`,
      `Count only rows that are "${a}" AND "${t}" → ${cnt}. Rows that meet just one don't count.`,
    ),
  )
}

export const genSumifsOrder: QGen = () => {
  const [s, c1, c2] = pick([
    ['C', 'A', 'B'],
    ['D', 'B', 'C'],
    ['B', 'A', 'C'],
  ])
  const n = ri(6, 12)
  const r = (col: string) => `${col}2:${col}${n}`
  const [N, NT] = [AREAS[0], TIMES[1]]
  return choice(
    tr(
      `${c1}列が「北」で ${c2}列が「夜」の 行の、${s}列の 合計を 出す 正しい 式は？`,
      `Which formula correctly totals column ${s} for rows where column ${c1} is "North" and column ${c2} is "Night"?`,
    ),
    `=SUMIFS(${r(s)},${r(c1)},"${N}",${r(c2)},"${NT}")`,
    [`=SUMIFS(${r(c1)},"${N}",${r(c2)},"${NT}",${r(s)})`, `=SUMIFS("${N}",${r(c1)},"${NT}",${r(c2)},${r(s)})`, `=SUMIF(${r(c1)},"${N}",${r(s)})`],
    tr(
      'SUMIFS は「合計する範囲」が 最初。そのあと「範囲, 条件」の ペアを 並べる。SUMIF とは 順番が ちがう。',
      'In SUMIFS, "the range to total" comes first, followed by "range, condition" pairs. The order differs from SUMIF.',
    ),
  )
}

export const genIfsFunction: QGen = () => {
  const [q, a, why] = pick(
    tra<[string, string, string][]>(
      [
        ['「東店」の「パン」の 売上の 合計', 'SUMIFS', '条件が 2つの 合計は SUMIFS。'],
        ['「北地区」で「夜」の 見回りの 回数', 'COUNTIFS', '条件が 2つの 個数は COUNTIFS。'],
        ['「赤組」だけの 平均点', 'AVERAGEIF', '条件つきの 平均は AVERAGEIF。'],
        ['「白組」の 最高点', 'MAXIFS', '条件つきの 最大は MAXIFS。最小なら MINIFS。'],
        ['「金貨」の うち いちばん 軽い 重さ', 'MINIFS', '条件つきの 最小は MINIFS。'],
        ['「東地区」で 1000G 以上の 納税の 件数', 'COUNTIFS', '地区と 金額、条件が 2つの 個数は COUNTIFS。'],
      ],
      [
        ['the total Bread sales at the East shop', 'SUMIFS', 'A total with two conditions is SUMIFS.'],
        ['the number of Night patrols in the North district', 'COUNTIFS', 'A count with two conditions is COUNTIFS.'],
        ["the Red team's average score only", 'AVERAGEIF', 'An average with a condition is AVERAGEIF.'],
        ["the White team's top score", 'MAXIFS', 'A maximum with a condition is MAXIFS. For the minimum, MINIFS.'],
        ['the lightest weight among the Gold', 'MINIFS', 'A minimum with a condition is MINIFS.'],
        ['the number of tax payments of 1000G or more in the East district', 'COUNTIFS', 'District and amount: a count with two conditions is COUNTIFS.'],
      ],
    ),
  )
  return choice(
    tr(`${q}を 出したい。使う 関数は？`, `You want ${q}. Which function do you use?`),
    a,
    ['SUMIFS', 'COUNTIFS', 'AVERAGEIF', 'MAXIFS', 'MINIFS', 'SUMIF', 'COUNT'].filter((f) => f !== a).sort(() => Math.random() - 0.5),
    why,
  )
}

export const genPivotArea: QGen = () => {
  const [q, a, wrongs, why] = pick(
    tra<[string, string, string[], string][]>(
      [
        ['地区ごとの 売上合計を、地区を 縦に 並べて 作りたい。「地区」を 置く 欄は？', '行', ['列', '値', 'フィルター'], '縦に 並べる 見出しは「行」。横に 並べるなら「列」。'],
        ['ピボットテーブルで、合計や 個数を 計算する 数（売上など）を 置く 欄は？', '値', ['行', '列', 'フィルター'], '計算する 数は「値」。合計・個数・平均などを 選べる。'],
        ['「東店だけ」に しぼって 集計したい。「店」を 置く 欄は？', 'フィルター', ['行', '列', '値'], '全体を しぼりこむ 項目は「フィルター」。'],
        ['作物を 表の 横（上の 見出し）に 並べたい。「作物」を 置く 欄は？', '列', ['行', '値', 'フィルター'], '横に 並べる 見出しは「列」。'],
        ['記録の 表から「項目ごとの 合計表」を マウス操作で 作る 機能は？', 'ピボットテーブル', ['オートフィル', '条件付き書式', 'フィルター'], 'ピボットテーブルは SUMIFS の 集計表を 自動で 作ってくれる 機能。'],
      ],
      [
        ['You want sales totals by district, with districts listed down the side. Which area gets "District"?', 'Rows', ['Columns', 'Values', 'Filters'], 'Headings listed down the side go in "Rows." Across the top, "Columns."'],
        ['In a PivotTable, which area holds the numbers to total or count (like sales)?', 'Values', ['Rows', 'Columns', 'Filters'], 'Numbers to calculate go in "Values." You can choose sum, count, average and more.'],
        ['You want to total "the East shop only." Which area gets "Shop"?', 'Filters', ['Rows', 'Columns', 'Values'], 'A field that narrows down the whole table goes in "Filters."'],
        ['You want crops listed across the top of the table. Which area gets "Crop"?', 'Columns', ['Rows', 'Values', 'Filters'], 'Headings listed across the top go in "Columns."'],
        ['Which feature builds a "totals by item" table from a table of records with the mouse?', 'PivotTable', ['AutoFill', 'Conditional formatting', 'Filter'], 'A PivotTable builds the same kind of summary table as SUMIFS automatically.'],
      ],
    ),
  )
  return choice(q, a, [...wrongs], why)
}

export const genCrossRef: QGen = () => {
  const row = pick(['E', 'D', 'H'])
  const top = COLS[COLS.indexOf(row) + 1]
  const ask = pick(['left', 'top'] as const)
  return ask === 'left'
    ? choice(
        tr(
          `${top}2 の SUMIFS を 右へも 下へも コピーして 集計表を 作る。左の 見出し ${row}2 の 正しい 参照は？`,
          `You'll copy the SUMIFS in ${top}2 both right and down to build a summary table. What's the correct reference for the left heading ${row}2?`,
        ),
        `$${row}2`,
        [`$${row}$2`, `${row}$2`, `${row}2`],
        tr(
          `右へ コピーしても ${row}列を 見続けるので 列を 固定、下へは ずれて ほしいので 行は そのまま → $${row}2。`,
          `It should keep looking at column ${row} when copied right, so lock the column; it should shift when copied down, so leave the row → $${row}2.`,
        ),
      )
    : choice(
        tr(
          `${top}2 の SUMIFS を 右へも 下へも コピーして 集計表を 作る。上の 見出し ${top}1 の 正しい 参照は？`,
          `You'll copy the SUMIFS in ${top}2 both right and down to build a summary table. What's the correct reference for the top heading ${top}1?`,
        ),
        `${top}$1`,
        [`$${top}$1`, `$${top}1`, `${top}1`],
        tr(
          `下へ コピーしても 1行目を 見続けるので 行を 固定、右へは ずれて ほしいので 列は そのまま → ${top}$1。`,
          `It should keep looking at row 1 when copied down, so lock the row; it should shift when copied right, so leave the column → ${top}$1.`,
        ),
      )
}

export const genFormulaCountifs: QGen = () => {
  const rows = patrolRows(6)
  const a = pick(AREAS)
  const t = pick(TIMES)
  return {
    type: 'formula',
    q: tr(`E1 に、地区が「${a}」で 時間が「${t}」の 行の 数を 出せ！`, `In E1, show the number of rows where the district is "${a}" and the time is "${t}"!`),
    table: rows.map((r) => [r[0], r[1]]),
    target: 'E1',
    expect: rows.filter((r) => r[0] === a && r[1] === t).length,
    mustUse: 'COUNTIFS',
    hint: `=COUNTIFS(A1:A6,"${a}",B1:B6,"${t}")`,
    explain: tr(`=COUNTIFS(A1:A6,"${a}",B1:B6,"${t}")。範囲と 条件の ペアを 並べる。`, `=COUNTIFS(A1:A6,"${a}",B1:B6,"${t}"). Line up range-and-condition pairs.`),
  }
}

export const genFormulaSumifs: QGen = () => {
  const rows = patrolRows(6)
  const a = pick(AREAS)
  const t = pick(TIMES)
  return {
    type: 'formula',
    q: tr(`E1 に、地区が「${a}」で 時間が「${t}」の 行の C列（数）の 合計を 出せ！`, `In E1, show the total of column C (amount) for rows where the district is "${a}" and the time is "${t}"!`),
    table: rows,
    target: 'E1',
    expect: rows.filter((r) => r[0] === a && r[1] === t).reduce((x, r) => x + r[2], 0),
    mustUse: 'SUMIFS',
    hint: `=SUMIFS(C1:C6,A1:A6,"${a}",B1:B6,"${t}")`,
    explain: tr(`=SUMIFS(C1:C6,A1:A6,"${a}",B1:B6,"${t}")。合計する 範囲（C列）が 最初。`, `=SUMIFS(C1:C6,A1:A6,"${a}",B1:B6,"${t}"). The range to total (column C) comes first.`),
  }
}

export const genFormulaAvgif: QGen = () => {
  const n = 6
  const [RED, WHITE] = tra(['赤', '白'], ['Red', 'White'])
  const groups = shuffled([RED, RED, RED, WHITE, WHITE, WHITE])
  const vals = groups.map(() => ri(5, 10) * 10)
  const g = pick([RED, WHITE])
  const fn = pick(['AVERAGEIF', 'MAXIFS', 'MINIFS'] as const)
  const mine = vals.filter((_, i) => groups[i] === g)
  const expect = fn === 'AVERAGEIF' ? mine.reduce((a, b) => a + b, 0) / mine.length : fn === 'MAXIFS' ? Math.max(...mine) : Math.min(...mine)
  const hint = fn === 'AVERAGEIF' ? `=AVERAGEIF(A1:A${n},"${g}",B1:B${n})` : `=${fn}(B1:B${n},A1:A${n},"${g}")`
  return {
    type: 'formula',
    q: tr(
      `D1 に、A列が「${g}」の 行の B列の ${fn === 'AVERAGEIF' ? '平均' : fn === 'MAXIFS' ? '最大' : '最小'}を 出せ！`,
      `In D1, show the ${fn === 'AVERAGEIF' ? 'average' : fn === 'MAXIFS' ? 'maximum' : 'minimum'} of column B for rows where column A is "${g}"!`,
    ),
    table: groups.map((x, i) => [x, vals[i]]),
    target: 'D1',
    expect,
    mustUse: fn,
    hint,
    explain: tr(
      `${hint}。${fn === 'AVERAGEIF' ? 'AVERAGEIF は SUMIF と 同じ 並び（条件の範囲が 先）。' : `${fn} は SUMIFS と 同じ 並び（答えを 探す 範囲が 先）。`}`,
      `${hint}. ${fn === 'AVERAGEIF' ? 'AVERAGEIF uses the same order as SUMIF (range to check first).' : `${fn} uses the same order as SUMIFS (the range to search for the answer first).`}`,
    ),
  }
}

// ---------------------------------------------------------------- 第6章：文字列（& ・LEFT・RIGHT・MID・LEN・FIND）
/** 意味の ない 言葉に 使う 文字（英語版は 英字） */
const KANA = tr('アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ', 'abcdefghijklmnopqrstuvwxyz')
const word = (n: number) => Array.from({ length: n }, () => KANA[ri(0, KANA.length - 1)]).join('')
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
const code = () => `${LETTERS[ri(0, LETTERS.length - 1)]}${LETTERS[ri(0, LETTERS.length - 1)]}-${ri(1000, 9999)}`
/** A1 に 入る 名前・B1 に 入る 名前（日本語は 名字→名前、英語は 名前→名字 の 順） */
const FIRST = tra(['山田', '佐藤', '鈴木', '田中', '高橋', '伊藤'], ['John', 'Mary', 'Ken', 'Amy', 'Tom', 'Lucy'])
const GIVEN = tra(['太郎', '花子', '一郎', '美咲', '健太', '結衣'], ['Smith', 'Brown', 'Lee', 'Clark', 'Hall', 'Young'])
const USERS = ['taro', 'hana', 'ken', 'yui', 'moji', 'kaki', 'yomi']
const HOSTS = ['moji.jp', 'text.co', 'kaki.ne', 'yomi.or']

export const genLeftRightPick: QGen = () => {
  const c = code()
  const v = pick(['left', 'right', 'mid'] as const)
  if (v === 'left')
    return choice(
      tr(`A1 に「${c}」。=LEFT(A1,2) の 結果は？`, `A1 has "${c}". What's the result of =LEFT(A1,2)?`),
      c.slice(0, 2),
      [c.slice(-2), c.slice(0, 3), c.slice(3, 5)],
      tr('LEFT は 左から 数えて 指定した 文字数を 取り出す。', 'LEFT takes the given number of characters counting from the left.'),
    )
  if (v === 'right')
    return choice(
      tr(`A1 に「${c}」。=RIGHT(A1,4) の 結果は？`, `A1 has "${c}". What's the result of =RIGHT(A1,4)?`),
      c.slice(-4),
      [c.slice(0, 4), c.slice(-3), c.slice(2, 6)],
      tr('RIGHT は 右から 数えて 指定した 文字数を 取り出す。', 'RIGHT takes the given number of characters counting from the right.'),
    )
  return choice(
    tr(`A1 に「${c}」。=MID(A1,4,2) の 結果は？`, `A1 has "${c}". What's the result of =MID(A1,4,2)?`),
    c.slice(3, 5),
    [c.slice(4, 6), c.slice(2, 4), c.slice(0, 2)],
    tr('MID(文字列, 何文字目から, 何文字)。「-」が 3文字目なので、4文字目から 2文字。', 'MID(text, start position, count). The "-" is the 3rd character, so take 2 starting at the 4th.'),
  )
}

export const genMidPick: QGen = () => {
  const w = word(7)
  const s = ri(2, 4)
  const n = ri(2, 3)
  return choice(
    tr(`=MID("${w}",${s},${n}) の 結果は？`, `What's the result of =MID("${w}",${s},${n})?`),
    w.slice(s - 1, s - 1 + n),
    [w.slice(s, s + n), w.slice(s - 2, s - 2 + n), w.slice(0, n)],
    tr(`${s}文字目の「${w[s - 1]}」から ${n}文字 → ${w.slice(s - 1, s - 1 + n)}。`, `${n} characters starting from character ${s}, "${w[s - 1]}" → ${w.slice(s - 1, s - 1 + n)}.`),
  )
}

export const genJoinPick: QGen = () => {
  const a = pick(FIRST)
  const b = pick(GIVEN)
  const v = pick(['plain', 'space', 'plus'] as const)
  const ab = tr(`A1 に「${a}」、B1 に「${b}」。`, `A1 has "${a}" and B1 has "${b}". `)
  if (v === 'plain')
    return choice(
      tr(`${ab}=A1&B1 の 結果は？`, `${ab}What's the result of =A1&B1?`),
      a + b,
      [`${a} ${b}`, `${b}${a}`, '#VALUE!'],
      tr('「&」は 文字を そのまま つなぐ。空白が ほしいときは =A1&" "&B1。', '"&" joins text exactly as is. When you want a space, use =A1&" "&B1.'),
    )
  if (v === 'space')
    return choice(
      tr(`${ab}=A1&" "&B1 の 結果は？`, `${ab}What's the result of =A1&" "&B1?`),
      `${a} ${b}`,
      [a + b, `${a}" "${b}`, `${b} ${a}`],
      tr('" " は 空白 1文字。名字・空白・名前 の 順に つながる。', '" " is one space. It joins A1, a space, then B1, in that order.'),
    )
  return choice(
    tr(`${ab}=A1+B1 の 結果は？`, `${ab}What's the result of =A1+B1?`),
    '#VALUE!',
    [a + b, `${a} ${b}`, '0'],
    tr('+ は 数の 足し算。文字を つなぐなら「&」を 使う。', '+ adds numbers. To join text, use "&".'),
  )
}

export const genLenPick: QGen = () => {
  const n = ri(3, 6)
  const w = word(n)
  const sp = Math.random() < 0.5
  const s = sp ? `${w.slice(0, 2)} ${w.slice(2)}` : w
  return choice(
    tr(`=LEN("${s}") の 結果は？`, `What's the result of =LEN("${s}")?`),
    s.length,
    [s.length - 1, s.length + 1, sp ? n : n + 2],
    tr(`LEN は 文字数を 数える。${sp ? '空白も 1文字と 数える。' : ''}`, `LEN counts characters.${sp ? ' Spaces count as 1 character too.' : ''}`),
  )
}

export const genTextFunction: QGen = () => {
  const [q, a, why] = pick(
    tra<[string, string, string][]>(
      [
        ['商品コードの 左から 2文字を 取り出す', 'LEFT', '左から 取り出すのは LEFT。'],
        ['電話番号の 末尾 4けたを 取り出す', 'RIGHT', '右から 取り出すのは RIGHT。'],
        ['文字列の まん中（5文字目から 3文字）を 取り出す', 'MID', 'まん中は MID(文字列, 開始位置, 文字数)。'],
        ['看板の 文字数を 数える', 'LEN', '文字数は LEN。'],
        ['名前の 前後の よけいな 空白を 消す', 'TRIM', '空白の 掃除は TRIM。'],
        ['「株式会社」を「(株)」に 置きかえる', 'SUBSTITUTE', '文字の 置きかえは SUBSTITUTE。'],
        ['メールアドレスの「@」が 何文字目かを 調べる', 'FIND', '文字の 位置を 調べるのは FIND。'],
      ],
      [
        ['Pull out the left 2 characters of a product code', 'LEFT', 'Taking from the left is LEFT.'],
        ['Pull out the last 4 digits of a phone number', 'RIGHT', 'Taking from the right is RIGHT.'],
        ['Pull out the middle of some text (3 characters from the 5th)', 'MID', 'The middle is MID(text, start position, count).'],
        ['Count the letters on a sign', 'LEN', 'The number of characters is LEN.'],
        ['Remove the extra spaces around a name', 'TRIM', 'Cleaning up spaces is TRIM.'],
        ['Replace "Corporation" with "Corp."', 'SUBSTITUTE', 'Replacing text is SUBSTITUTE.'],
        ['Find which character the "@" is in an email address', 'FIND', 'Finding the position of text is FIND.'],
      ],
    ),
  )
  return choice(
    tr(`${q}。使う 関数は？`, `${q}. Which function do you use?`),
    a,
    ['LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'SUBSTITUTE', 'FIND'].filter((f) => f !== a).sort(() => Math.random() - 0.5),
    why,
  )
}

export const genFormulaJoin: QGen = () => {
  const a = pick(FIRST)
  const b = pick(GIVEN)
  return {
    type: 'formula',
    q: tr(`C1 に「${a} ${b}」のように、A1 と B1 を 空白で つないで 出せ！`, `In C1, join A1 and B1 with a space, like "${a} ${b}"!`),
    table: [[a, b]],
    target: 'C1',
    expect: `${a} ${b}`,
    mustUse: '&',
    hint: '=A1&" "&B1',
    explain: tr('=A1&" "&B1。空白も " " で 囲んで & で つなぐ。', '=A1&" "&B1. Wrap the space in " " too, and join with &.'),
  }
}

export const genFormulaLeftRight: QGen = () => {
  const c = code()
  const left = Math.random() < 0.5
  return {
    type: 'formula',
    q: left
      ? tr('B1 に、A1 の コードの 左から 2文字を 取り出せ！', "In B1, pull out the left 2 characters of A1's code!")
      : tr('B1 に、A1 の コードの 右から 4文字を 取り出せ！', "In B1, pull out the right 4 characters of A1's code!"),
    table: [[c]],
    target: 'B1',
    expect: left ? c.slice(0, 2) : c.slice(-4),
    mustUse: left ? 'LEFT' : 'RIGHT',
    hint: left ? '=LEFT(A1,2)' : '=RIGHT(A1,4)',
    explain: left ? tr('=LEFT(A1,2)。左から 2文字。', '=LEFT(A1,2). 2 characters from the left.') : tr('=RIGHT(A1,4)。右から 4文字。', '=RIGHT(A1,4). 4 characters from the right.'),
  }
}

export const genFormulaMid: QGen = () => {
  const w = word(7)
  const s = ri(2, 4)
  const n = ri(2, 3)
  return {
    type: 'formula',
    q: tr(`B1 に、A1 の ${s}文字目から ${n}文字を 取り出せ！`, `In B1, pull out ${n} characters of A1 starting at character ${s}!`),
    table: [[w]],
    target: 'B1',
    expect: w.slice(s - 1, s - 1 + n),
    mustUse: 'MID',
    hint: `=MID(A1,${s},${n})`,
    explain: tr(`=MID(A1,${s},${n})。何文字目から・何文字 の 順。`, `=MID(A1,${s},${n}). Start position first, then count.`),
  }
}

export const genFormulaFind: QGen = () => {
  const u = pick(USERS)
  const h = pick(HOSTS)
  return {
    type: 'formula',
    q: tr('B1 に、A1 の アドレスの「@」より 前を 取り出せ！', 'In B1, pull out the part of the address in A1 before the "@"!'),
    table: [[`${u}@${h}`]],
    target: 'B1',
    expect: u,
    mustUse: 'FIND',
    hint: '=LEFT(A1,FIND("@",A1)-1)',
    explain: tr('=LEFT(A1,FIND("@",A1)-1)。FIND で @ の 位置を 調べ、その 1つ手前まで LEFT で 取り出す。', '=LEFT(A1,FIND("@",A1)-1). FIND locates the @, and LEFT takes everything up to one before it.'),
  }
}

// ---------------------------------------------------------------- 第7章：日付（足し算・引き算・WEEKDAY・EDATE・DATEDIF）
const ymd = (y: number, m: number, d: number) => `${y}/${m}/${d}`
const WEEK = tra(['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'], ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])

export const genDateAddPick: QGen = () => {
  // 月の 中で おさまる 足し算（暗算の 負担は 小さく）
  const m = ri(1, 12)
  const d = ri(1, 15)
  const n = ri(3, 12)
  const ans = ymd(2026, m, d + n)
  return choice(
    tr(`A1 に「${ymd(2026, m, d)}」。=A1+${n} の 結果は？`, `A1 has "${ymd(2026, m, d)}". What's the result of =A1+${n}?`),
    ans,
    [ymd(2026, m + 1 > 12 ? 1 : m + 1, d), ymd(2026, m, d + n - 1), `${ymd(2026, m, d)}${n}`],
    tr(`日付は「1日 ＝ 1」の 数。${n} を 足すと ${n}日後。`, `A date is a number where 1 day = 1. Add ${n}, and you get ${n} days later.`),
  )
}

export const genDateDiffPick: QGen = () => {
  const m = ri(1, 12)
  const a = ri(1, 10)
  const b = a + ri(3, 15)
  return choice(
    tr(`A1 に「${ymd(2026, m, a)}」、B1 に「${ymd(2026, m, b)}」。=B1-A1 の 結果は？`, `A1 has "${ymd(2026, m, a)}" and B1 has "${ymd(2026, m, b)}". What's the result of =B1-A1?`),
    b - a,
    [b - a + 1, b, '#VALUE!'],
    tr('日付どうしの 引き算は 間の 日数。', 'Subtracting one date from another gives the days between.'),
  )
}

export const genWeekdayPick: QGen = () => {
  const k = ri(0, 6)
  return pick([
    () =>
      choice(
        tr(`=WEEKDAY(日付, 2) で ${WEEK[k]}は いくつ？`, `With =WEEKDAY(date, 2), what number is ${WEEK[k]}?`),
        k + 1,
        [((k + 1) % 7) + 1, k, k + 2 > 7 ? 1 : k + 2],
        tr('2つ目を 2 に すると 月曜 1 〜 日曜 7。', 'With 2 as the second part, Monday is 1 through Sunday 7.'),
      ),
    () =>
      choice(
        tr(`=WEEKDAY(A1,2) が ${k + 1} なら、A1 は 何曜日？`, `If =WEEKDAY(A1,2) is ${k + 1}, what day of the week is A1?`),
        WEEK[k],
        [WEEK[(k + 1) % 7], WEEK[(k + 6) % 7], WEEK[(k + 3) % 7]],
        tr('月曜 1・火曜 2 … 日曜 7。', 'Monday 1, Tuesday 2... Sunday 7.'),
      ),
    () =>
      choice(
        tr('土日を まとめて「休み」と 判定する 条件は？（WEEKDAY(A1,2) を 使う）', 'Which condition judges both Saturday and Sunday as "Closed"? (using WEEKDAY(A1,2))'),
        'WEEKDAY(A1,2)>=6',
        ['WEEKDAY(A1,2)>=5', 'WEEKDAY(A1,2)=7', 'WEEKDAY(A1,2)<=2'],
        tr('土曜 6・日曜 7 なので「6以上」。', 'Saturday is 6 and Sunday is 7, so "6 or more."'),
      ),
  ])()
}

export const genDateFunction: QGen = () => {
  const [q, a, why] = pick(
    tra<[string, string, string][]>(
      [
        ['日付から「月」だけを 数で 取り出す', 'MONTH', '年は YEAR、月は MONTH、日は DAY。'],
        ['日付から「年」だけを 数で 取り出す', 'YEAR', '年は YEAR。'],
        ['日付の 曜日を 数で 調べる', 'WEEKDAY', 'WEEKDAY(日付, 2) で 月曜 1 〜 日曜 7。'],
        ['契約開始日の 3か月後の 日付を 出す', 'EDATE', '○か月後は EDATE(日付, 月数)。'],
        ['その月の 末日（月末）を 出す', 'EOMONTH', '月末は EOMONTH(日付, 0)。'],
        ['入社日から 今日までの 満年数を 出す', 'DATEDIF', '満年数は DATEDIF(開始日, 終了日, "Y")。'],
      ],
      [
        ['Pull out just the "month" of a date as a number', 'MONTH', 'Year is YEAR, month is MONTH, and day is DAY.'],
        ['Pull out just the "year" of a date as a number', 'YEAR', 'The year is YEAR.'],
        ['Check the day of the week of a date as a number', 'WEEKDAY', 'WEEKDAY(date, 2) gives Monday 1 through Sunday 7.'],
        ['Get the date 3 months after a contract starts', 'EDATE', 'So many months later is EDATE(date, months).'],
        ['Get the last day of that month (month end)', 'EOMONTH', 'The month end is EOMONTH(date, 0).'],
        ['Get the full years from the hire date to today', 'DATEDIF', 'Full years is DATEDIF(start date, end date, "Y").'],
      ],
    ),
  )
  return choice(
    tr(`${q}。使う 関数は？`, `${q}. Which function do you use?`),
    a,
    ['YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'EDATE', 'EOMONTH', 'DATEDIF'].filter((f) => f !== a).sort(() => Math.random() - 0.5),
    why,
  )
}

export const genFormulaDateAdd: QGen = () => {
  const m = ri(1, 12)
  const d = ri(1, 15)
  const n = ri(3, 12)
  return {
    type: 'formula',
    q: tr('C1 に、A1 の 日付の B1 日後を 出せ！', "In C1, show the date B1 days after A1's date!"),
    table: [[ymd(2026, m, d), n]],
    target: 'C1',
    expect: ymd(2026, m, d + n),
    mustUse: '+',
    hint: '=A1+B1',
    explain: tr('=A1+B1。日付は 数と 同じように 足せる。', '=A1+B1. You can add to dates just like numbers.'),
  }
}

export const genFormulaDateDiff: QGen = () => {
  const m = ri(1, 11)
  const a = ri(1, 20)
  const b = ri(1, 20)
  const end = ymd(2026, m + 1, b)
  const start = ymd(2026, m, a)
  const days = Math.round((Date.UTC(2026, m, b) - Date.UTC(2026, m - 1, a)) / 86400000)
  return {
    type: 'formula',
    q: tr('C1 に、A1（今日）から B1（締め切り）まで あと何日かを 出せ！', 'In C1, show how many days are left from A1 (today) until B1 (the deadline)!'),
    table: [[start, end]],
    target: 'C1',
    expect: days,
    mustUse: '-',
    hint: '=B1-A1',
    explain: tr('=B1-A1。締め切り − 今日 で 残りの 日数。', '=B1-A1. Deadline − today gives the days left.'),
  }
}

export const genFormulaDatePart: QGen = () => {
  const y = ri(1980, 2010)
  const m = ri(1, 12)
  const d = ri(1, 28)
  const [fn, ans, label] = pick([
    ['YEAR', y, tr('年', 'year')],
    ['MONTH', m, tr('月', 'month')],
    ['DAY', d, tr('日', 'day')],
  ] as const)
  return {
    type: 'formula',
    q: tr(`B1 に、A1 の 日付の「${label}」を 数で 取り出せ！`, `In B1, pull out the "${label}" of A1's date as a number!`),
    table: [[ymd(y, m, d)]],
    target: 'B1',
    expect: ans,
    mustUse: fn,
    hint: `=${fn}(A1)`,
    explain: `=${fn}(A1)${tr('。', '.')}`,
  }
}

export const genFormulaEdate: QGen = () => {
  const m = ri(1, 9)
  const d = ri(1, 28)
  const n = ri(1, 3)
  return {
    type: 'formula',
    q: tr('C1 に、A1 の 日付の B1 か月後の 日付を 出せ！', "In C1, show the date B1 months after A1's date!"),
    table: [[ymd(2026, m, d), n]],
    target: 'C1',
    expect: ymd(2026, m + n, d),
    mustUse: 'EDATE',
    hint: '=EDATE(A1,B1)',
    explain: tr('=EDATE(A1,B1)。何日 足すかではなく、何か月 足すか。', '=EDATE(A1,B1). Not how many days to add, but how many months.'),
  }
}

// ---------------------------------------------------------------- 最終章：エラーの 読み方・直し方
const ERRORS: [string, string][] = tra<[string, string][]>(
  [
    ['#DIV/0!', '0（空の セル）で 割った'],
    ['#VALUE!', '文字など 計算できない 値が まざった'],
    ['#NAME?', '関数名の まちがい・" の 付け忘れ'],
    ['#REF!', '参照先の セルが 消えた'],
    ['#N/A', '探した 値が 見つからない'],
  ],
  [
    ['#DIV/0!', 'Divided by 0 (an empty cell)'],
    ['#VALUE!', "A value that can't be calculated, like text, got mixed in"],
    ['#NAME?', 'A misspelled function name or a missing "'],
    ['#REF!', 'A referenced cell was deleted'],
    ['#N/A', 'The value searched for was not found'],
  ],
)

export const genErrorMeaning: QGen = () => {
  const [e, m] = pick(ERRORS)
  return pick([
    () =>
      choice(
        tr(`エラー「${e}」の 意味は？`, `What does the error "${e}" mean?`),
        m,
        ERRORS.filter(([x]) => x !== e)
          .map(([, y]) => y)
          .sort(() => Math.random() - 0.5),
        tr(`${e} は「${m}」。エラーは 直し方の ヒント。`, `${e}: "${m}." An error is a hint for how to fix it.`),
      ),
    () =>
      choice(
        tr(`「${m}」ときに 出る エラーは？`, `Which error appears when: "${m}"?`),
        e,
        ERRORS.filter(([x]) => x !== e)
          .map(([x]) => x)
          .sort(() => Math.random() - 0.5),
        tr(`${m} → ${e}。`, `${m} → ${e}.`),
      ),
  ])()
}

export const genErrorCause: QGen = () => {
  const [q, a, why] = pick(
    tra<[string, string, string][]>(
      [
        ['A1 に 10、B1 に 0。=A1/B1 の 結果は？', '#DIV/0!', '0 で 割ったので #DIV/0!。IFERROR(A1/B1,0) で 防げる。'],
        ['A1 に 10、B1 に「休み」。=A1+B1 の 結果は？', '#VALUE!', '文字は + で 足せない。=SUM(A1:B1) なら 文字を 飛ばして 10。'],
        ['=SUMM(A1:A5) の 結果は？', '#NAME?', 'SUMM という 関数は ない。つづりを SUM に 直す。'],
        ['=IF(A1>=60,OK,NG) の 結果は？（A1 は 70）', '#NAME?', '文字の OK・NG に " が ない。"OK" と 書く。'],
        ['表に ない 番号を =VLOOKUP(番号,A1:B5,2,FALSE) で 探すと？', '#N/A', '見つからないと #N/A。IFERROR か XLOOKUP の 4つ目で 防げる。'],
        ['=A1*C1 の C列を まるごと 削除すると？', '#REF!', '参照先が 消えたので #REF!。新しい セルへ 付けかえる。'],
      ],
      [
        ["A1 has 10 and B1 has 0. What's the result of =A1/B1?", '#DIV/0!', 'You divided by 0, so #DIV/0!. IFERROR(A1/B1,0) prevents it.'],
        ['A1 has 10 and B1 has "Closed". What\'s the result of =A1+B1?', '#VALUE!', "Text can't be added with +. =SUM(A1:B1) skips the text and gives 10."],
        ["What's the result of =SUMM(A1:A5)?", '#NAME?', "There's no function called SUMM. Fix the spelling to SUM."],
        ["What's the result of =IF(A1>=60,OK,NG)? (A1 is 70)", '#NAME?', 'The text OK and NG has no ". Write "OK".'],
        ["What happens if you search for a number that's not in the table with =VLOOKUP(number,A1:B5,2,FALSE)?", '#N/A', 'Not found gives #N/A. IFERROR or the 4th part of XLOOKUP prevents it.'],
        ['What happens if you delete all of column C used in =A1*C1?', '#REF!', 'The reference is gone, so #REF!. Reconnect it to a new cell.'],
      ],
    ),
  )
  return choice(q, a, ERRORS.map(([x]) => x).filter((x) => x !== a).sort(() => Math.random() - 0.5), why)
}

export const genFormulaSafeDivide: QGen = () => {
  const zero = Math.random() < 0.5
  const b = zero ? 0 : pick([2, 4, 5])
  const a = (zero ? ri(2, 9) : ri(2, 9) * b) as number
  return {
    type: 'formula',
    q: tr('C1 に A1 ÷ B1 を 出せ！ 割れない（0 で 割る）ときは 0 に すること。', "In C1, show A1 ÷ B1! When it can't be divided (dividing by 0), show 0."),
    table: [[a, b]],
    target: 'C1',
    expect: zero ? 0 : a / b,
    mustUse: 'IFERROR',
    hint: '=IFERROR(A1/B1,0)',
    explain: tr('=IFERROR(A1/B1,0)。エラーの ときだけ 0 に なる。', "=IFERROR(A1/B1,0). It's 0 only when there's an error."),
  }
}

export const genFormulaFixSum: QGen = () => {
  const vals: (number | string)[] = [ri(2, 9), tr('休み', 'Closed'), ri(2, 9), ri(2, 9)]
  return {
    type: 'formula',
    q: tr('A5 に、A1〜A4 の 数の 合計を 出せ！（「休み」が まざっている）', 'In A5, show the total of the numbers in A1 to A4! ("Closed" is mixed in)'),
    table: vals.map((v) => [v]),
    target: 'A5',
    expect: vals.reduce<number>((x, v) => x + (typeof v === 'number' ? v : 0), 0),
    mustUse: 'SUM',
    hint: '=SUM(A1:A4)',
    explain: tr('=SUM(A1:A4)。+ で 足すと #VALUE! に なるが、SUM は 文字を 飛ばして くれる。', '=SUM(A1:A4). Adding with + gives #VALUE!, but SUM skips the text.'),
  }
}
