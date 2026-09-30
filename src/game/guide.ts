import { addr, cloneGrid, evaluate, fillLine, formatValue, normalizeInput, parseAddr, shiftFormula, toggleAbsAt, usesFn, type Grid, type Value } from './formula'
import { funcsFor, tokenize, type ChipGroup } from './formulaTokens'

/**
 * スマホ用の「ステップ式」の依頼。
 * 本物の Excel の 細かい 操作（セルを 正確に 選ぶ・ドラッグする など）は 省き、
 * 「どの 関数を 使うか」「数式を どう 書くか」「どの 操作で 何が 起きるか」という 知識を 1つずつ 答えていく。
 */
export interface ChoiceStep {
  kind: 'choice'
  q: string
  /** 正解の 選択肢 */
  answer: string
  /** まちがいの 選択肢 */
  wrong: string[]
  /** 正解したあとに 見せる 解説（Excel の 知識） */
  explain: string
  /** 表の中で 目立たせる セル・範囲（例：'B2'、'A1:B4'） */
  focus?: string
  /** 正解したときの 表の 変化（その操作を したことに なる） */
  apply?: (g: Grid, history: Grid[]) => Grid
  /** 正解で 記録する 操作（判定用：paste / fill / undo / bold など） */
  actions?: string[]
  hint?: string
}

export interface FormulaStep {
  kind: 'formula'
  q: string
  /** 数式を 入れる セル */
  target: string
  /** オートフィルで 広げる 範囲（target を ふくむ。例：'D2:D5'） */
  fill?: string
  /** 模範の 数式 */
  answer: string
  /** ひっかけ用の 部品（× や、" で 囲んでいない 文字 など） */
  extra?: string[]
  explain: string
  hint?: string
}

export type GuideStep = ChoiceStep | FormulaStep

// ---------------------------------------------------------------- 範囲・表の 操作
/** 'A1:B4' → ['A1','B1','A2',…]（行ごと） */
export function rangeCells(range: string): string[] {
  const [a, b = a] = range.split(':')
  const p = parseAddr(a)
  const q = parseAddr(b)
  const out: string[] = []
  for (let r = Math.min(p.r, q.r); r <= Math.max(p.r, q.r); r++)
    for (let c = Math.min(p.c, q.c); c <= Math.max(p.c, q.c); c++) out.push(addr(r, c))
  return out
}

export function setCells(g: Grid, vals: Record<string, string>): Grid {
  const n = cloneGrid(g)
  for (const [a, raw] of Object.entries(vals)) {
    const { r, c } = parseAddr(a)
    n[r][c] = { ...n[r][c], raw }
  }
  return n
}

/** コピー＆貼り付け（数式は 貼った 場所に 合わせて ずれる） */
export function pasteRange(g: Grid, src: string, dest: string): Grid {
  const n = cloneGrid(g)
  const s = parseAddr(src.split(':')[0])
  const d = parseAddr(dest)
  for (const a of rangeCells(src)) {
    const p = parseAddr(a)
    const r = d.r + p.r - s.r
    const c = d.c + p.c - s.c
    n[r][c] = { ...g[p.r][p.c], raw: shiftFormula(g[p.r][p.c].raw, r - p.r, c - p.c) }
  }
  return n
}

export function boldRange(g: Grid, range: string): Grid {
  const n = cloneGrid(g)
  for (const a of rangeCells(range)) {
    const { r, c } = parseAddr(a)
    n[r][c] = { ...n[r][c], bold: true }
  }
  return n
}

/** オートフィル：src の 範囲を to の 範囲まで 下（または 右）へ 広げる */
export function autofill(g: Grid, src: string, to: string): Grid {
  const n = cloneGrid(g)
  const [s1, s2 = s1] = src.split(':').map(parseAddr)
  const t2 = parseAddr(to.split(':').pop()!)
  if (t2.r > s2.r) {
    for (let c = s1.c; c <= s2.c; c++) {
      const line = g.slice(s1.r, s2.r + 1).map((row) => row[c])
      fillLine(line, t2.r - s2.r, (raw, k) => shiftFormula(raw, k, 0)).forEach((cell, k) => (n[s2.r + 1 + k][c] = cell))
    }
  } else if (t2.c > s2.c) {
    for (let r = s1.r; r <= s2.r; r++) {
      const line = g[r].slice(s1.c, s2.c + 1)
      fillLine(line, t2.c - s2.c, (raw, k) => shiftFormula(raw, 0, k)).forEach((cell, k) => (n[r][s2.c + 1 + k] = cell))
    }
  }
  return n
}

/** 数式を target に 入れ、fill の 範囲へ オートフィルした 表 */
export function placeFormula(g: Grid, step: FormulaStep, raw: string): Grid {
  const n = cloneGrid(g)
  const t = parseAddr(step.target)
  for (const a of stepCells(step)) {
    const { r, c } = parseAddr(a)
    n[r][c] = { ...n[r][c], raw: shiftFormula(raw, r - t.r, c - t.c) }
  }
  return n
}

export const stepCells = (step: FormulaStep) => (step.fill ? rangeCells(step.fill) : [step.target])

// ---------------------------------------------------------------- 数式の 判定
const same = (a: Value, b: Value) =>
  typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) < 1e-9 : formatValue(a) === formatValue(b) && typeof a === typeof b

const ERROR_TIPS: Record<string, string> = {
  '#NAME?': '関数の 名前か、文字を 囲む " を 確かめよう。',
  '#DIV/0!': '0（空っぽの セル）で 割っている。',
  '#CYCLE!': '答えを 出す セル 自身を 参照している（循環参照）。',
  '#REF!': '参照が 表の 外に はみ出している。',
  '#VALUE!': '文字と 数を 計算していないか 確かめよう。',
  '#ERROR!': 'カッコや 記号の 並びを 確かめよう。',
}

export interface TryResult {
  /** 数式を 入れて（コピーして）みた 表 */
  grid: Grid
  values: Value[][]
  /** 答えが 合わなかった セル */
  wrong: string[]
  /** まちがいの 理由（正解なら null） */
  msg: string | null
}

export function tryFormula(g: Grid, step: FormulaStep, input: string, puzzle = false): TryResult {
  const raw = normalizeInput(input)
  const fail = (msg: string): TryResult => ({ grid: g, values: evaluate(g), wrong: [], msg })
  if (!raw.startsWith('=')) return fail('数式は「=」から 始めよう。= が ないと、ただの 文字として 入力されて しまう。')
  if (/[×÷]/.test(raw)) return fail('掛け算は *、割り算は / を 使おう。× や ÷ は Excel では 使えない。')
  if (/[≧≦≠]/.test(raw)) return fail('「≧ ≦ ≠」は 使えない。以上は >=、以下は <=、等しくないは <> と 書こう。')

  const grid = placeFormula(g, step, raw)
  const values = evaluate(grid)
  const model = evaluate(placeFormula(g, step, step.answer))
  const t = parseAddr(step.target)
  const wrong = stepCells(step).filter((a) => {
    const { r, c } = parseAddr(a)
    return !same(values[r][c], model[r][c])
  })
  if (wrong.length) {
    const a = wrong[0]
    const { r, c } = parseAddr(a)
    const v = values[r][c]
    const shown = shiftFormula(raw, r - t.r, c - t.c)
    let msg: string
    if (typeof v === 'object' && v !== null) msg = `${a} が エラー（${v.error}）に なった。${ERROR_TIPS[v.error] ?? ''}`
    else if (puzzle) msg = `${a} の 答え（${formatValue(v) || '空'}）が 正しくないようだ……。`
    else if (a !== step.target)
      msg = `${a} に コピーされた 数式 ${shown} の 答えが ${formatValue(v) || '空'} に なった（本当は ${formatValue(model[r][c])}）。コピーで 参照が ずれて いないか 確かめよう。`
    else msg = `${a} の 答えが ${formatValue(v) || '空'} に なった。本当は ${formatValue(model[r][c])} に なるはず。`
    return { grid, values, wrong, msg }
  }
  for (const fn of new Set([...step.answer.matchAll(/([A-Z]+)\(/g)].map((m) => m[1])))
    if (!usesFn(raw, fn))
      return {
        grid,
        values,
        wrong: [],
        msg: puzzle ? '答えは 合っているが……扉は 反応しない。求め方に 決まりが あるようだ。' : `答えは 合っている！ でも ${fn} 関数を 使って 求めてみよう。`,
      }
  return { grid, values, wrong: [], msg: null }
}

// ---------------------------------------------------------------- 数式ボタン
const isRef = (t: string) => /^\$?[A-Z]{1,3}\$?\d+$/.test(t)
const COMPARE = ['>=', '<=', '>', '<', '<>']
const pickN = <T,>(a: T[], n: number) => [...a].sort(() => Math.random() - 0.5).slice(0, n)
const byAddr = (a: string, b: string) => {
  const p = parseAddr(a)
  const q = parseAddr(b)
  return p.c - q.c || p.r - q.r
}

/** 模範の 数式に 使う 部品（$ は はずす。F4 で 付ける） */
export const answerChips = (answer: string) => tokenize(answer.replace(/\$/g, ''))

/**
 * 数式ステップの ボタン。模範の 数式の 部品に、まぎらわしい 部品を まぜる。
 * = も ボタンに する（数式は = から 始める、を 身につけるため）。
 */
export function guideChips(step: FormulaStep, rows: number, cols: number, town: string): ChipGroup[] {
  const toks = answerChips(step.answer)
  const isBool = (t: string) => t === 'TRUE' || t === 'FALSE'
  const funcs = new Set(toks.filter((t) => /^[A-Z]{2,}$/.test(t) && !isRef(t) && !isBool(t)))
  const known = funcsFor(town).filter((f) => !funcs.has(f))
  for (const f of pickN(known, Math.max(1, 4 - funcs.size))) funcs.add(f)

  // セル：答えに 使うもの ＋ そのとなり（ずれた 参照の ひっかけ）
  const cells = new Set(toks.filter(isRef))
  const near: string[] = []
  for (const a of cells) {
    const { r, c } = parseAddr(a)
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]])
      if (r + dr >= 0 && r + dr < rows && c + dc >= 0 && c + dc < cols) near.push(addr(r + dr, c + dc))
  }
  for (const a of pickN([...new Set(near)].filter((a) => !cells.has(a) && a !== step.target), 3)) cells.add(a)

  // 値は 答えの 順番が わからないよう 並べかえる（数は 小さい順、文字は " の あるなしを 並べて）
  const bare = (t: string) => t.replace(/"/g, '')
  const values = [...new Set([...toks.filter((t) => /^\d/.test(t) || t.startsWith('"') || isBool(t)), ...(step.extra ?? []).filter((t) => t !== '×' && t !== '÷')])].sort(
    (a, b) => {
      const na = /^\d/.test(a)
      const nb = /^\d/.test(b)
      if (na && nb) return Number(a) - Number(b)
      if (na !== nb) return na ? -1 : 1
      return bare(a).localeCompare(bare(b), 'ja') || (a.startsWith('"') ? -1 : 1)
    },
  )
  const cmp = toks.some((t) => COMPARE.includes(t)) || toks.join('').includes('>') || town === 'ifport' || town === 'ship'
  const symbols = ['=', '(', ')', ':', ',', '+', '-', '*', '/', ...(step.extra ?? []).filter((t) => t === '×' || t === '÷'), ...(cmp ? COMPARE : [])]
  return [
    ...(funcs.size ? [{ label: '関数', chips: [...funcs].sort() }] : []),
    { label: 'セル', chips: [...cells].sort(byAddr) },
    { label: '記号', chips: symbols },
    ...(values.length ? [{ label: '値', chips: values }] : []),
  ]
}

/** F4：いちばん 最後の セル参照の $ を 切り替える（A1 → $A$1 → A$1 → $A1 → A1） */
export function toggleLastRef(chips: string[]): string[] {
  for (let i = chips.length - 1; i >= 0; i--) {
    if (!isRef(chips[i])) continue
    const t = toggleAbsAt('=' + chips[i], chips[i].length + 1)
    if (!t) return chips
    const next = [...chips]
    next[i] = t.text.slice(1)
    return next
  }
  return chips
}
