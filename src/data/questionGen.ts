import type { Question } from './bosses'

/**
 * 戦闘用の「自動生成問題」。呼ぶたびに数値やセル番地が変わるので、
 * 答えを丸暗記しても通用しない。
 */
export type QGen = () => Question

const ri = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1))
const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]
const COLS = 'ABCDEFGH'
const DAYS = ['月', '火', '水', '木', '金', '土', '日']
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
    const cand = Number.isFinite(n) ? String(n + (k % 2 ? k : -k) * 2) : `${a}${'？'.repeat(k)}`
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
  return choice(`「${c}${r}」は どこの セル？`, `${c}列の${r}行目`, [`${r}列目の${c}行目`, `${c}行の${r}列目`, `${COLS[ci + 1]}列の${r - 1}行目`], 'アルファベットが 列（縦）、数字が 行（横）。')
}

export const genNeighbor: QGen = () => {
  const ci = ri(1, 6)
  const r = ri(2, 20)
  const dirs = { 右: [0, 1], 左: [0, -1], 上: [-1, 0], 下: [1, 0] } as const
  const name = pick(Object.keys(dirs) as (keyof typeof dirs)[])
  const at = ([dr, dc]: readonly [number, number]) => `${COLS[ci + dc]}${r + dr}`
  const others = (Object.keys(dirs) as (keyof typeof dirs)[]).filter((k) => k !== name).map((k) => at(dirs[k]))
  return choice(`「${COLS[ci]}${r}」の ${name}どなりの セルは？`, at(dirs[name]), others, '左右に動くと 列（アルファベット）が、上下に動くと 行（数字）が 変わる。')
}

export const genRangeCount: QGen = () => {
  const c1 = ri(0, 3)
  const c2 = c1 + ri(0, 3)
  const r1 = ri(1, 6)
  const r2 = r1 + ri(1, 6)
  const w = c2 - c1 + 1
  const h = r2 - r1 + 1
  return choice(
    `「${COLS[c1]}${r1}:${COLS[c2]}${r2}」の範囲に セルは いくつある？`,
    w * h,
    [w + h, w * h + w, w * h - h, (w + 1) * h],
    `${w}列 × ${h}行 = ${w * h}個。「:」は 左上から 右下までの 四角い範囲。`,
  )
}

export const genSumCellCount: QGen = () => {
  const c = pick([...COLS.slice(0, 5)])
  const r1 = ri(1, 8)
  const r2 = r1 + ri(2, 12)
  const n = r2 - r1 + 1
  return choice(`=SUM(${c}${r1}:${c}${r2}) で 合計される セルの数は？`, n, [r2 - r1, r2, n + 1], `${c}${r1} から ${c}${r2} まで、${r2} − ${r1} + 1 = ${n}個。`)
}

// ---------------------------------------------------------------- オートフィル
export const genSeriesFill: QGen = () => {
  const s = ri(1, 15)
  const d = ri(1, 6)
  const n = ri(4, 9)
  const v = s + (n - 1) * d
  return choice(
    `A1に「${s}」、A2に「${s + d}」を入れ、2つ選んで 下へオートフィル。A${n} は？`,
    v,
    [v + d, v - d, s * n, s],
    `2つ選ぶと 差（${d}）ずつ 増える連番。${s} → ${s + d} → … → A${n} は ${v}。`,
  )
}

export const genCopyFill: QGen = () => {
  const s = ri(2, 40)
  const n = ri(3, 8)
  return choice(
    `A1に「${s}」だけ入れ、1つだけ選んで 下へオートフィル。A${n} は？`,
    s,
    [s + n - 1, s + 1, s * n],
    '数字1つだけだと「コピー」になる。連番にするなら 2つ選んでから ドラッグ。',
  )
}

export const genMonthFill: QGen = () => {
  const m = ri(1, 12)
  const k = ri(1, 6)
  const at = (x: number) => `${((x - 1) % 12) + 1}月`
  return choice(`「${m}月」を 1つ選び、下へ オートフィル。${k}つ下の セルは？`, at(m + k), [`${m + k}月`, at(m + k + 1), at(m + k - 1), `${m}月`], '「月」は 1月〜12月を くり返す。12月の 次は 1月。')
}

export const genDayFill: QGen = () => {
  const i = ri(0, 6)
  const k = ri(1, 6)
  return choice(`「${DAYS[i]}」から 右へ オートフィル。${k}つ右の セルは？`, DAYS[(i + k) % 7], [DAYS[(i + k + 1) % 7], DAYS[(i + k + 6) % 7], DAYS[i]], '曜日は 月〜日を くり返す。')
}

export const genRelativeRef: QGen = () => {
  const r = ri(2, 6)
  const k = ri(1, 5)
  const t = r + k
  return choice(
    `D${r} の =B${r}*C${r} を 下へ ${k}つ オートフィル。D${t} の 数式は？`,
    `=B${t}*C${t}`,
    [`=B${r}*C${r}`, `=B${t}*C${r}`, `=C${t}*D${t}`],
    `数式を 下へ コピーすると、行番号も いっしょに ずれる（相対参照）。`,
  )
}

// ---------------------------------------------------------------- 計算
export const genPrecedence: QGen = () => {
  const a = ri(2, 20)
  const b = ri(2, 9)
  const c = ri(2, 9)
  const v = pick(['plus', 'minus', 'paren'] as const)
  if (v === 'plus')
    return choice(`=${a}+${b}*${c} の 結果は？`, a + b * c, [(a + b) * c, a * b + c, a + b + c], `掛け算が 先。${b}×${c}=${b * c}、${a}+${b * c}=${a + b * c}。`)
  if (v === 'minus') {
    const big = b * c + ri(5, 40)
    return choice(`=${big}-${b}*${c} の 結果は？`, big - b * c, [(big - b) * c, big - b - c, big * b - c], `掛け算が 先。${b}×${c}=${b * c}、${big}−${b * c}=${big - b * c}。`)
  }
  return choice(`=(${a}+${b})*${c} の 結果は？`, (a + b) * c, [a + b * c, a * b * c, a + b + c], `カッコの中が 最優先。${a}+${b}=${a + b}、×${c}=${(a + b) * c}。`)
}

export const genDivision: QGen = () => {
  const a = ri(2, 15)
  const b = ri(2, 9)
  const c = ri(1, 20)
  return choice(`=${a * b}/${b}+${c} の 結果は？`, a + c, [(a * b) / (b + c), a * b + c, a - c, a + c + b].map((x) => Math.round(x * 10) / 10), `割り算が 先。${a * b}÷${b}=${a}、${a}+${c}=${a + c}。`)
}

export const genSumValues: QGen = () => {
  const n = ri(3, 5)
  const vals = nums(n, 60)
  const c = pick([...COLS.slice(0, 4)])
  const s = sum(vals)
  return choice(
    `${c}1〜${c}${n} に ${vals.join('、')} が 入っている。=SUM(${c}1:${c}${n}) は？`,
    s,
    [s - vals[n - 1], s + vals[0], Math.max(...vals), s + 10],
    `${vals.join(' + ')} = ${s}。`,
  )
}

export const genAverageValues: QGen = () => {
  const n = ri(3, 5)
  const { vals, avg } = avgNums(n)
  const s = sum(vals)
  return choice(`=AVERAGE(${vals.join(',')}) の 結果は？`, avg, [s, avg + ri(1, 6), Math.max(...vals), Math.min(...vals)], `合計 ${s} ÷ ${n}個 = ${avg}。`)
}

// ---------------------------------------------------------------- 関数
export const genMaxMin: QGen = () => {
  const vals = nums(ri(4, 6), 99)
  const f = pick(['MAX', 'MIN'] as const)
  const sorted = [...vals].sort((a, b) => a - b)
  const ans = f === 'MAX' ? sorted[sorted.length - 1] : sorted[0]
  const other = f === 'MAX' ? sorted[0] : sorted[sorted.length - 1]
  const second = f === 'MAX' ? sorted[sorted.length - 2] : sorted[1]
  return choice(`=${f}(${vals.join(',')}) の 結果は？`, ans, [other, second, sum(vals)], `${f === 'MAX' ? 'MAX は 最大値' : 'MIN は 最小値'}。この中では ${ans}。`)
}

const TEXTS = ['休み', '欠席', 'なし', '未定']
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
const showItems = (items: (number | string)[]) => items.map((v) => (v === '' ? '（空白）' : v)).join('、')

export const genCount: QGen = () => {
  const items = mixed()
  const n = items.length
  const cnt = items.filter((x) => typeof x === 'number').length
  const nonEmpty = items.filter((x) => x !== '').length
  return choice(`A1〜A${n} に「${showItems(items)}」。=COUNT(A1:A${n}) は？`, cnt, [nonEmpty, n, cnt + 1], `COUNT は 数値の セルだけを 数える。文字と 空白は 数えない → ${cnt}個。`)
}

export const genCountA: QGen = () => {
  const items = mixed()
  const n = items.length
  const cnt = items.filter((x) => typeof x === 'number').length
  const nonEmpty = items.filter((x) => x !== '').length
  return choice(`A1〜A${n} に「${showItems(items)}」。=COUNTA(A1:A${n}) は？`, nonEmpty, [cnt, n, nonEmpty - 1], `COUNTA は 空白以外の セルを すべて 数える（文字も数える）→ ${nonEmpty}個。`)
}

// ---------------------------------------------------------------- 数式を入力する問題
export const genFormulaSum: QGen = () => {
  const n = ri(4, 6)
  const vals = nums(n, 50)
  return {
    type: 'formula',
    q: `A${n + 1} に A1〜A${n} の 合計を出す 数式を入力せよ！`,
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
    q: `B${n + 1} に B1〜B${n} の 平均を出す 数式を入力せよ！`,
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
    q: `A${n + 1} に A1〜A${n} の ${f === 'MAX' ? '最大値' : '最小値'}を出せ！`,
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
    q: 'C2 に 小計（単価×数量）を出す 数式を入力せよ！',
    table: [
      ['単価', '数量', '小計'],
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
    q: `A${n + 1} に A1〜A${n} の「数値のセルの個数」を出せ！`,
    table: items.map((v) => [v]),
    target: `A${n + 1}`,
    expect: cnt,
    mustUse: 'COUNT',
    hint: `=COUNT(A1:A${n})`,
    explain: `=COUNT(A1:A${n}) → ${cnt}（文字と空白は 数えない）`,
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
    `C${r} の =B${r}*$${fc}$${fr} を 下へ ${k}つ コピー。C${t} の 数式は？`,
    `=B${t}*$${fc}$${fr}`,
    [`=B${t}*$${fc}$${fr + k}`, `=B${r}*$${fc}$${fr}`, `=B${t}*${fc}${fr + k}`],
    '$ が付いた 列・行は コピーしても 動かない。付いていない B は 行が ずれる。',
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
    `=${src}*2 を ${dir}へ ${k}つ コピーすると、参照は どうなる？`,
    `=${ans}*2`,
    [`=${src}*2`, dir === '下' ? `=${COLS[ci + k]}${r}*2` : `=${COLS[ci]}${r + k}*2`, `=${COLS[ci + 1]}${r + 1}*2`],
    '相対参照は コピーした方向へ、同じだけ ずれる。',
  )
}

export const genF4Cycle: QGen = () => {
  const c = pick([...COLS.slice(0, 6)])
  const r = ri(1, 9)
  const f = DOLLAR_FORMS(c, r) // F4 1回→$A$1, 2回→A$1, 3回→$A1, 4回→A1
  const n = ri(1, 4)
  return choice(
    `数式で「${c}${r}」を 選んで F4キーを ${n}回 押すと？`,
    f[(n - 1) % 4],
    f.filter((_, i) => i !== (n - 1) % 4),
    'F4 を押すたびに $A$1 → A$1 → $A1 → A1 と 切り替わる。',
  )
}

export const genMixedMeaning: QGen = () => {
  const c = pick([...COLS.slice(0, 5)])
  const r = ri(1, 9)
  const v = pick(['row', 'col', 'both'] as const)
  const ref = v === 'row' ? `${c}$${r}` : v === 'col' ? `$${c}${r}` : `$${c}$${r}`
  const ans = v === 'row' ? '行だけ 固定' : v === 'col' ? '列だけ 固定' : '行も列も 固定'
  return choice(`「${ref}」の 意味は？`, ans, ['行だけ 固定', '列だけ 固定', '行も列も 固定', 'どちらも 固定しない'], '$ は すぐ後ろの 列（英字）や 行（数字）を 固定する。')
}

export const genMixedCopy: QGen = () => {
  // =$A2*B$1 を 右下へコピー
  const dr = ri(1, 4)
  const dc = ri(1, 3)
  const r = 2 + dr
  const c = COLS[1 + dc]
  return choice(
    `B2 の =$A2*B$1 を ${c}${r} に コピー。${c}${r} の 数式は？`,
    `=$A${r}*${c}$1`,
    [`=$A2*B$1`, `=$${COLS[dc]}${r}*${c}$${1 + dr}`, `=A${r}*${c}1`, `=$A${r}*B$1`],
    '$A は 列が A のまま、$1 は 行が 1 のまま。それ以外は ずれる。',
  )
}

export const genShareValue: QGen = () => {
  const total = pick([200, 400, 500, 800, 1000])
  const pct = pick([10, 20, 25, 40, 50])
  const v = (total * pct) / 100
  return choice(
    `B2 に ${v}、合計の B6 に ${total}。構成比 =B2/$B$6 の 結果は？（％表示）`,
    `${pct}%`,
    [`${pct / 10}%`, `${100 - pct}%`, `${pct * 2}%`],
    `${v} ÷ ${total} = ${pct / 100} → ${pct}%。`,
  )
}

export const genRound: QGen = () => {
  const base = ri(10, 99)
  const frac = pick([1, 2, 3, 4, 5, 6, 7, 8, 9])
  const x = base + frac / 10
  const up = frac >= 5
  return choice(
    `=ROUND(${x}, 0) の 結果は？`,
    up ? base + 1 : base,
    [up ? base : base + 1, x, base * 10 + frac],
    `ROUND(数値, 0) は 小数第1位で 四捨五入。${x} → ${up ? base + 1 : base}。`,
  )
}

export const genFormulaTax: QGen = () => {
  // 税率を絶対参照で固定させる：コピー先でも 正しく計算できるか
  const rate = pick([8, 10])
  const n = 3
  const prices = nums(n, 50, 5).map((x) => x * 100)
  const table: (string | number)[][] = [['価格', '税込', '', '税率', rate / 100]]
  prices.forEach((p) => table.push([p]))
  return {
    type: 'formula',
    q: `B2 に 税込価格（価格×(1＋税率)）を出せ！ 税率は E1。B3・B4 にも コピーするぞ。`,
    table,
    target: 'B2',
    expect: prices[0] * (1 + rate / 100),
    copies: [
      { at: 'B3', expect: prices[1] * (1 + rate / 100) },
      { at: 'B4', expect: prices[2] * (1 + rate / 100) },
    ],
    mustUse: '$',
    hint: '=A2*(1+$E$1)',
    explain: `=A2*(1+$E$1)。E1 に $ を付けないと、コピーで E2・E3 に ずれてしまう。`,
  }
}

export const genFormulaShare: QGen = () => {
  const n = 3
  const vals = nums(n, 60, 10)
  const total = sum(vals)
  const table: (string | number)[][] = [['売上', '構成比']]
  vals.forEach((v) => table.push([v]))
  table.push([total])
  return {
    type: 'formula',
    q: `B2 に 構成比（売上÷合計）を出せ！ 合計は A${n + 2}。B3・B4 にも コピーするぞ。`,
    table,
    target: 'B2',
    expect: vals[0] / total,
    copies: [
      { at: 'B3', expect: vals[1] / total },
      { at: 'B4', expect: vals[2] / total },
    ],
    mustUse: '$',
    hint: `=A2/$A$${n + 2}`,
    explain: `=A2/$A$${n + 2}（または A$${n + 2}）。合計の セルを 固定するのが コツ。`,
  }
}

export const genFormulaTimes: QGen = () => {
  // 九九の表：複合参照
  const a = ri(2, 5)
  const b = ri(2, 5)
  const table: (string | number)[][] = [['', a, a + 1], [b], [b + 1]]
  return {
    type: 'formula',
    q: 'B2 に 掛け算表の 数式を入れよ！（左の数 × 上の数） C2・B3・C3 にも コピーするぞ。',
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
    explain: '=$A2*B$1。列を固定した $A と、行を固定した $1 の 組み合わせ（複合参照）。',
  }
}

export const genFormulaRound: QGen = () => {
  const price = ri(11, 99) * 10 + pick([3, 7])
  const off = pick([0.85, 0.9, 0.75])
  const raw = price * off
  const ans = Math.round(raw)
  return {
    type: 'formula',
    q: `B1 に A1 の ${Math.round((1 - off) * 100)}% 引き（×${off}）を、四捨五入して 整数で 出せ！`,
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
const OP_NAME: Record<Op, string> = { '>=': '以上', '<=': '以下', '>': 'より大きい', '<': '未満', '=': '等しい', '<>': '等しくない' }
const PAIRS: [string, string][] = [
  ['合格', '不合格'],
  ['大漁', '不漁'],
  ['出航', '欠航'],
  ['○', '×'],
  ['OK', 'NG'],
]
/** しきい値 t の まわりの数（ちょうど t も 出る） */
const around = (t: number, w: number) => pick([t, t + ri(1, w), t - ri(1, w)])

export const genCompare: QGen = () => {
  const op = pick(Object.keys(CMP) as Op[])
  const a = ri(10, 99)
  const b = around(a, 6)
  const r = CMP[op](a, b)
  return choice(
    `A1 に ${a}、B1 に ${b}。=A1${op}B1 の 結果は？`,
    TF(r),
    [TF(!r), '#VALUE!', '0'],
    `「${op}」は「${OP_NAME[op]}」。${a} ${op} ${b} は ${r ? '正しい → TRUE' : '正しくない → FALSE'}。`,
  )
}

export const genOpMeaning: QGen = () => {
  const table: [string, string, string[]][] = [
    ['以上', '>=', ['>', '≧', '<=']],
    ['以下', '<=', ['<', '≦', '>=']],
    ['より大きい', '>', ['>=', '≧', '<']],
    ['未満', '<', ['<=', '≦', '>']],
    ['等しくない', '<>', ['!=', '≠', '><']],
  ]
  const [name, ans, wrongs] = pick(table)
  return choice(`「${name}」を 表す Excelの 比較演算子は？`, ans, wrongs, 'Excel では ≧ ≦ ≠ は 使えない。>= <= <> と 書く。')
}

export const genIfText: QGen = () => {
  const t = pick([50, 60, 70, 80])
  const x = around(t, 20)
  const [yes, no] = pick(PAIRS)
  const op = pick(['>=', '>'] as const)
  const r = CMP[op](x, t)
  return choice(
    `A1 に ${x}。=IF(A1${op}${t},"${yes}","${no}") の 結果は？`,
    r ? yes : no,
    [r ? no : yes, 'TRUE', 'FALSE'],
    `${x} ${op} ${t} は ${TF(r)} → ${r ? '1つ目' : '2つ目'}の「${r ? yes : no}」。${x === t ? `（ちょうど ${t} は、>= なら 含まれ、> なら 含まれない）` : ''}`,
  )
}

export const genIfNum: QGen = () => {
  const v = pick(['ship', 'bonus'] as const)
  if (v === 'ship') {
    const x = around(3000, 15) === 3000 ? 3000 : pick([ri(20, 29), ri(31, 60)]) * 100
    const r = x >= 3000 ? 0 : 500
    return choice(`A1 に ${x}。=IF(A1>=3000,0,500) の 結果は？`, r, [r === 0 ? 500 : 0, x, x + 500], `${x} >= 3000 は ${TF(x >= 3000)} → ${r}（3000以上は 送料 無料）。`)
  }
  const t = pick([100, 200])
  const x = around(t, 50)
  const r = x >= t ? x * 2 : x
  return choice(`A1 に ${x}。=IF(A1>=${t},A1*2,A1) の 結果は？`, r, [x >= t ? x : x * 2, t, t * 2], `${x} >= ${t} は ${TF(x >= t)} → ${x >= t ? 'A1*2' : 'A1'} で ${r}。`)
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
    `A1 に ${x}。=IF(A1>=${hi},"A",IF(A1>=${mid},"B","C")) の 結果は？`,
    r,
    ['A', 'B', 'C', 'FALSE'],
    `まず ${x}>=${hi} は ${TF(x >= hi)}。${x >= hi ? '→ A' : `違うので 中の IF へ。${x}>=${mid} は ${TF(x >= mid)} → ${r}`}。`,
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
    `A1 に ${a}、B1 に ${b}。=${fn}(A1<${t1},B1<${t2}) の 結果は？`,
    TF(r),
    [TF(!r), '#VALUE!', '1'],
    `A1<${t1} は ${TF(c1)}、B1<${t2} は ${TF(c2)}。${fn === 'AND' ? 'AND は 両方 TRUE の ときだけ TRUE' : 'OR は 1つでも TRUE なら TRUE'}。`,
  )
}

const CATCH = ['魚', '貝', '海藻', 'カニ']
function catchList(n: number) {
  const items = Array.from({ length: n }, () => pick(CATCH))
  if (!items.includes('魚')) items[ri(0, n - 1)] = '魚'
  return items
}

export const genCountIfText: QGen = () => {
  const n = ri(5, 7)
  const items = catchList(n)
  const k = pick(items)
  const cnt = items.filter((x) => x === k).length
  return choice(`A1〜A${n} に「${items.join('、')}」。=COUNTIF(A1:A${n},"${k}") は？`, cnt, [n, cnt + 1, cnt - 1 || cnt + 2], `「${k}」の セルだけを 数える → ${cnt}個。`)
}

export const genCountIfNum: QGen = () => {
  const n = ri(5, 7)
  const vals = nums(n, 99)
  const t = pick([30, 50, 60, 70])
  const op = pick(['>=', '<'] as const)
  const cnt = vals.filter((v) => CMP[op](v, t)).length
  return choice(
    `A1〜A${n} に ${vals.join('、')}。=COUNTIF(A1:A${n},"${op}${t}") は？`,
    cnt,
    [n - cnt, n, cnt + 1],
    `${t}${OP_NAME[op]}の 数を 数える → ${vals.filter((v) => CMP[op](v, t)).join('、') || 'なし'} で ${cnt}個。条件は "${op}${t}" のように " で 囲む。`,
  )
}

export const genSumIf: QGen = () => {
  const n = ri(4, 5)
  const items = catchList(n)
  const amts = Array.from({ length: n }, () => ri(2, 30))
  const k = pick(items)
  const s = items.reduce((a, x, i) => a + (x === k ? amts[i] : 0), 0)
  const rows = items.map((x, i) => `${x}:${amts[i]}`).join('、')
  return choice(`A列（種類）と B列（数）に「${rows}」。=SUMIF(A1:A${n},"${k}",B1:B${n}) は？`, s, [sum(amts), items.filter((x) => x === k).length, s + ri(2, 9)], `「${k}」の 行の 数だけを 足す → ${s}。`)
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
    q: `B2 に「A2 が ${t}以上なら "${yes}"、違えば "${no}"」を 出せ！ B3・B4 にも コピーするぞ。`,
    table: [['点数', '判定'], ...vals.map((v) => [v])],
    target: 'B2',
    expect: at(vals[0]),
    copies: [
      { at: 'B3', expect: at(vals[1]) },
      { at: 'B4', expect: at(vals[2]) },
    ],
    mustUse: 'IF',
    hint: `=IF(A2>=${t},"${yes}","${no}")`,
    explain: `=IF(A2>=${t},"${yes}","${no}")。文字は " で 囲む。`,
  }
}

export const genFormulaIfNum: QGen = () => {
  const vals = mixed3(3000, 2000, 100)
  const fee = (v: number) => (v >= 3000 ? 0 : 500)
  return {
    type: 'formula',
    q: 'B2 に 送料を 出せ！（金額が 3000以上なら 0、違えば 500） B3・B4 にも コピーするぞ。',
    table: [['金額', '送料'], ...vals.map((v) => [v])],
    target: 'B2',
    expect: fee(vals[0]),
    copies: [
      { at: 'B3', expect: fee(vals[1]) },
      { at: 'B4', expect: fee(vals[2]) },
    ],
    mustUse: 'IF',
    hint: '=IF(A2>=3000,0,500)',
    explain: '=IF(A2>=3000,0,500)。答えの ところに 数値も 書ける。',
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
  const at = ([w, h]: [number, number]) => (w < 10 && h < 2 ? '出航' : '欠航')
  return {
    type: 'formula',
    q: 'C2 に「風速（A）が 10未満 かつ 波（B）が 2未満 なら "出航"、違えば "欠航"」を 出せ！ C3・C4 にも コピー。',
    table: [['風速', '波', '判定'], ...rows],
    target: 'C2',
    expect: at(rows[0]),
    copies: [
      { at: 'C3', expect: at(rows[1]) },
      { at: 'C4', expect: at(rows[2]) },
    ],
    mustUse: 'AND',
    hint: '=IF(AND(A2<10,B2<2),"出航","欠航")',
    explain: '=IF(AND(A2<10,B2<2),"出航","欠航")。「かつ」は AND。',
  }
}

export const genFormulaCountIf: QGen = () => {
  const n = 6
  const items = catchList(n)
  const k = pick(items)
  return {
    type: 'formula',
    q: `C1 に A1〜A${n} の「${k}」の 数を 出せ！`,
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
    q: `D1 に、A列が「${k}」の 行の B列（数）の 合計を 出せ！`,
    table: items.map((x, i) => [x, amts[i]]),
    target: 'D1',
    expect: items.reduce((a, x, i) => a + (x === k ? amts[i] : 0), 0),
    mustUse: 'SUMIF',
    hint: `=SUMIF(A1:A${n},"${k}",B1:B${n})`,
    explain: `=SUMIF(A1:A${n},"${k}",B1:B${n})。条件の範囲 → 条件 → 合計する範囲 の 順。`,
  }
}
