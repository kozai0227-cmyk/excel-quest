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

export const genRangeWrite: QGen = () => {
  // 範囲の 書き方（: で つなぐ）を 覚える
  const c1 = ri(0, 3)
  const c2 = c1 + ri(0, 2)
  const r1 = ri(1, 5)
  const r2 = r1 + ri(2, 6)
  const a = `${COLS[c1]}${r1}`
  const z = `${COLS[c2]}${r2}`
  return choice(
    `${a} から ${z} までの 範囲を 数式で 指定したい。正しい 書き方は？`,
    `${a}:${z}`,
    [`${a}-${z}`, `${a}~${z}`, `${a}→${z}`],
    `範囲は「左上のセル:右下のセル」と「:（コロン）」で つなぐ。=SUM(${a}:${z}) のように 使う。`,
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
        `=SUM(${c}1:${c}${n}) と 同じ 意味の 式は？`,
        `=${cells.join('+')}`,
        [`=${c}1+${c}${n}`, `=SUM(${c}1,${c}${n})`, `=${c}1*${c}${n}`],
        `「:」は ${c}1 から ${c}${n} までの すべての セル。「,」で 区切ると ${c}1 と ${c}${n} の 2つだけに なる。`,
      ),
    () =>
      choice(
        `=SUM(${c}1,${c}${n}) が 足すのは？`,
        `${c}1 と ${c}${n} の 2つだけ`,
        [`${c}1 から ${c}${n} まで すべて`, `${c}${n} だけ`, 'エラーに なる'],
        `「,」は セルを 1つずつ 並べる 書き方。${c}1 から ${c}${n} まで まとめて 足すなら =SUM(${c}1:${c}${n})。`,
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
  // 暗算の 負担は 小さく（1けたの 数だけ）。知りたいのは「どこから 計算するか」
  const a = ri(1, 9)
  const b = ri(2, 5)
  const c = ri(2, 5)
  const v = pick(['plus', 'paren', 'which'] as const)
  if (v === 'plus')
    return choice(`=${a}+${b}*${c} の 結果は？`, a + b * c, [(a + b) * c, a * b + c, a + b + c], `掛け算が 先。${b}×${c}=${b * c}、${a}+${b * c}=${a + b * c}。`)
  if (v === 'paren')
    return choice(`=(${a}+${b})*${c} の 結果は？`, (a + b) * c, [a + b * c, a * b * c, a + b + c], `カッコの中が 最優先。${a}+${b}=${a + b}、×${c}=${(a + b) * c}。`)
  return choice(
    `=A1+B1*C1 で、最初に 計算されるのは？`,
    'B1*C1',
    ['A1+B1', 'A1*C1', '左から 順番に'],
    '掛け算・割り算が 足し算・引き算より 先。先に 足したいときは =(A1+B1)*C1 と カッコで 囲む。',
  )
}

export const genDivision: QGen = () => {
  const a = ri(2, 9)
  const b = pick([2, 5, 10])
  const c = ri(1, 9)
  return choice(`=${a * b}/${b}+${c} の 結果は？`, a + c, [(a * b) / (b + c), a * b + c, a - c, a + c + b].map((x) => Math.round(x * 10) / 10), `割り算が 先。${a * b}÷${b}=${a}、${a}+${c}=${a + c}。`)
}

export const genSumValues: QGen = () => {
  const n = 3
  const vals = nums(n, 9)
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
  // 平均は 暗算させず「どう 計算しているか」を 問う
  const n = ri(3, 6)
  const c = pick([...COLS.slice(0, 4)])
  const r = `${c}1:${c}${n}`
  return choice(
    `=AVERAGE(${r}) と 同じ 答えに なる 式は？（${r} は すべて 数値）`,
    `=SUM(${r})/${n}`,
    [`=SUM(${r})*${n}`, `=SUM(${r})/2`, `=MAX(${r})/${n}`],
    `平均は「合計 ÷ 個数」。${r} は ${n}個 なので =SUM(${r})/${n} と 同じ。AVERAGE なら 個数を 数えなくて いい。`,
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
  return choice(`「${name}」を 表す 数式の 比較演算子は？`, ans, wrongs, '数式では ≧ ≦ ≠ は 使えない。>= <= <> と 書く。')
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
  const x = around(t, 5)
  const r = x >= t ? x + 100 : x
  return choice(`A1 に ${x}。=IF(A1>=${t},A1+100,A1) の 結果は？`, r, [x >= t ? x : x + 100, t, t + 100], `${x} >= ${t} は ${TF(x >= t)} → ${x >= t ? 'A1+100' : 'A1'} で ${r}。`)
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

// ---------------------------------------------------------------- 第4章：検索（VLOOKUP・XLOOKUP）
const BOOKS = ['表の書', '関数の書', '参照の書', '条件の書', '検索の書', '集計の書', '書式の書', '印刷の書']
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
    `A1:C4 に「番号・書名・値段」の 表（${t.map((r) => r.join('/')).join('、')}）。=VLOOKUP(${row[0]},A1:C4,${col},FALSE) は？`,
    ans,
    [row[col === 2 ? 2 : 1], other[col - 1], '#N/A'],
    `左端の 番号 ${row[0]} の 行を 探して、左から ${col}列目（${col === 2 ? '書名' : '値段'}）を 取り出す → ${ans}。`,
  )
}

export const genColIndex: QGen = () => {
  const a = ri(0, 3)
  const b = a + ri(2, 4)
  const k = ri(a + 1, b)
  const n = k - a + 1
  return choice(
    `=VLOOKUP(…, ${COL_LETTERS[a]}2:${COL_LETTERS[b]}9, 列番号, FALSE) で ${COL_LETTERS[k]}列を 取り出したい。列番号は？`,
    n,
    [k + 1, n - 1 || n + 2, n + 1],
    `列番号は 範囲の 左端（${COL_LETTERS[a]}列）を 1 と 数える。${COL_LETTERS[k]}列は ${n}列目。シート全体の 何列目か では ない。`,
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
    `D1:E4 に 区切りの 表（0→C、50→B、70→A、90→S）。=VLOOKUP(${v},D1:E4,2,TRUE) は？`,
    g,
    GRADES.map(([, x]) => x).filter((x) => x !== g),
    `TRUE（近似一致）は「${v} 以下で いちばん 大きい 値」の 行を 選ぶ → ${g}。区切りの 表は 小さい順に 並べる。`,
  )
}

export const genFormulaVlookup: QGen = () => {
  const t = lookupTable()
  const row = pick(t)
  const col = pick([2, 3])
  return {
    type: 'formula',
    q: `F1 に、E1 の 番号の ${col === 2 ? '書名' : '値段'}を 表（A1:C4）から 取り出せ！`,
    table: t.map((r, i) => (i === 0 ? [...r, '', row[0]] : r)),
    target: 'F1',
    expect: row[col - 1],
    mustUse: 'VLOOKUP',
    hint: `=VLOOKUP(E1,A1:C4,${col},FALSE)`,
    explain: `=VLOOKUP(E1,A1:C4,${col},FALSE)。${col === 2 ? '書名は 2列目' : '値段は 3列目'}。FALSE は 完全一致。`,
  }
}

export const genFormulaXlookup: QGen = () => {
  const t = lookupTable()
  const row = pick(t)
  // 名前 → 番号（番号は 左の 列）
  return {
    type: 'formula',
    q: `F1 に、E1 の 書名の「番号」を 出せ！（番号は 書名より 左の A列）`,
    table: t.map((r, i) => (i === 0 ? [...r, '', row[1]] : r)),
    target: 'F1',
    expect: row[0],
    mustUse: 'XLOOKUP',
    hint: '=XLOOKUP(E1,B1:B4,A1:A4)',
    explain: '=XLOOKUP(E1,B1:B4,A1:A4)。探す列（B）と 取り出す列（A）を 別々に 指定するので、左の 列も 取り出せる。',
  }
}

export const genFormulaIferror: QGen = () => {
  const t = lookupTable()
  const missing = Math.random() < 0.6
  const id = missing ? t[0][0] + 1000 : pick(t)[0]
  const hit = t.find((r) => r[0] === id)
  return {
    type: 'formula',
    q: `F1 に、E1 の 番号の 書名を 出せ！ 表に なければ "なし" と 出すこと。`,
    table: t.map((r, i) => (i === 0 ? [...r, '', id] : r)),
    target: 'F1',
    expect: hit ? hit[1] : 'なし',
    mustUse: 'IFERROR',
    hint: '=IFERROR(VLOOKUP(E1,A1:C4,2,FALSE),"なし")',
    explain: '=IFERROR(VLOOKUP(E1,A1:C4,2,FALSE),"なし")。見つからない #N/A の ときだけ "なし" に なる。XLOOKUP の 4つ目に "なし" でも いい。',
  }
}

// ---------------------------------------------------------------- 第5章：複数条件の 集計（SUMIFS・COUNTIFS）
const AREAS = ['北', '南']
const TIMES = ['昼', '夜']
/** 地区・時間帯（・数）の 記録。どの 組み合わせも 1回は 出る */
function patrolRows(n: number) {
  const rows: [string, string, number][] = [
    ['北', '昼', 0],
    ['北', '夜', 0],
    ['南', '昼', 0],
    ['南', '夜', 0],
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
    `A列（地区）と B列（時間）に「${rows.map((r) => r[0] + r[1]).join('、')}」。=COUNTIFS(A1:A6,"${a}",B1:B6,"${t}") は？`,
    cnt,
    [onlyA, onlyT, cnt + 1],
    `「${a}」で、しかも「${t}」の 行だけを 数える → ${cnt}個。片方だけ 満たす 行は 数えない。`,
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
  return choice(
    `${c1}列が「北」で ${c2}列が「夜」の 行の、${s}列の 合計を 出す 正しい 式は？`,
    `=SUMIFS(${r(s)},${r(c1)},"北",${r(c2)},"夜")`,
    [`=SUMIFS(${r(c1)},"北",${r(c2)},"夜",${r(s)})`, `=SUMIFS("北",${r(c1)},"夜",${r(c2)},${r(s)})`, `=SUMIF(${r(c1)},"北",${r(s)})`],
    'SUMIFS は「合計する範囲」が 最初。そのあと「範囲, 条件」の ペアを 並べる。SUMIF とは 順番が ちがう。',
  )
}

export const genIfsFunction: QGen = () => {
  const [q, a, why] = pick([
    ['「東店」の「パン」の 売上の 合計', 'SUMIFS', '条件が 2つの 合計は SUMIFS。'],
    ['「北地区」で「夜」の 見回りの 回数', 'COUNTIFS', '条件が 2つの 個数は COUNTIFS。'],
    ['「赤組」だけの 平均点', 'AVERAGEIF', '条件つきの 平均は AVERAGEIF。'],
    ['「白組」の 最高点', 'MAXIFS', '条件つきの 最大は MAXIFS。最小なら MINIFS。'],
    ['「金貨」の うち いちばん 軽い 重さ', 'MINIFS', '条件つきの 最小は MINIFS。'],
    ['「東地区」で 1000G 以上の 納税の 件数', 'COUNTIFS', '地区と 金額、条件が 2つの 個数は COUNTIFS。'],
  ] as const)
  return choice(`${q}を 出したい。使う 関数は？`, a, ['SUMIFS', 'COUNTIFS', 'AVERAGEIF', 'MAXIFS', 'MINIFS', 'SUMIF', 'COUNT'].filter((f) => f !== a).sort(() => Math.random() - 0.5), why)
}

export const genPivotArea: QGen = () => {
  const [q, a, wrongs, why] = pick([
    ['地区ごとの 売上合計を、地区を 縦に 並べて 作りたい。「地区」を 置く 欄は？', '行', ['列', '値', 'フィルター'], '縦に 並べる 見出しは「行」。横に 並べるなら「列」。'],
    ['ピボットテーブルで、合計や 個数を 計算する 数（売上など）を 置く 欄は？', '値', ['行', '列', 'フィルター'], '計算する 数は「値」。合計・個数・平均などを 選べる。'],
    ['「東店だけ」に しぼって 集計したい。「店」を 置く 欄は？', 'フィルター', ['行', '列', '値'], '全体を しぼりこむ 項目は「フィルター」。'],
    ['作物を 表の 横（上の 見出し）に 並べたい。「作物」を 置く 欄は？', '列', ['行', '値', 'フィルター'], '横に 並べる 見出しは「列」。'],
    ['記録の 表から「項目ごとの 合計表」を マウス操作で 作る 機能は？', 'ピボットテーブル', ['オートフィル', '条件付き書式', 'フィルター'], 'ピボットテーブルは SUMIFS の 集計表を 自動で 作ってくれる 機能。'],
  ] as const)
  return choice(q, a, [...wrongs], why)
}

export const genCrossRef: QGen = () => {
  const row = pick(['E', 'D', 'H'])
  const top = COLS[COLS.indexOf(row) + 1]
  const ask = pick(['left', 'top'] as const)
  return ask === 'left'
    ? choice(
        `${top}2 の SUMIFS を 右へも 下へも コピーして 集計表を 作る。左の 見出し ${row}2 の 正しい 参照は？`,
        `$${row}2`,
        [`$${row}$2`, `${row}$2`, `${row}2`],
        `右へ コピーしても ${row}列を 見続けるので 列を 固定、下へは ずれて ほしいので 行は そのまま → $${row}2。`,
      )
    : choice(
        `${top}2 の SUMIFS を 右へも 下へも コピーして 集計表を 作る。上の 見出し ${top}1 の 正しい 参照は？`,
        `${top}$1`,
        [`$${top}$1`, `$${top}1`, `${top}1`],
        `下へ コピーしても 1行目を 見続けるので 行を 固定、右へは ずれて ほしいので 列は そのまま → ${top}$1。`,
      )
}

export const genFormulaCountifs: QGen = () => {
  const rows = patrolRows(6)
  const a = pick(AREAS)
  const t = pick(TIMES)
  return {
    type: 'formula',
    q: `E1 に、地区が「${a}」で 時間が「${t}」の 行の 数を 出せ！`,
    table: rows.map((r) => [r[0], r[1]]),
    target: 'E1',
    expect: rows.filter((r) => r[0] === a && r[1] === t).length,
    mustUse: 'COUNTIFS',
    hint: `=COUNTIFS(A1:A6,"${a}",B1:B6,"${t}")`,
    explain: `=COUNTIFS(A1:A6,"${a}",B1:B6,"${t}")。範囲と 条件の ペアを 並べる。`,
  }
}

export const genFormulaSumifs: QGen = () => {
  const rows = patrolRows(6)
  const a = pick(AREAS)
  const t = pick(TIMES)
  return {
    type: 'formula',
    q: `E1 に、地区が「${a}」で 時間が「${t}」の 行の C列（数）の 合計を 出せ！`,
    table: rows,
    target: 'E1',
    expect: rows.filter((r) => r[0] === a && r[1] === t).reduce((x, r) => x + r[2], 0),
    mustUse: 'SUMIFS',
    hint: `=SUMIFS(C1:C6,A1:A6,"${a}",B1:B6,"${t}")`,
    explain: `=SUMIFS(C1:C6,A1:A6,"${a}",B1:B6,"${t}")。合計する 範囲（C列）が 最初。`,
  }
}

export const genFormulaAvgif: QGen = () => {
  const n = 6
  const groups = shuffled(['赤', '赤', '赤', '白', '白', '白'])
  const vals = groups.map(() => ri(5, 10) * 10)
  const g = pick(['赤', '白'])
  const fn = pick(['AVERAGEIF', 'MAXIFS', 'MINIFS'] as const)
  const mine = vals.filter((_, i) => groups[i] === g)
  const expect = fn === 'AVERAGEIF' ? mine.reduce((a, b) => a + b, 0) / mine.length : fn === 'MAXIFS' ? Math.max(...mine) : Math.min(...mine)
  const hint = fn === 'AVERAGEIF' ? `=AVERAGEIF(A1:A${n},"${g}",B1:B${n})` : `=${fn}(B1:B${n},A1:A${n},"${g}")`
  return {
    type: 'formula',
    q: `D1 に、A列が「${g}」の 行の B列の ${fn === 'AVERAGEIF' ? '平均' : fn === 'MAXIFS' ? '最大' : '最小'}を 出せ！`,
    table: groups.map((x, i) => [x, vals[i]]),
    target: 'D1',
    expect,
    mustUse: fn,
    hint,
    explain: `${hint}。${fn === 'AVERAGEIF' ? 'AVERAGEIF は SUMIF と 同じ 並び（条件の範囲が 先）。' : `${fn} は SUMIFS と 同じ 並び（答えを 探す 範囲が 先）。`}`,
  }
}

// ---------------------------------------------------------------- 第6章：文字列（& ・LEFT・RIGHT・MID・LEN・FIND）
const KANA = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワ'
const word = (n: number) => Array.from({ length: n }, () => KANA[ri(0, KANA.length - 1)]).join('')
const LETTERS = 'ABCDEFGHJKLMNPRSTUVWXYZ'
const code = () => `${LETTERS[ri(0, LETTERS.length - 1)]}${LETTERS[ri(0, LETTERS.length - 1)]}-${ri(1000, 9999)}`
const FIRST = ['山田', '佐藤', '鈴木', '田中', '高橋', '伊藤']
const GIVEN = ['太郎', '花子', '一郎', '美咲', '健太', '結衣']
const USERS = ['taro', 'hana', 'ken', 'yui', 'moji', 'kaki', 'yomi']
const HOSTS = ['moji.jp', 'text.co', 'kaki.ne', 'yomi.or']

export const genLeftRightPick: QGen = () => {
  const c = code()
  const v = pick(['left', 'right', 'mid'] as const)
  if (v === 'left') return choice(`A1 に「${c}」。=LEFT(A1,2) の 結果は？`, c.slice(0, 2), [c.slice(-2), c.slice(0, 3), c.slice(3, 5)], 'LEFT は 左から 数えて 指定した 文字数を 取り出す。')
  if (v === 'right') return choice(`A1 に「${c}」。=RIGHT(A1,4) の 結果は？`, c.slice(-4), [c.slice(0, 4), c.slice(-3), c.slice(2, 6)], 'RIGHT は 右から 数えて 指定した 文字数を 取り出す。')
  return choice(`A1 に「${c}」。=MID(A1,4,2) の 結果は？`, c.slice(3, 5), [c.slice(4, 6), c.slice(2, 4), c.slice(0, 2)], `MID(文字列, 何文字目から, 何文字)。「-」が 3文字目なので、4文字目から 2文字。`)
}

export const genMidPick: QGen = () => {
  const w = word(7)
  const s = ri(2, 4)
  const n = ri(2, 3)
  return choice(
    `=MID("${w}",${s},${n}) の 結果は？`,
    w.slice(s - 1, s - 1 + n),
    [w.slice(s, s + n), w.slice(s - 2, s - 2 + n), w.slice(0, n)],
    `${s}文字目の「${w[s - 1]}」から ${n}文字 → ${w.slice(s - 1, s - 1 + n)}。`,
  )
}

export const genJoinPick: QGen = () => {
  const a = pick(FIRST)
  const b = pick(GIVEN)
  const v = pick(['plain', 'space', 'plus'] as const)
  if (v === 'plain') return choice(`A1 に「${a}」、B1 に「${b}」。=A1&B1 の 結果は？`, a + b, [`${a} ${b}`, `${b}${a}`, '#VALUE!'], '「&」は 文字を そのまま つなぐ。空白が ほしいときは =A1&" "&B1。')
  if (v === 'space') return choice(`A1 に「${a}」、B1 に「${b}」。=A1&" "&B1 の 結果は？`, `${a} ${b}`, [a + b, `${a}" "${b}`, `${b} ${a}`], '" " は 空白 1文字。名字・空白・名前 の 順に つながる。')
  return choice(`A1 に「${a}」、B1 に「${b}」。=A1+B1 の 結果は？`, '#VALUE!', [a + b, `${a} ${b}`, '0'], '+ は 数の 足し算。文字を つなぐなら「&」を 使う。')
}

export const genLenPick: QGen = () => {
  const n = ri(3, 6)
  const w = word(n)
  const sp = Math.random() < 0.5
  const s = sp ? `${w.slice(0, 2)} ${w.slice(2)}` : w
  return choice(`=LEN("${s}") の 結果は？`, s.length, [s.length - 1, s.length + 1, sp ? n : n + 2], `LEN は 文字数を 数える。${sp ? '空白も 1文字と 数える。' : ''}`)
}

export const genTextFunction: QGen = () => {
  const [q, a, why] = pick([
    ['商品コードの 左から 2文字を 取り出す', 'LEFT', '左から 取り出すのは LEFT。'],
    ['電話番号の 末尾 4けたを 取り出す', 'RIGHT', '右から 取り出すのは RIGHT。'],
    ['文字列の まん中（5文字目から 3文字）を 取り出す', 'MID', 'まん中は MID(文字列, 開始位置, 文字数)。'],
    ['看板の 文字数を 数える', 'LEN', '文字数は LEN。'],
    ['名前の 前後の よけいな 空白を 消す', 'TRIM', '空白の 掃除は TRIM。'],
    ['「株式会社」を「(株)」に 置きかえる', 'SUBSTITUTE', '文字の 置きかえは SUBSTITUTE。'],
    ['メールアドレスの「@」が 何文字目かを 調べる', 'FIND', '文字の 位置を 調べるのは FIND。'],
  ] as const)
  return choice(`${q}。使う 関数は？`, a, ['LEFT', 'RIGHT', 'MID', 'LEN', 'TRIM', 'SUBSTITUTE', 'FIND'].filter((f) => f !== a).sort(() => Math.random() - 0.5), why)
}

export const genFormulaJoin: QGen = () => {
  const a = pick(FIRST)
  const b = pick(GIVEN)
  return {
    type: 'formula',
    q: `C1 に「${a} ${b}」のように、A1 と B1 を 空白で つないで 出せ！`,
    table: [[a, b]],
    target: 'C1',
    expect: `${a} ${b}`,
    mustUse: '&',
    hint: '=A1&" "&B1',
    explain: '=A1&" "&B1。空白も " " で 囲んで & で つなぐ。',
  }
}

export const genFormulaLeftRight: QGen = () => {
  const c = code()
  const left = Math.random() < 0.5
  return {
    type: 'formula',
    q: left ? `B1 に、A1 の コードの 左から 2文字を 取り出せ！` : `B1 に、A1 の コードの 右から 4文字を 取り出せ！`,
    table: [[c]],
    target: 'B1',
    expect: left ? c.slice(0, 2) : c.slice(-4),
    mustUse: left ? 'LEFT' : 'RIGHT',
    hint: left ? '=LEFT(A1,2)' : '=RIGHT(A1,4)',
    explain: left ? '=LEFT(A1,2)。左から 2文字。' : '=RIGHT(A1,4)。右から 4文字。',
  }
}

export const genFormulaMid: QGen = () => {
  const w = word(7)
  const s = ri(2, 4)
  const n = ri(2, 3)
  return {
    type: 'formula',
    q: `B1 に、A1 の ${s}文字目から ${n}文字を 取り出せ！`,
    table: [[w]],
    target: 'B1',
    expect: w.slice(s - 1, s - 1 + n),
    mustUse: 'MID',
    hint: `=MID(A1,${s},${n})`,
    explain: `=MID(A1,${s},${n})。何文字目から・何文字 の 順。`,
  }
}

export const genFormulaFind: QGen = () => {
  const u = pick(USERS)
  const h = pick(HOSTS)
  return {
    type: 'formula',
    q: 'B1 に、A1 の アドレスの「@」より 前を 取り出せ！',
    table: [[`${u}@${h}`]],
    target: 'B1',
    expect: u,
    mustUse: 'FIND',
    hint: '=LEFT(A1,FIND("@",A1)-1)',
    explain: '=LEFT(A1,FIND("@",A1)-1)。FIND で @ の 位置を 調べ、その 1つ手前まで LEFT で 取り出す。',
  }
}

// ---------------------------------------------------------------- 第7章：日付（足し算・引き算・WEEKDAY・EDATE・DATEDIF）
const ymd = (y: number, m: number, d: number) => `${y}/${m}/${d}`
const WEEK = ['月', '火', '水', '木', '金', '土', '日']

export const genDateAddPick: QGen = () => {
  // 月の 中で おさまる 足し算（暗算の 負担は 小さく）
  const m = ri(1, 12)
  const d = ri(1, 15)
  const n = ri(3, 12)
  const ans = ymd(2026, m, d + n)
  return choice(`A1 に「${ymd(2026, m, d)}」。=A1+${n} の 結果は？`, ans, [ymd(2026, m + 1 > 12 ? 1 : m + 1, d), ymd(2026, m, d + n - 1), `${ymd(2026, m, d)}${n}`], `日付は「1日 ＝ 1」の 数。${n} を 足すと ${n}日後。`)
}

export const genDateDiffPick: QGen = () => {
  const m = ri(1, 12)
  const a = ri(1, 10)
  const b = a + ri(3, 15)
  return choice(`A1 に「${ymd(2026, m, a)}」、B1 に「${ymd(2026, m, b)}」。=B1-A1 の 結果は？`, b - a, [b - a + 1, b, '#VALUE!'], '日付どうしの 引き算は 間の 日数。')
}

export const genWeekdayPick: QGen = () => {
  const k = ri(0, 6)
  return pick([
    () => choice(`=WEEKDAY(日付, 2) で ${WEEK[k]}曜日は いくつ？`, k + 1, [((k + 1) % 7) + 1, k, k + 2 > 7 ? 1 : k + 2], '2つ目を 2 に すると 月曜 1 〜 日曜 7。'),
    () => choice(`=WEEKDAY(A1,2) が ${k + 1} なら、A1 は 何曜日？`, `${WEEK[k]}曜日`, [`${WEEK[(k + 1) % 7]}曜日`, `${WEEK[(k + 6) % 7]}曜日`, `${WEEK[(k + 3) % 7]}曜日`], '月曜 1・火曜 2 … 日曜 7。'),
    () => choice('土日を まとめて「休み」と 判定する 条件は？（WEEKDAY(A1,2) を 使う）', 'WEEKDAY(A1,2)>=6', ['WEEKDAY(A1,2)>=5', 'WEEKDAY(A1,2)=7', 'WEEKDAY(A1,2)<=2'], '土曜 6・日曜 7 なので「6以上」。'),
  ])()
}

export const genDateFunction: QGen = () => {
  const [q, a, why] = pick([
    ['日付から「月」だけを 数で 取り出す', 'MONTH', '年は YEAR、月は MONTH、日は DAY。'],
    ['日付から「年」だけを 数で 取り出す', 'YEAR', '年は YEAR。'],
    ['日付の 曜日を 数で 調べる', 'WEEKDAY', 'WEEKDAY(日付, 2) で 月曜 1 〜 日曜 7。'],
    ['契約開始日の 3か月後の 日付を 出す', 'EDATE', '○か月後は EDATE(日付, 月数)。'],
    ['その月の 末日（月末）を 出す', 'EOMONTH', '月末は EOMONTH(日付, 0)。'],
    ['入社日から 今日までの 満年数を 出す', 'DATEDIF', '満年数は DATEDIF(開始日, 終了日, "Y")。'],
  ] as const)
  return choice(`${q}。使う 関数は？`, a, ['YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'EDATE', 'EOMONTH', 'DATEDIF'].filter((f) => f !== a).sort(() => Math.random() - 0.5), why)
}

export const genFormulaDateAdd: QGen = () => {
  const m = ri(1, 12)
  const d = ri(1, 15)
  const n = ri(3, 12)
  return {
    type: 'formula',
    q: `C1 に、A1 の 日付の B1 日後を 出せ！`,
    table: [[ymd(2026, m, d), n]],
    target: 'C1',
    expect: ymd(2026, m, d + n),
    mustUse: '+',
    hint: '=A1+B1',
    explain: '=A1+B1。日付は 数と 同じように 足せる。',
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
    q: 'C1 に、A1（今日）から B1（締め切り）まで あと何日かを 出せ！',
    table: [[start, end]],
    target: 'C1',
    expect: days,
    mustUse: '-',
    hint: '=B1-A1',
    explain: '=B1-A1。締め切り − 今日 で 残りの 日数。',
  }
}

export const genFormulaDatePart: QGen = () => {
  const y = ri(1980, 2010)
  const m = ri(1, 12)
  const d = ri(1, 28)
  const [fn, ans, label] = pick([
    ['YEAR', y, '年'],
    ['MONTH', m, '月'],
    ['DAY', d, '日'],
  ] as const)
  return {
    type: 'formula',
    q: `B1 に、A1 の 日付の「${label}」を 数で 取り出せ！`,
    table: [[ymd(y, m, d)]],
    target: 'B1',
    expect: ans,
    mustUse: fn,
    hint: `=${fn}(A1)`,
    explain: `=${fn}(A1)。`,
  }
}

export const genFormulaEdate: QGen = () => {
  const m = ri(1, 9)
  const d = ri(1, 28)
  const n = ri(1, 3)
  return {
    type: 'formula',
    q: `C1 に、A1 の 日付の B1 か月後の 日付を 出せ！`,
    table: [[ymd(2026, m, d), n]],
    target: 'C1',
    expect: ymd(2026, m + n, d),
    mustUse: 'EDATE',
    hint: '=EDATE(A1,B1)',
    explain: '=EDATE(A1,B1)。何日 足すかではなく、何か月 足すか。',
  }
}

// ---------------------------------------------------------------- 最終章：エラーの 読み方・直し方
const ERRORS: [string, string][] = [
  ['#DIV/0!', '0（空の セル）で 割った'],
  ['#VALUE!', '文字など 計算できない 値が まざった'],
  ['#NAME?', '関数名の まちがい・" の 付け忘れ'],
  ['#REF!', '参照先の セルが 消えた'],
  ['#N/A', '探した 値が 見つからない'],
]

export const genErrorMeaning: QGen = () => {
  const [e, m] = pick(ERRORS)
  return pick([
    () => choice(`エラー「${e}」の 意味は？`, m, ERRORS.filter(([x]) => x !== e).map(([, y]) => y).sort(() => Math.random() - 0.5), `${e} は「${m}」。エラーは 直し方の ヒント。`),
    () => choice(`「${m}」ときに 出る エラーは？`, e, ERRORS.filter(([x]) => x !== e).map(([x]) => x).sort(() => Math.random() - 0.5), `${m} → ${e}。`),
  ])()
}

export const genErrorCause: QGen = () => {
  const [q, a, why] = pick([
    ['A1 に 10、B1 に 0。=A1/B1 の 結果は？', '#DIV/0!', '0 で 割ったので #DIV/0!。IFERROR(A1/B1,0) で 防げる。'],
    ['A1 に 10、B1 に「休み」。=A1+B1 の 結果は？', '#VALUE!', '文字は + で 足せない。=SUM(A1:B1) なら 文字を 飛ばして 10。'],
    ['=SUMM(A1:A5) の 結果は？', '#NAME?', 'SUMM という 関数は ない。つづりを SUM に 直す。'],
    ['=IF(A1>=60,OK,NG) の 結果は？（A1 は 70）', '#NAME?', '文字の OK・NG に " が ない。"OK" と 書く。'],
    ['表に ない 番号を =VLOOKUP(番号,A1:B5,2,FALSE) で 探すと？', '#N/A', '見つからないと #N/A。IFERROR か XLOOKUP の 4つ目で 防げる。'],
    ['=A1*C1 の C列を まるごと 削除すると？', '#REF!', '参照先が 消えたので #REF!。新しい セルへ 付けかえる。'],
  ] as const)
  return choice(q, a, ERRORS.map(([x]) => x).filter((x) => x !== a).sort(() => Math.random() - 0.5), why)
}

export const genFormulaSafeDivide: QGen = () => {
  const zero = Math.random() < 0.5
  const b = zero ? 0 : pick([2, 4, 5])
  const a = (zero ? ri(2, 9) : ri(2, 9) * b) as number
  return {
    type: 'formula',
    q: 'C1 に A1 ÷ B1 を 出せ！ 割れない（0 で 割る）ときは 0 に すること。',
    table: [[a, b]],
    target: 'C1',
    expect: zero ? 0 : a / b,
    mustUse: 'IFERROR',
    hint: '=IFERROR(A1/B1,0)',
    explain: '=IFERROR(A1/B1,0)。エラーの ときだけ 0 に なる。',
  }
}

export const genFormulaFixSum: QGen = () => {
  const vals: (number | string)[] = [ri(2, 9), '休み', ri(2, 9), ri(2, 9)]
  return {
    type: 'formula',
    q: 'A5 に、A1〜A4 の 数の 合計を 出せ！（「休み」が まざっている）',
    table: vals.map((v) => [v]),
    target: 'A5',
    expect: vals.reduce<number>((x, v) => x + (typeof v === 'number' ? v : 0), 0),
    mustUse: 'SUM',
    hint: '=SUM(A1:A4)',
    explain: '=SUM(A1:A4)。+ で 足すと #VALUE! に なるが、SUM は 文字を 飛ばして くれる。',
  }
}
